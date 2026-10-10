# Design: GVPRLG-stuurinstrument — backend, rollen en deployment op VPS-001

**Datum:** 2026-10-09
**Status:** ter review
**Vervangt niet, maar bouwt voort op:** `docs/superpowers/specs/2026-03-20-volwassenheidsmeting-design.md` (het meetinstrument zelf — assen, vragen, schaal)

## 1. Doel en aanleiding

Het GVPRLG-stuurinstrument draait vandaag volledig client-side: statische HTML/JS, data in
`localStorage` van de browser, geen authenticatie, delen tussen platformvoorzitters gaat via
handmatige JSON-export/import. Dat is onvoldoende voor het doel: platformvoorzitters van de
Gebruikersvereniging PinkRoccade Local Government (GVPRLG) moeten hun jaarlijkse beoordeling
betrouwbaar, met verifieerbare identiteit, en blijvend (niet per-browser) kunnen vastleggen.

**Succescriteria:**
- Een platformvoorzitter kan, na uitnodiging, zonder wachtwoord inloggen en zijn/haar platform
  invullen; de ingevulde data staat server-side, niet in de browser van die ene gebruiker.
- Elke wijziging is te herleiden tot een geverifieerde identiteit en een tijdstip
  (verantwoordingsmodel + audit-trail).
- Nieuwe platformvoorzitters kunnen risicoloos oefenen zonder de echte cijfers te raken.
- De data staat op VPS-001 (sovereign stack), geen externe cloud-afhankelijkheid voor opslag of
  identiteit.

**Buiten scope van dit document:** de inhoud van de vragenlijst zelf (assen, vragen, schaal) —
dat is al vastgelegd in het bestaande design-document en blijft ongewijzigd qua inhoud, alleen de
*technische drager* verandert.

## 2. Rollen en toegang

Twee rollen, geen multi-tenancy tussen gemeenten (bevestigd: één gedeelde beoordeling per
platform, ingevuld door de platformvoorzitter(s) van dat platform — geen aparte inzendingen per
gemeente):

| Rol | Rechten |
|-----|---------|
| **Invuller** (platformvoorzitter) | Mag zijn/haar toegewezen platform(s) invullen en opslaan (concept/definitief). Ziet alleen zijn/haar eigen platform(en) + het organisatie-dashboard (resultaten zijn na afronding voor alle voorzitters leesbaar, zoals nu). |
| **Beheerder** | Nodigt invullers uit (koppelt een invuller aan één of meer platformen, per meetjaar), kan een definitieve meting heropenen, ziet de volledige audit-trail, beheert de oefenomgeving. |

Een invuller is gekoppeld aan **specifieke platformen binnen een specifiek meetjaar** (niet
globaal "invuller"), omdat voorzitters jaarlijks kunnen wisselen. De koppeling leeft in de
GVPRLG-database (niet in Keycloak-rollen), zodat een voorzitterswissel geen Keycloak-mutatie
vergt — alleen een rij in `PlatformInvuller`. **Bevestigd:** een deelnemer mag aan meerdere
platformen tegelijk gekoppeld worden (meerdere `PlatformInvuller`-rijen voor dezelfde gebruiker
binnen één meetjaar) en ziet/vult dan al die platformen in.

Rolonderscheid (Invuller vs. Beheerder) zit wél in Keycloak (realm role), want dat bepaalt
app-brede rechten (bv. uitnodigen, heropenen) die niet aan een platform gebonden zijn.

## 3. Datamodel (kern)

```
Meting            (jaar, aangemaakt)
PlatformScore     (meting_id, platform_id, status: concept|definitief,
                   algemeneToelichting, laatstGewijzigdDoor, laatstGewijzigdOp)
VraagScore        (platform_score_id, vraag_id, score 1-5, toelichting)
PlatformInvuller  (meting_id, platform_id, gebruiker_id)      -- wie mag dit platform invullen, per jaar
AuditLogEntry      (actor_gebruiker_id, actie, doel_type, doel_id, tijdstip, detail)
```

`AuditLogEntry` is append-only en dekt tenminste: uitnodiging verstuurd, account geactiveerd
(TOTP gekoppeld), score gewijzigd (per vraag, met oude→nieuwe waarde), platform opgeslagen als
concept, platform afgerond als definitief, platform heropend door beheerder. Zichtbaar voor de
beheerder als lijst/filter per meting/platform; een invuller ziet alleen de audit-regels van zijn
eigen platform(en).

**Oefenomgeving:** een gereserveerde `Meting` met `jaar = 0` (of een `isOefening: true`-vlag,
nader te bepalen bij implementatie) die nooit meetelt in dashboards/trendvergelijkingen. De
beheerder kan deze oefen-meting met één actie resetten (alle `PlatformScore`/`VraagScore`-rijen
voor die meting verwijderen en opnieuw aanmaken vanuit de lege vragenlijst). Een invuller die
voor het eerst wordt uitgenodigd, krijgt optioneel toegang tot de oefen-meting om de flow te
proberen vóór zijn echte platform.

## 4. Authenticatie: Keycloak-realm `gvprlg`, passwordless OTP

- Nieuwe, losstaande Keycloak-realm `gvprlg` op de bestaande Keycloak-instance van VPS-001 —
  geen vermenging met de admin-realm `athide`.
- Uitnodigen (beheerder, via Keycloak Admin Console, VPN-only): gebruiker aanmaken met verplichte
  actie `CONFIGURE_TOTP`, uitnodigingsmail laten versturen door Keycloak.
- **Open/te valideren:** Keycloak-SMTP is nergens gedocumenteerd als ingericht. Voorstel: Keycloak
  SMTP-instellingen laten verlopen via Resend (API-key is al aanwezig in de stack voor
  SiteGuardian) — geen nieuwe e-mailprovider. Dit moet eerst bevestigd/ingericht worden op
  VPS-001 voordat de uitnodigingsflow werkt; niet aangenomen dat dit al werkt.
- Inloggen: aangepaste, wachtwoordloze browser-flow in realm `gvprlg` (gebruikersnaam/e-mail →
  OTP-formulier, geen wachtwoordstap). Bekend Keycloak-patroon, vraagt eigen flow-configuratie.
- Authenticator kwijt: beheerder verwijdert de OTP-credential in Keycloak en triggert opnieuw de
  `CONFIGURE_TOTP`-mail (gedocumenteerde runbook-stap, zelfde stijl als de bestaande
  "Keycloak-gebruiker aanmaken"-procedure in de sovereign-stack admin-guide).
- De GVPRLG-app zelf gebruikt NextAuth met een Keycloak-OIDC-provider voor sessiebeheer
  (HttpOnly/Secure/SameSite=Strict cookie, nooit localStorage voor de sessie — in lijn met de
  globale security-regels).

## 5. Tijdelijk opslaan (concept-functionaliteit)

Aanname, te bevestigen: het huidige onderscheid concept/definitief blijft, aangevuld met
**autosave** — elke score/opmerking wordt na een korte debounce (bv. 2 seconden inactiviteit of
bij het verlaten van een veld) automatisch als concept opgeslagen via de API, zodat een invuller
geen werk verliest bij een afgebroken sessie. De expliciete "Opslaan als concept"-knop blijft
daarnaast bestaan als geruststelling. "Afronden (definitief)" blijft een bewuste, expliciete actie
met de bestaande validatie (alle vragen ingevuld).

## 6. Techstack en laagindeling

Volledige rewrite als TypeScript-app (de huidige `js/`-map is pure JavaScript zonder types — geen
`tsconfig.json`, geen build-stap. Omdat dit een greenfield-rewrite is, bouwen we conform de
projectstandaard: TypeScript strict, geen `any`).

- **Framework:** Next.js (TypeScript), zelfde keuze als SiteGuardian/Git-Guardian op VPS-001 —
  consistent met bestaande operationele kennis en CI/CD-patroon.
- **ORM:** Prisma + PostgreSQL (zelfde combinatie als SiteGuardian op deze VPS).
- **Common Ground 5-laags-indeling:**
  - `src/ui/` — formulier, resultaten, dashboard (React, poort van de huidige renderlogica in `app.js`)
  - `src/process/` — workflow (meting starten, uitnodigen, rolcontrole, validatieregels)
  - `src/integration/` — API-routes (`app/api/*`), NextAuth/Keycloak-adapter, OpenAPI-spec vooraf
    (`api/specs/gvprlg.yaml`)
  - `src/service/` — scoreberekeningen (poort van de functies in `data.js`: gemiddelden,
    NDS-scores)
  - `src/data/` — Prisma-repository + migraties
- Zod-schema's op alle API-grenzen; RFC 9457 `application/problem+json` voor API-foutmeldingen.

## 7. Deployment (bewust zonder GitHub Actions/CI-CD)

Volgt qua compose-structuur het bestaande patroon voor custom apps op VPS-001 (zoals
SiteGuardian), maar **expliciet niet** het bestaande CI/CD-automatiseringspatroon (GitHub
Actions → `ghcr.io` → Tailscale/SSH) dat `uren`/SiteGuardian/Git-Guardian gebruiken.

**Besluit en motivatie:** dat patroon vereist 4 GitHub-repo-secrets (`TAILSCALE_AUTHKEY`,
`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`) — in feite het VPN-toetredingsbewijs en de SSH-sleutel
voor de volledige VPS-001, niet alleen voor de gvprlg-app. Een supply-chain-incident in een van
de gebruikte third-party GitHub Actions (`docker/build-push-action`, `tailscale/github-action`,
`appleboy/ssh-action`) zou daarmee potentieel toegang geven tot de hele server (Keycloak, Wazuh,
de rest), niet alleen tot gvprlg. Dat staat haaks op het zero-trust/assume-breach-uitgangspunt
van de rest van de stack. Besluit: GVPRLG deployt **handmatig**, getriggerd door de beheerder
via de bestaande, al-vertrouwde Tailscale-SSH-sessie — geen GitHub-secrets, geen `ghcr.io`,
geen third-party Actions in het pad:

```bash
ssh ralph@100.64.0.2
cd /opt/gvprlg && git pull && docker compose build && docker compose up -d
```

- Dockerfile (multi-stage, Alpine, non-root, HEALTHCHECK) bouwt native op VPS-001 zelf (ARM64)
  — geen cross-compile/QEMU nodig, dus ook geen `ghcr.io`-tussenstap vereist.
- **Compose-locatie (bewust afwijkend van SiteGuardian/bridge):** `docker-compose.yml` leeft
  in de GVPRLG-repo zelf, naast de broncode — niet in `stacks/gvprlg/` in sovereign-stack.
  Andere custom-apps bewaren hun compose-bestand wél in sovereign-stack, maar die pullen een
  kant-en-klaar `ghcr.io`-image; gvprlg bouwt lokaal uit eigen broncode (`build: context: .`),
  dus moet zelfstandig te clonen/bouwen zijn. `/opt/gvprlg/` op VPS-001 is simpelweg een
  git-clone van de GVPRLG-repo — geen afhankelijkheid van sovereign-stack's eigen
  directory-sync-mechanisme.
- Hardening in die compose, zelfde als SiteGuardian: `read_only`, `cap_drop: ALL`,
  `no-new-privileges`, memory/pids-limits, `restart: on-failure:5`, Traefik-labels met
  `crowdsec@file`+`rate-limit@file`-middlewares. Secrets (database-wachtwoord, eventuele
  toekomstige API-keys) volgen de bestaande sovereign-stack-conventie:
  `/opt/gvprlg/secrets/` (chmod 700, root-only), nooit als plaintext-waarde in
  `docker-compose.yml` of een gecommit `.env`-bestand — uitsluitend file-references, zoals de
  rest van de stack. De lokale dev-only `devpassword` uit fase A (`docker-compose.dev.yml`,
  nooit op VPS-001 gedraaid) wordt hier niet hergebruikt.
- **De enige wijziging in sovereign-stack zelf:** `net-fe-gvprlg` toevoegen aan de
  netwerklijst van `stacks/traefik/docker-compose.yml` (zodat Traefik's container het nieuwe,
  los aangemaakte `net-fe-gvprlg`-netwerk kan bereiken) — geen `stacks/gvprlg/`-map in
  sovereign-stack.
- Geen GitHub Actions-workflow, geen GitHub-repo-secrets, geen `deploy-gvprlg.yml` in
  sovereign-stack. Toekomstige updates: beheerder logt in, `git pull`, herbouwt, herstart —
  zelfde, bewust handmatige stap als andere admin-taken in `docs/admin-guide.md`.
- **Open/te verifiëren vóór de eerste live deploy (niet aannemen):** de exacte werking van het
  bestaande `/opt/scripts/deploy.sh` (gebruikt door andere stacks, leeft alleen op de server)
  is hier niet van toepassing — gvprlg gebruikt het hierboven beschreven eigen, eenvoudiger
  pad. Wel moet vóór de eerste deploy via SSH bevestigd worden dat `/opt/gvprlg/` nog niet
  bestaat en dat `docker network create net-fe-gvprlg` niet botst met een bestaand netwerk
  (geen vooraf gereserveerd subnet-schema nodig — Docker wijst dat automatisch toe, bevestigd
  in `docs/deployment-plan.md`).
- **Domein: `spinnenweb.gvprlg.nl`** (vervangt de eerdere aanname `gvprlg.publicvibes.nl`).
  Geverifieerd in `stacks/traefik/traefik.yml`: de Let's Encrypt-resolver gebruikt een
  **HTTP-01-challenge** (`httpChallenge: entryPoint: web`), geen DNS-01 met een aan specifieke
  zones gebonden provider. ACME is dus domeinonafhankelijk — er is geen allowlist en geen
  per-zone API-koppeling nodig. Benodigd om dit domein live te krijgen:
  1. Een A-record `spinnenweb.gvprlg.nl` → `89.167.107.143` (publiek IP van VPS-001, uitsluitend
     voor inbound HTTP/HTTPS en de Hetzner Cloud API — nooit voor SSH).
  2. In `stacks/gvprlg/docker-compose.yml` het label
     `traefik.http.routers.gvprlg.rule=Host(\`spinnenweb.gvprlg.nl\`)` met
     `tls.certresolver=letsencrypt` — zelfde patroon als SiteGuardian.
  3. Geen firewall- of resolver-wijziging nodig; Traefik vraagt automatisch een nieuw
     certificaat aan zodra de eerste HTTPS-request voor dit domein binnenkomt.
- **GitHub Pages komt te vervallen.** De huidige statische demo
  (`rwrw01.github.io/GVPRLG-stuurinstrument`) wordt uitgefaseerd zodra de echte app op VPS-001
  live is — `spinnenweb.gvprlg.nl` wordt de enige plek waar het instrument draait. Onderdeel van
  fase D: GitHub Pages uitzetten in de repo-instellingen (Settings → Pages → Build and
  deployment → None) en eventueel de huidige `index.html`/`demo.html` verwijderen of vervangen
  door een redirect-vermelding naar het nieuwe domein.
- `gvprlg`-Postgres wordt toegevoegd aan de bestaande dagelijkse 3-2-1-backup (GPG + offsite
  rclone via rclone/cron) — kleine uitbreiding van een bestaand script, geen nieuw
  backup-mechanisme.

## 8. Testen

- Playwright E2E blijft het uitgangspunt, nu tegen de echte app.
- TOTP is niet zinvol te automatiseren in CI tegen de echte Keycloak-flow. Voorstel: een apart
  Keycloak-testrealm (of test-gebruikers in `gvprlg` met een vaste, gedocumenteerde
  TOTP-seed/secret) zodat Playwright de volledige inlogflow end-to-end kan draaien zonder de
  productieflow te omzeilen of te mocken.
- Unit tests op de service-laag (scoreberekeningen) — 80% lijndekking conform de
  kwaliteitsnorm.
- Elke nieuwe API-endpoint: 1 happy path + 1 foutpad geautomatiseerd getest.

## 9. Open punten (expliciet, niet ingevuld op aanname)

1. Keycloak-SMTP: status onbekend, moet gevalideerd worden. **Eerste taak van fase B:** via SSH
   (Tailscale) naar VPS-001, Keycloak Admin Console → Realm Settings → Email controleren voor de
   `athide`-realm. Zo niet ingericht: Resend-SMTP-instellingen toevoegen (API-key is al aanwezig
   in de stack) en toepassen op de nieuwe `gvprlg`-realm. Pas hierna kan de uitnodigingsflow
   gebouwd en getest worden — dit is een harde afhankelijkheid vóór de rest van fase B.
2. ~~Subdomeinnaam~~ — **opgelost:** `spinnenweb.gvprlg.nl`, ACME werkt domeinonafhankelijk via
   HTTP-01 (zie §7).
3. **DNS `gvprlg.nl`: apart beheerd**, andere registrar/account dan `athide.nl`/`publicvibes.nl`.
   Het A-record (`spinnenweb.gvprlg.nl` → `89.167.107.143`) moet dus los van de
   sovereign-stack-tooling gezet worden, bij de registrar/DNS-provider van `gvprlg.nl` zelf.
   Opgenomen als losse, handmatige stap in fase D (geen Hetzner-DNS-automatisering van
   toepassing).
4. ~~Lot van de GitHub Pages-demo~~ — **opgelost:** komt te vervallen, uitfaseren in fase D
   (zie §7).
5. ~~Mag een invuller meer dan één platform tegelijk toegewezen krijgen?~~ — **opgelost:** ja,
   bevestigd (zie §2).
6. **Vóór de eerste live deploy te verifiëren via SSH (niet aannemen):** bestaat `/opt/gvprlg/`
   al niet, en botst `docker network create net-fe-gvprlg` niet met een bestaand netwerk op
   VPS-001 (zie §7).

## 10. Fasering (voorstel voor het implementatieplan)

1. **Fase A — Backend + datamodel:** Next.js-app, Prisma-schema, API-routes, poort van de
   scoreberekeningen, zonder auth (lokale dev met een vaste test-gebruiker). Doel: de
   functionele kern werkt, los van Keycloak.
2. **Fase B — Authenticatie:** Keycloak-realm `gvprlg`, passwordless OTP-flow, NextAuth-integratie,
   uitnodigingsproces, audit-trail.
3. **Fase C — Oefenomgeving:** sandbox-meting + reset-functie voor de beheerder.
4. **Fase D — Deployment:** Dockerfile, handmatige SSH-gebaseerde deploy (bewust geen
   CI/CD-workflows, zie §7), `stacks/gvprlg/` in sovereign-stack, DNS/Traefik,
   backup-integratie.

Elke fase is apart testbaar en oplevert op zichzelf waarde (fase A is al bruikbaar voor interne
PinkRoccade-tests, ook zonder dat invullers al toegang hebben).
