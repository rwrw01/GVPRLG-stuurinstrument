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

## 7. Deployment en CI/CD

Volgt het bestaande patroon voor custom apps op VPS-001 (zoals `uren`/projectadmin):

- GVPRLG blijft een eigen GitHub-repo, krijgt een GitHub Actions-workflow die bouwt en pusht naar
  `ghcr.io` (multi-stage Dockerfile, Alpine, non-root, HEALTHCHECK, gepinde digest).
- `sovereign-stack` krijgt een nieuwe `stacks/gvprlg/docker-compose.yml`, met dezelfde hardening
  als SiteGuardian: `read_only`, `cap_drop: ALL`, `no-new-privileges`, memory/pids-limits,
  `restart: on-failure:5`, Traefik-labels met `crowdsec@file`+`rate-limit@file`-middlewares.
- Nieuwe `deploy-gvprlg.yml`-workflow in `sovereign-stack` die via Tailscale/SSH pullt en
  herstart — zelfde mechaniek als de andere custom stacks.
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

## 10. Fasering (voorstel voor het implementatieplan)

1. **Fase A — Backend + datamodel:** Next.js-app, Prisma-schema, API-routes, poort van de
   scoreberekeningen, zonder auth (lokale dev met een vaste test-gebruiker). Doel: de
   functionele kern werkt, los van Keycloak.
2. **Fase B — Authenticatie:** Keycloak-realm `gvprlg`, passwordless OTP-flow, NextAuth-integratie,
   uitnodigingsproces, audit-trail.
3. **Fase C — Oefenomgeving:** sandbox-meting + reset-functie voor de beheerder.
4. **Fase D — Deployment:** Dockerfile, CI/CD-workflows, `stacks/gvprlg/` in sovereign-stack,
   DNS/Traefik, backup-integratie.

Elke fase is apart testbaar en oplevert op zichzelf waarde (fase A is al bruikbaar voor interne
PinkRoccade-tests, ook zonder dat invullers al toegang hebben).
