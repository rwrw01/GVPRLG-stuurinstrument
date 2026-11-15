# Verslag: fase B mailroute en realm `gvprlg` op VPS-001 (testroute)

**Datum:** 2026-11-14
**Uitgevoerd door:** Claude Code (sessie), per stap na expliciet akkoord van de beheerder
**Scope:** plan `docs/superpowers/plans/2026-11-13-gvprlg-fase-b-authenticatie.md`, Task 12
**Spec:** `docs/superpowers/specs/2026-11-13-fase-b-authenticatie-design.md`

Infrastructuurdetails van de productieomgeving (adressen, hostnamen, paden, accountnamen) zijn
in deze openbare versie vervangen door generieke omschrijvingen.

Niet gewijzigd: de bestaande realms, de reverse proxy, de firewall, Docker-netwerken.

## Stap 1 — vaststelling (alleen-lezen)

| Vraag | Bevinding |
|---|---|
| SMTPS-host van mox | `<mailserver-host>:465`, geldig Let's Encrypt-certificaat (geldig tot 2027-01-31) |
| Keycloak → `<mailserver-host>:465` | bereikbaar vanuit de Keycloak-container |
| Realm `gvprlg` | bestond niet (alleen de bestaande beheer-realm en `master`) |
| DNS van het testmaildomein | SPF, DKIM en DMARC (`p=reject`) ingericht; DKIM ondertekent |
| mox-accounts vooraf | een handvol accounts van andere toepassingen |
| Keycloak | 26.x, `kcadm.sh` in container, admin-secrets via `/run/secrets/` |

## Stap 2 — mox-account

- Nieuw account `gvprlg-noreply` met een noreply-adres op het testmaildomein
  (`mox config account add`, wachtwoord via `mox setaccountpassword` op stdin).
- Wachtwoord: als secret-bestand in `<compose-map>/secrets/` (root:root, 0600, 48 tekens).
- Bewijs: `AUTH PLAIN` vanaf de host op `<mailserver-host>:465` → `235 2.7.0 nice`.
- Rollback: `mox config account rm gvprlg-noreply` in de mox-container.

## Stap 3 — realm `gvprlg`

- Geïmporteerd uit `deploy/keycloak/realm-gvprlg.json` via `kcadm.sh create realms -f -` in de
  Keycloak-container; het ingevulde JSON ging via stdin, geen bestand met secrets op schijf.
- Ingevuld t.o.v. het repo-bestand: `smtpServer.host=<mailserver-host>`, `user`/`from` = het
  noreply-adres, `password` = mox-wachtwoord, client-secret `gvprlg-app`.
- Secrets: `<compose-map>/secrets/keycloak_client_secret` en `nextauth_secret` (1001:1001, 0600).
- Geverifieerd (Admin API + tabellen `realm_smtp_config`, `client`, `client_attributes`):
  browserflow `gvprlg-browser-otp` (Username Form → OTP Form, REQUIRED), TOTP SHA1/6/30 s,
  locale `nl`, brute-force-bescherming aan, registratie en wachtwoordreset uit, client
  confidential met PKCE S256, redirect `https://spinnenweb.gvprlg.nl/api/auth/callback/keycloak`,
  post-logout `https://spinnenweb.gvprlg.nl/`. Client-secret in DB is gelijk aan het bestand.
- Rollback: `kcadm.sh delete realms/gvprlg` en de twee secretbestanden verwijderen.

### Incident en rotatie (stap 3b)

Bij de verificatie faalde een `sed`-redactie, waardoor het eerste client-secret in de uitvoer
van de sessie (transcript) terechtkwam. Het secret was nog door geen enkele toepassing gebruikt.
Het is direct geroteerd: nieuw secret naar bestand en via `kcadm.sh update clients/<id>` naar
Keycloak; gecontroleerd dat DB en bestand gelijk zijn en van het oude verschillen. Het oude
secret is ongeldig. Mox-wachtwoord en `nextauth_secret` zijn niet gelekt.

## Stap 4 — testuitnodiging

### 4a Gmail

- Testgebruiker met een eigen Gmail-adres van de beheerder, enabled, e-mail geverifieerd,
  required action `CONFIGURE_TOTP`; actiemail verstuurd met `execute-actions-email`
  (lifespan 259200 s, zonder `redirect_uri`: de app-URL is geen geregistreerde redirect en de
  app draait nog niet).
- mox-log: submission-login van het noreply-account `result=ok` (TLS 1.3),
  `messages queued for delivery` (4044 bytes), `delivered from queue` naar de Gmail-MX bij
  poging 1; wachtrij leeg.
- Gmail plaatste de eerste mail in **Spam** (eerste bericht van een nieuwe afzender).
- **Defect gevonden:** de actielink begon met `http://<keycloak-host>:8080/…` en het token had
  issuer `http://<keycloak-host>:8080/realms/gvprlg`. Oorzaak: `KC_HOSTNAME` stond zonder
  schema/poort, waardoor Keycloak schema en poort van het verzoek overneemt; `kcadm` sprak
  Keycloak rechtstreeks aan op `http://localhost:8080`. Hetzelfde zou gebeuren bij verzenden
  vanuit de Admin Console op de beheerpoort (link alleen via het beheer-VPN bereikbaar).
- **Fix (stap 4c):** realm-attribuut `frontendUrl=https://<keycloak-host>`, alleen op realm
  `gvprlg`, zonder herstart. Daarna issuer via `localhost:8080` én via de reverse proxy
  `https://<keycloak-host>/realms/gvprlg`; issuer van de andere realms ongewijzigd.
  Rollback: attribuut leegmaken. Let op: `kcadm get realms/gvprlg --fields attributes` toont dit
  attribuut niet; controle via tabel `realm_attribute`.
- **Herverzending (stap 4d):** `delivered from queue` naar de Gmail-MX bij poging 1. De eerste
  link is ongeldig geworden.
- Headers in Gmail (`Authentication-Results`): TBD — door beheerder te bevestigen.
- QR-koppeling in de Keycloak-accountflow: **geslaagd** (beheerder bevestigd, 2026-11-14) via
  de link uit de herverzonden mail.

### 4b Microsoft 365

TBD — nog geen adres opgegeven.

## Open punten

0. Afgehandeld: `deploy/keycloak/realm-gvprlg.json` bevat nu `attributes.frontendUrl`, met
   een test in `deploy/keycloak/realm.test.ts` en een controle-stap in de README-runbook.
1. Gmail zette de eerste mail in Spam. Verwacht hetzelfde bij echte ontvangers zolang de
   afzender op het testmaildomein staat; reden temeer voor stap 2 van de mailroute.
2. Stap 2 van de mailroute (`noreply@spinnenweb.gvprlg.nl`): pas na DNS-records uit spec §9
   (SPF, DKIM-sleutel uit mox, DMARC); daarna SMTP-gebruiker/-wachtwoord/from omzetten in de
   realm. Tot die tijd geen echte voorzitters uitnodigen vanaf het testmaildomein.
3. Login-domein: realm draait onder het domein van de bestaande Keycloak (spec §13, bewust open).
4. Deploy van de app zelf (fase C) is geen onderdeel van deze taak; `<compose-map>/secrets/`
   bevat al de drie benodigde secrets.
5. Terzijde uit de mox-log: geautomatiseerde wachtwoordpogingen op submission met geraden
   gebruikersnamen vanaf twee externe IP's, alle `badcreds`. Correctie: mox heeft hier geen
   rate limiting en de detectielaag van de proxy leest de mox-log niet; zie "Hardening"
   hieronder.

## Vervolg — eerste deploy van de app (2026-11-14, middag)

Per stap akkoord van de beheerder. Bewijs: uitvoer van `scripts/deploy.sh` en losse controles.

| Stap | Resultaat |
|---|---|
| `<compose-map>` | map 0755; `docker-compose.yml`, entrypoint-scripts (root 0644), `.env` (0600, `BOOTSTRAP_BEHEERDER_EMAIL`), `secrets/db_password` (0444) |
| Netwerken | Docker-standaardpools uitgeput; proxy-netwerk en `gvprlg-internal` elk met een expliciet klein subnet |
| Reverse proxy | `docker network connect` zonder herstart; compose van de proxy +2 regels, met backup |
| Login-thema | in de themamap van Keycloak; Keycloak-herstart nodig (publiek weer bereikbaar na 19 s); `loginTheme=gvprlg` alleen op realm `gvprlg` |
| Deploy | images `gvprlg-app:2b8c175` en `gvprlg-migrate:2b8c175` (arm64) lokaal gebouwd en via SSH geladen; migraties toegepast (exit 0); app healthy op beide netwerken, uid `gvprlg`, read-only rootfs |
| Controle | Let's Encrypt-certificaat `CN=spinnenweb.gvprlg.nl` (tot 2027-02-12); `/api/healthz` en `/api/readyz` 200; `/` → `/inloggen`; login → `https://<keycloak-host>/realms/gvprlg/...` met thema-CSS |

Bijvangst: de app-log toonde een afgewezen verzoek met een ongeldige `Next-Action`-header,
het patroon van scanners op de recente Next.js-RCE-advisories; de gepatchte versie weigerde het.

## Hardening (2026-11-14, middag)

Per maatregel akkoord van de beheerder.

**Mox-submission niet meer publiek (B).** Mox-log vóór de wijziging: 1148 mislukte logins in
24 uur vanaf 767 IP's (max. 7 per IP), 8585 in 7 dagen, alle op submission; geen enkele
geslaagde login van buiten Docker. De gebruikte gebruikersnamen waren geraden varianten van de
naam van de beheerder (geen daarvan bestaat in mox). De detectielaag leest de mox-log niet en
er draait geen aparte log-ban-tool. Maatregel in het egress-filterscript op de host (met
backup): inkomend verkeer van internet naar de submission- en IMAPS-poorten van mox wordt
gedropt. Poort 25 blijft open. Bewijs: vanaf internet 465/993 timeout; vanuit de
Keycloak-container 465 open; DROP-teller loopt op; 0 mislukte logins na de wijziging.

**Egress-filter voor het proxy-netwerk van de app (B2).** Alleen DNS en 443. Bewijs: app →
Keycloak-discovery 200; app → `1.1.1.1:80` timeout. Bijeffect: het opnieuw draaien van het
script activeerde ook al in het script staande egress-regels van een andere toepassing, die
niet in de live keten stonden; die toepassing bleef healthy.

**Script-eigendom (B3).** Het egress-filterscript was eigendom van een gewone gebruiker met
schrijfrecht voor de groep en draait bij boot als root; nu `root:root 0755`. Terzijde: de
persistentieservice van de firewallregels stond op failed; de regels komen uitsluitend uit de
eigen egress-filter-service.

**Lockout in realm `gvprlg` (A).** Was: 30 foute codes per ronde, oplopend tot 15 min, nooit
permanent; met 3 geldige codes per moment (look-ahead 1) circa 0,9% kans per dag voor een
aanvaller die een e-mailadres kent. Nu: `failureFactor=10`, `permanentLockout=true`,
`maxTemporaryLockouts=2`: na 30 foute codes is het account uitgeschakeld (kans ≤ 0,009%).
Dev-test: na 10 foute codes `numTemporaryLockouts=1`, `disabled=true` (tijdelijk). De
permanente stap is niet doorlopen. Prijs: wie een e-mailadres kent, kan een account laten
blokkeren; runbook "Account geblokkeerd" in de README.

**Open.** De gebruikersnaamstap verraadt of een e-mailadres een account heeft
("Gebruikersnaam of e-mailadres ongeldig" tegenover het codeveld). Een detectiecollectie voor
Keycloak bestaat, nog niet gelezen of geïnstalleerd (vereist login-events in Keycloak).
