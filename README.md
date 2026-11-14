# GVPRLG — Volwassenheidsmeting

Meetinstrument voor de Gebruikersvereniging PinkRoccade Local Government (GVPRLG) om de
volwassenheid van PinkRoccade-platformen te beoordelen op de assen Techniek, Mens en Proces.

Twee onderdelen leven naast elkaar in deze repository tijdens de migratie:

- **Statische site** (`index.html`, `demo.html`, `js/`, `css/`) — de oorspronkelijke,
  client-side versie met data in `localStorage`. Blijft actief op GitHub Pages tot fase D
  (zie `docs/superpowers/specs/2026-10-09-backend-migratie-vps001-design.md`).
- **Backend (fase A)** — Next.js/TypeScript/Prisma-app onder `app/` en `src/`, met een lokale
  Postgres voor development. Zie `docs/superpowers/plans/2026-10-09-gvprlg-backend-fase-a.md`
  voor de implementatiedetails.
- **Authenticatie (fase B)** — inloggen via Keycloak (realm `gvprlg`, e-mail + TOTP, geen
  wachtwoord), rollen en platformtoegang in de app-database, beheer onder `/beheer`. Zie
  `docs/superpowers/specs/2026-11-13-fase-b-authenticatie-design.md`.

## Ontwikkelen (backend)

```bash
npm install
cp .env.example .env
cp .env.test.example .env.test

# Lokale secrets (genegeerd door git en docker). De client-secret moet gelijk zijn aan die in
# deploy/keycloak/realm-gvprlg.dev.json.
mkdir -p secrets-dev
printf 'dev-gvprlg-app-secret' > secrets-dev/keycloak_client_secret
openssl rand -hex 32 > secrets-dev/nextauth_secret

docker compose -f docker-compose.dev.yml up -d
npx prisma migrate deploy
npm run dev
```

De dev-stack (`docker-compose.dev.yml`) start:

| Dienst | Adres | Opmerking |
|---|---|---|
| Postgres | `localhost:5433` | gebruiker/wachtwoord `gvprlg`/`devpassword`; testdatabase `gvprlg_test` |
| Keycloak 26.6.4 | <http://localhost:8081> | admin-console: `admin` / `devadmin`; realm `gvprlg` uit `deploy/keycloak/realm-gvprlg.dev.json` |
| Mailpit | <http://localhost:8025> | vangt alle mail van de dev-Keycloak (SMTP op 1025) |

Testgebruikers in de dev-realm (inloggen met e-mail + TOTP-code, geen wachtwoord):

- `beheerder@test.local` — beheerder (via `BOOTSTRAP_BEHEERDER_EMAIL` in `.env`)
- `invuller@test.local` — invuller
- `lezer@test.local` — lezer (ziet alles, kan niets opslaan; de app-gebruiker maakt de E2E-setup aan)
- `invuller2@test.local` — moet bij de eerste login nog een authenticator koppelen

De TOTP-seed van `beheerder@test.local`, `invuller@test.local` en `lezer@test.local` is `JBSWY3DPEHPK3PXP`
(SHA1, 6 cijfers, 30 s). Voeg hem toe in een authenticator-app of bereken de code met
`otpauth` (zoals de E2E-tests doen). Alleen voor lokaal gebruik — deze seed is publiek.

**Windows met Docker in WSL:** gebruik `127.0.0.1` in plaats van `localhost` in
`DATABASE_URL` (in `.env` en `.env.test`), anders komt de verbinding met Postgres niet tot
stand.

Na het wijzigen van `deploy/keycloak/realm-gvprlg.dev.json`:
`docker compose -f docker-compose.dev.yml up -d --force-recreate keycloak` (de import slaat
een bestaande realm over).

De migraties maken de meetjaren 2026, 2027 en 2028 automatisch aan. Voorbeeldwaardes voor
2026 (lokaal testen en demo's, nooit op productiedata) schrijf je rechtstreeks in de
dev-database (de app hoeft niet te draaien):

```bash
npm run seed:voorbeeld
# = npx tsx --env-file=.env scripts/seed-voorbeeldwaardes-2026.ts
```

Het script weigert te draaien met `NODE_ENV=production`, schrijft als
`seed-voorbeelddata` en slaat platformen over die al `definitief` zijn (die meldt het).
Opnieuw draaien is veilig.

`npm run test:unit` draait tegen de database in `.env.test` (een apart `_test`-gesufixte
database op dezelfde lokale Postgres) — nooit tegen de interactieve dev-database in `.env`.

## Deployment (VPS-001, handmatig — bewust geen CI/CD)

Zie `docs/superpowers/specs/2026-10-09-backend-migratie-vps001-design.md` §7 voor de
motivatie.

### Eerste keer (koude deploy)

De VPS krijgt nooit broncode en bouwt nooit zelf: images worden lokaal voor `linux/arm64`
gebouwd en via SSH doorgezet (`scripts/deploy.sh`). In `/opt/gvprlg` staat alleen
operationele configuratie: `docker-compose.yml`, de twee entrypoint-scripts, `.env` en
`secrets/`. Eenmalig, met `sudo` op VPS-001:

```bash
# 1. Map (0755) en operationele bestanden (root, 0644) uit de repo plaatsen
#    docker-compose.yml, app-entrypoint.sh, migrate-entrypoint.sh  (LF-regeleinden)

# 2. .env (root, 0600) met het adres van de eerste beheerder
printf 'BOOTSTRAP_BEHEERDER_EMAIL=<adres>
' > /opt/gvprlg/.env

# 3. Database-secret VÓÓR de eerste start (anders maakt Docker er een map van)
openssl rand -hex 32 | tr -d '
' > /opt/gvprlg/secrets/db_password
chmod 0444 /opt/gvprlg/secrets/db_password

# 4. Spoke-netwerk met expliciet subnet (de standaard-adrespools van Docker zijn op;
#    gvprlg-internal krijgt 172.30.15.0/28 via de compose)
docker network create --driver bridge --subnet 172.30.14.0/28 net-fe-gvprlg

# 5. Traefik koppelen zonder herstart, en blijvend in /opt/traefik/docker-compose.yml
#    (service-netwerk + top-level `external: true`, eerst een .bak maken)
docker network connect net-fe-gvprlg traefik

# 6. Keycloak-realm, app-secrets en login-thema: zie "Eerste installatie authenticatie"
```

Daarna vanaf de ontwikkellaptop (Git Bash, Docker Engine in WSL met `qemu-user-static`):

```bash
bash scripts/deploy.sh
```

### Eerste installatie authenticatie (Keycloak, eenmalig)

Keycloak draait in de sovereign-stack op `https://auth.athide.nl`. De app bereikt Keycloak
uitsluitend via die publieke URL — er komt géén extra Docker-netwerk, `extra_hosts` of link
naar Keycloak of mox bij; de `app`-service houdt precies `gvprlg-internal` en `net-fe-gvprlg`.

1. **Realm importeren** uit `deploy/keycloak/realm-gvprlg.json` (configuratie zonder secrets).
   Eén van beide:
   - Admin Console (via VPN): realm-selector → *Create realm* → bestand uploaden; of bij een
     bestaande lege realm `gvprlg`: *Realm settings* → *Action* (rechtsboven) →
     *Partial import*.
   - CLI in de Keycloak-container: `kc.sh import --file <pad>/realm-gvprlg.json` (bij gestopte
     Keycloak, met dezelfde database-instellingen als de draaiende server).

   Het bestand zet het realm-attribuut `frontendUrl` op `https://auth.athide.nl`. Laat dat
   staan: zonder dat attribuut neemt Keycloak schema en poort over van het verzoek, en
   uitnodigingsmails die vanuit de Admin Console op `:444` of via `kcadm` op
   `http://localhost:8080` worden verstuurd, krijgen dan onbruikbare links. Controleer na de
   import dat `https://auth.athide.nl/realms/gvprlg/.well-known/openid-configuration` als
   `issuer` precies `https://auth.athide.nl/realms/gvprlg` geeft.

   Het realm-bestand zet ook `loginTheme=gvprlg`. Kopieer vóór de import
   `deploy/keycloak/themes/gvprlg` naar `/opt/keycloak/themes/gvprlg` (root, mappen 0755,
   bestanden 0644). Keycloak ziet een nieuwe themamap pas na een herstart
   (`sudo docker compose restart keycloak` in `/opt/keycloak`, circa 20 s onderbreking voor
   alle realms). Controleer met `kcadm.sh get serverinfo` (volledige uitvoer; `--fields themes`
   geeft een lege lijst).
2. **SMTP instellen** in realm `gvprlg` → *Realm settings* → *Email*: host (mox, poort 465,
   SSL aan), gebruikersnaam, wachtwoord en from-adres volgens stap 1 van de mailroute
   (zie "Mail" hieronder). *Test connection* gebruiken.
3. **Client-secret genereren:** *Clients* → `gvprlg-app` → *Credentials* → *Regenerate*. Kopieer
   de waarde en zet hem in het secret-bestand zonder hem in de shell-history te zetten:

   ```bash
   cd /opt/gvprlg
   sudo sh -c 'umask 077; cat > secrets/keycloak_client_secret'   # plakken, Enter, Ctrl-D
   ```
4. **NextAuth-secret** aanmaken:

   ```bash
   sudo sh -c 'umask 077; openssl rand -hex 32 > secrets/nextauth_secret'
   ```
5. **Rechten.** De map blijft root-only; de twee app-secrets zijn alleen leesbaar voor de
   app-containergebruiker (uid 1001). `db_password` houdt `0444` (zie hierboven: ook Postgres
   en de migrate-container lezen het).

   ```bash
   sudo chmod 700 secrets
   sudo chown 1001:1001 secrets/keycloak_client_secret secrets/nextauth_secret
   sudo chmod 600 secrets/keycloak_client_secret secrets/nextauth_secret
   ```

   Docker Compose mount `file:`-secrets (zonder Swarm) als bind-mount met de rechten van het
   bestand op de host; een `0600`-bestand van root zou de app (uid 1001) niet kunnen lezen en
   de app weigert dan te starten.
6. **Eerste beheerder** in een niet-gecommit `.env` naast `docker-compose.yml` (Compose leest
   dit bestand voor variabele-substitutie; zonder deze waarde weigert `docker compose` te
   starten):

   ```bash
   echo 'BOOTSTRAP_BEHEERDER_EMAIL=<e-mailadres van de eerste beheerder>' | sudo tee .env
   sudo chmod 600 .env
   ```

   Maak voor dit adres daarna een Keycloak-gebruiker aan volgens het runbook "Nieuwe
   voorzitter" (stappen 1–2). Zolang er geen actieve beheerder is, maakt de app bij de eerste
   login met dit adres de beheerder aan.

De overige app-configuratie (`KEYCLOAK_ISSUER=https://auth.athide.nl/realms/gvprlg`,
`KEYCLOAK_CLIENT_ID=gvprlg-app`, `NEXTAUTH_URL=https://spinnenweb.gvprlg.nl` en de
`*_FILE`-paden onder `/run/secrets/`) staat vast in `docker-compose.yml`. Ontbreekt een
secret-bestand, is het leeg of niet leesbaar voor uid 1001, dan stopt de container direct bij
het starten (`app-entrypoint.sh`, met een `FATAL`-melding in `docker compose logs app`).

Let op bij het wachtwoord: gebruik `openssl rand -hex 32` (alleen `[A-Za-z0-9]`), niet
`-base64` — base64 kan `/` en `+` bevatten, en die breken de `DATABASE_URL` die de
entrypoint-scripts samenstellen (zie `app-entrypoint.sh`/`migrate-entrypoint.sh`, die dit nu
ook expliciet afwijzen met een duidelijke foutmelding in plaats van stil te falen).

### Volgende keren (update)

Commit en push naar `main`, dan vanaf de ontwikkellaptop:

```bash
bash scripts/deploy.sh
```

Het script stopt bij niet-gecommitte wijzigingen, een niet-gepushte commit of rode
typecheck/unittests; het bouwt beide images voor `linux/arm64`, laadt ze op VPS-001, start ze
met `docker compose up -d --no-build`, controleert `/api/healthz` over geldige TLS en de
login-doorverwijzing naar realm `gvprlg`, en rolt terug bij een mislukte controle.

Secrets staan in `/opt/gvprlg/secrets/` (map chmod 700, root-only; `db_password` chmod 0444,
`keycloak_client_secret` en `nextauth_secret` eigendom van uid 1001 met chmod 600) — nooit in
`docker-compose.yml` of een gecommit bestand.

## Mail (uitnodigingen vanuit Keycloak)

Keycloak verstuurt de uitnodigings- en herstelmails via mox. Dit gebeurt in twee stappen; het
omzetten is alleen configuratie in realm `gvprlg` (SMTP-account en from-adres), geen code.

**Stap 1 — testroute.** Afzender `gvprlg-noreply@publicvibes.nl` op het bestaande mox-domein
`publicvibes.nl` (SPF/DKIM al ingericht). Hiermee test je de uitnodigingsflow op de
productie-Keycloak met eigen testmailboxen. **In deze stap worden geen echte voorzitters
uitgenodigd** — een afzender op `publicvibes.nl` oogt voor gemeenten als phishing.

**Stap 2 — definitieve route** `noreply@spinnenweb.gvprlg.nl`, zodra de DNS-records er zijn:

1. In mox: domein `spinnenweb.gvprlg.nl` toevoegen, account `noreply` aanmaken, DKIM-sleutel
   laten genereren. Het wachtwoord als secret-bestand volgens het bestaande patroon.
2. DNS (handmatig, bij de registrar van `gvprlg.nl`):

   ```text
   spinnenweb.gvprlg.nl                       TXT "v=spf1 ip4:89.167.107.143 -all"
   <selector>._domainkey.spinnenweb.gvprlg.nl TXT "<door mox gegenereerd>"
   _dmarc.spinnenweb.gvprlg.nl                TXT "v=DMARC1; p=quarantine; rua=mailto:<TBD>"
   ```

   Het DMARC-rapportadres is nog TBD (open punt). Het SPF-record van `gvprlg.nl` zelf wordt
   niet aangeraakt.
3. In Keycloak, realm `gvprlg` → *Realm settings* → *Email*: SMTP-gebruiker, wachtwoord en
   from-adres omzetten naar `noreply@spinnenweb.gvprlg.nl`.

**Verificatie (na beide stappen):** stuur een testmail (*Realm settings* → *Email* → *Test
connection*, of een uitnodiging aan een testgebruiker) naar een Microsoft-365-mailbox én een
Gmail-adres en controleer in de headers: `spf=pass`, `dkim=pass` en `dmarc=pass`.

## Runbooks (beheer)

Rollen en platformtoegang staan in de app (`/beheer`); Keycloak levert alleen de identiteit
(e-mail + TOTP). Keycloak-console: `https://auth.athide.nl/admin/` (via VPN), realm `gvprlg`.

### Nieuwe voorzitter

1. Keycloak-console → realm `gvprlg` → *Users* → *Add user*: e-mail, voor- en achternaam,
   **Email verified: aan**, *Required user actions*: **Configure OTP**. *Create*.
2. Bij die gebruiker: *Credentials* (of *Actions*) → **Send email** (execute actions) met
   actie *Configure OTP* en lifespan **72 uur**. De voorzitter koppelt via de link een
   authenticator-app.
3. In de app: `/beheer` → **Voorzitter toevoegen** met hetzelfde e-mailadres en de
   platform(en). Bij de eerste login koppelt de app het Keycloak-account op e-mailadres.

### Authenticator kwijt

1. Keycloak-console → *Users* → gebruiker → *Credentials*: de **OTP-credential verwijderen**.
2. *Details* → *Required user actions*: **Configure OTP** zetten → *Save*.
3. **Send email** (execute actions, *Configure OTP*, lifespan 72 uur). In de app hoeft niets.

### Account geblokkeerd (te veel foute codes)

Realm `gvprlg` blokkeert een account na 10 foute codes 60 s, na de volgende 10 langer
(oplopend, maximaal 15 min). Na de derde reeks van 10 (2 tijdelijke blokkades voorbij) wordt het
account **permanent** uitgeschakeld. De gebruiker ziet alleen "Ongeldige authenticatiecode".

1. Eerst vaststellen wat er gebeurde: Keycloak-console → *Users* → gebruiker → bovenaan staat
   "temporarily locked" of het account staat op *Disabled*. Vraag de gebruiker of hij zelf
   codes fout typte (klok van de telefoon) of dat het niet van hem kwam.
2. Kwam het niet van de gebruiker: behandel het als aanval op dat account. Laat de
   authenticator opnieuw koppelen (runbook hierboven) voordat je het account vrijgeeft.
3. Vrijgeven: *Details* → **Enabled** aan → *Save* (bij een tijdelijke blokkade: wachten of
   *Unlock user*). De teller staat daarna weer op nul.

### Toegang intrekken

1. In de app: `/beheer` → gebruiker → **Toegang intrekken** (de volgende request wordt
   geweigerd).
2. Keycloak-console → *Users* → gebruiker → **Enabled: uit** (kan niet meer inloggen).

### Keycloak-account opnieuw aangemaakt

Is het Keycloak-account verwijderd en opnieuw aangemaakt, dan heeft het een nieuw intern id en
weigert de app het. In de app: `/beheer` → gebruiker → **Keycloak-account ontkoppelen**. Bij de
volgende login koppelt de app het nieuwe account opnieuw op e-mailadres.

## Dependencies en licenties

| Package | Versie | Licentie |
|---|---|---|
| next | 16.4.6 | MIT |
| next-auth | 4.24.15 | ISC |
| react | 19.0.0 | MIT |
| react-dom | 19.0.0 | MIT |
| zod | 4.6.7 | MIT |
| @prisma/client | 7.10.1 | Apache-2.0 |
| @prisma/adapter-pg | 7.10.1 | Apache-2.0 |
| xlsx | 0.18.5 | Apache-2.0 |
| dotenv | 17.4.2 | BSD-2-Clause |
| prisma (CLI) | 7.10.1 | Apache-2.0 |
| typescript | 7.0.2 | Apache-2.0 |
| vitest | 5.0.3 | MIT |
| @playwright/test | 1.58.2 | Apache-2.0 |
| serve | 14.2.8 | MIT |
| otpauth (dev, E2E) | 9.6.0 | MIT |
| tsx (dev, seed-script) | 4.23.15 | MIT |
| Keycloak (container; dev en productie) | 26.6.4 | Apache-2.0 |
| Mailpit (dev-container) | v1.33.1 | MIT |
| @types/node | 24.0.0 | MIT |
| @types/react | 19.0.0 | MIT |
| @types/react-dom | 19.0.0 | MIT |

## Licentie

EUPL-1.2 — zie [LICENSE](LICENSE).
