# Design: GVPRLG fase B — authenticatie, toegang en audit-trail

**Datum:** 2026-11-13
**Status:** goedgekeurd door gebruiker (2026-11-13)
**Vervangt:** §4 (Authenticatie) en open punt §9.1 van
`docs/superpowers/specs/2026-10-09-backend-migratie-vps001-design.md`. De rest van dat document
(datamodel §3, deployment §7) blijft geldig met de aanvullingen hieronder; voor rollen (§2) en
leesrechten gaat dit document voor.

## 1. Doel en waarom

Het stuurinstrument gaat vertrouwelijke beoordelingen per platform bevatten. Platformvoorzitters
moeten daarom met een geverifieerde identiteit inloggen, alleen hun eigen platform(en) kunnen
wijzigen, en elke wijziging moet herleidbaar zijn tot een persoon en tijdstip. Fase A draait nog
zonder authenticatie: alles wordt toegeschreven aan de vaste `TEST_USER_ID`
(`src/integration/testUser.ts`, gebruikt in
`app/api/metingen/[jaar]/platformen/[platformId]/route.ts:67`).

**Succescriteria**
- Een voorzitter krijgt een uitnodigingsmail, koppelt een authenticator-app via een QR-code en
  logt daarna in met e-mailadres + 6-cijferige code, zonder wachtwoord.
- Zonder geldige sessie is geen enkele meting-pagina of -API bereikbaar (behalve `/api/healthz`,
  `/api/readyz`).
- Een invuller kan alleen platformen wijzigen waaraan hij voor dat meetjaar gekoppeld is.
- De beheerder koppelt voorzitters aan platformen, wijzigt rollen, heropent platformen en trekt
  toegang in vanuit het beheerscherm in de app; accounts zelf beheert hij in de Keycloak-console.
- Elke actie uit §8 staat in `AuditLogEntry` met de echte identiteit.

**Non-goals**
- Oefenomgeving (fase C).
- Live-deploy van de app op VPS-001 (fase D is gebouwd; de livegang is een eigen stap). De
  fase-D-artefacten (`docker-compose.yml`, `.env.example`, README) moeten wel de nieuwe secrets en
  variabelen kennen.
- Wijzigingen aan de bestaande realms (beheer-realm en `master`; die hebben nu ook geen SMTP; dat
  blijft zo).
- Accounts aanmaken vanuit de app (Keycloak Admin-API) — zie §3.

**Wel in scope op VPS-001 (besluit gebruiker), elke wijziging met akkoord per stap:** mox-account
voor Keycloak en de realm `gvprlg` op de productie-Keycloak, zodat de mailroute aantoonbaar werkt.
Per stap: huidige staat tonen → oud→nieuw → akkoord → uitvoeren → verifiëren, met rollback
(account/realm verwijderen) beschreven.

**Anti-goals (mislukt, ook als het technisch werkt)**
- Een inlogmethode waarbij toegang tot de mailbox alleen genoeg is (magic link).
- Direct verkeer tussen de gvprlg-container en andere containers (Keycloak, mox, Postgres van
  andere stacks) — zie §4.
- Een versoepeling van de VPN-only-afscherming van Keycloak `/admin`.
- Een uitnodigingsmail die door Exchange Online van gemeenten in quarantaine belandt, of echte
  voorzitters uitnodigen vanaf een voor hen onbekend domein.
- Wijzigingen aan de productiemail van de vereniging (`gvprlg.nl`-hoofddomein, M365).
- Een sessie in `localStorage` of een niet-HttpOnly cookie.

## 2. Vastgestelde huidige toestand (2026-11-13)

| Feit | Bron |
|---|---|
| Keycloak 26.x draait, healthy | `docker ps` op VPS-001 |
| Realms: alleen de beheer-realm en `master`; geen van beide heeft SMTP | query op `realm`/`realm_smtp_config` in de Keycloak-database |
| Publieke Keycloak-URL `https://<keycloak-host>/realms/<realm>` | documentatie van de infra-repo |
| `/admin` van Keycloak is alleen bereikbaar via het beheer-VPN (IP-whitelist-middleware in de proxy) | architectuurdocumentatie en proxyconfiguratie in de infra-repo |
| Containers die het publieke IP aanroepen komen via hairpin-NAT met het bronadres van een Docker-gateway binnen; dat mag nooit gewhitelist worden | proxydocumentatie in de infra-repo |
| Netwerkmodel: hub-and-spoke, elke stack alleen een eigen spoke naar de reverse proxy; geen intercontainerverkeer daemon-wide | architectuurdocumentatie in de infra-repo |
| mox draait, healthy; bestaand accountpatroon (SMTPS 465, wachtwoord als secret-bestand); mox doet zelf TLS op 465, buiten de reverse proxy | `docker ps`; specs in de infra-repo |
| Geen gvprlg-container op VPS-001 (fase D nog niet live) | `docker ps` |
| `gvprlg.nl`: MX = Microsoft 365, SPF met outlook/mailjet/mandrill/hubspot `~all`, DMARC `p=none` | publieke DNS |
| `spinnenweb.gvprlg.nl` A → `<publiek IP VPS>` bestaat al | publieke DNS |
| next-auth: stabiel `4.24.15` (peer `next ^16`, ISC); v5 nog `5.0.0-beta.32` | npm registry |

## 3. Overwogen aanpakken

| Aanpak | Afweging | Besluit |
|---|---|---|
| Magic link (Auth.js e-mailprovider of Keycloak-extensie) | Mailbox-toegang = volledige toegang | Afgewezen (vertrouwelijke data) |
| **Keycloak-realm `gvprlg`, wachtwoordloos met TOTP, app via OIDC** | Ingebouwd, bezitsfactor (telefoon), QR-koppeling | **Gekozen** |
| Route B: beheerscherm maakt accounts via Keycloak Admin-API | Eén handeling, maar vereist `/admin/realms/gvprlg/` publiek (IP-whitelist kan niet door hairpin-NAT) = versoepeling | **Afgewezen** door gebruiker na hardening-check |
| App in het Keycloak-netwerk hangen voor de Admin-API | Direct intercontainerverkeer | Afgewezen (hardeningseis) |
| **Route A: accounts in Keycloak-console (VPN), koppelingen/rollen in app** | Geen versoepeling; per voorzitter een handeling op twee plekken | **Gekozen** |
| Mail via Resend | Externe afhankelijkheid | Afgewezen |
| **Mail via mox, eindafzender `noreply@spinnenweb.gvprlg.nl`** | Soeverein; subdomein raakt SPF hoofddomein niet | **Gekozen** |
| Afzender op een bestaand maildomein van de beheerder | Werkt direct, maar oogt als phishing voor gemeenten | Alleen als tijdelijke testroute (§9) |
| Afzender `@gvprlg.nl` (hoofddomein) | Raakt SPF van de vereniging (M365 + 3 diensten) | Afgewezen |
| Auth.js v5 | Nog bèta | Afgewezen; **next-auth v4.24.15** |

## 4. Netwerk en verkeerspaden (hardeningseis: geen direct intercontainerverkeer)

De gvprlg-app hangt alleen aan zijn eigen spoke (het proxy-netwerk, naar de reverse proxy) en
zijn eigen interne datastore-netwerk (gvprlg-Postgres, `internal: true`). Hij wordt **niet** aan
de netwerken van Keycloak, mox of een andere stack gekoppeld.

| Verkeer | Pad |
|---|---|
| Browser → app | Reverse proxy `spinnenweb.gvprlg.nl` (bestaand fase-D-ontwerp) |
| Browser → Keycloak login | Reverse proxy `<keycloak-host>/realms/gvprlg/...` (publiek, bestaand) |
| App → Keycloak (token, userinfo, JWKS, end-session) | HTTPS naar de publieke issuer-URL `https://<keycloak-host>/realms/gvprlg` via de reverse proxy (hairpin). Deze endpoints zijn publiek; er is geen whitelist nodig. Geen interne URL. |
| App → Keycloak Admin-API | **Bestaat niet** in dit ontwerp |
| Keycloak → mox (uitnodigingsmail) | SMTPS naar de publieke mailhost van mox op poort 465 (mox doet zelf TLS), niet via een gedeeld Docker-netwerk |
| Beheerder → Keycloak-console | Via het beheer-VPN (IP-whitelist), ongewijzigd |

**Op VPS-001 vast te stellen vóór de realm-inrichting (alleen-lezen, niet aannemen):**
1. Kan de Keycloak-container uitgaand poort 465 op de publieke mox-hostnaam bereiken
   (host-firewall)? Zo niet: dit melden met het voorstel, niet zelf de firewall wijzigen.
2. De exacte publieke mox-hostnaam voor SMTPS (certificaatnaam moet kloppen).
3. Krijgt een container op een nieuwe spoke via hairpin `<keycloak-host>:443` (zelfde vraag als
   voor andere apps; wordt pas relevant bij de livegang, maar vastleggen in het runbook).

## 5. Keycloak-realm `gvprlg`

- **Realm:** `gvprlg`, display name "GVPRLG Spinnenweb". Registratie uit, "forgot password" uit,
  "login with email" aan, "duplicate emails" uit, "verify email" uit (de uitnodigingslink bewijst
  bezit van de mailbox).
- **Browserflow (kopie van `browser`, ingesteld als realm-browserflow):**
  cookie (alternative) → subflow (alternative): *Username Form* (required) → *OTP Form* (required).
  Geen wachtwoordstap.
- **OTP-policy:** TOTP, SHA1, 6 cijfers, 30 s, look-ahead 1.
- **Brute-force-detectie:** aan (Keycloak-standaardwaarden, permanent lockout uit).
- **Sessies:** SSO session idle 30 min, max 8 uur.
- **Geen realm roles voor de app.** Rollen leven in de app-database (§6); Keycloak levert alleen
  de identiteit. Dit voorkomt dat Keycloak-rol en app-rol uit elkaar lopen, nu de app Keycloak
  niet kan bijwerken.
- **SMTP:** mox op 465, SSL aan, auth met het mox-account uit §9, from-display "GVPRLG Spinnenweb".
- **Taal:** `defaultLocale = nl`, internationalisation aan met alleen `nl`. De standaard
  Keycloak-tekst voor "execute actions" volstaat.
- **Client `gvprlg-app`:** confidential OIDC, standard flow (authorization code + PKCE),
  redirect URI `https://spinnenweb.gvprlg.nl/api/auth/callback/keycloak` (dev-realm daarnaast
  `http://localhost:3000/api/auth/callback/keycloak`), post-logout redirect `/`. Geen
  service-account.
- **Realm als code:** configuratie zonder secrets in `deploy/keycloak/realm-gvprlg.json`; lokaal
  geïmporteerd in de dev-Keycloak, op VPS-001 eenmalig via Admin Console-import (VPN) of
  `kc.sh import` — keuze aan de bouwer, gedocumenteerd in de README.

## 6. App-integratie (next-auth v4.24.15)

- Route handler `app/api/auth/[...nextauth]/route.ts` met `KeycloakProvider`, issuer
  `KEYCLOAK_ISSUER` (`https://<keycloak-host>/realms/gvprlg`; lokaal de dev-Keycloak).
- **Sessie:** JWT-strategie. Inhoud: Keycloak `sub`, e-mail, naam, `id_token` (alleen voor
  logout). Cookie HttpOnly, Secure (productie), `SameSite=Strict`, `maxAge` 8 uur.
- **Uitloggen:** app-sessie wissen én RP-initiated logout bij Keycloak (`end_session_endpoint`
  met `id_token_hint`), anders logt de volgende klik zonder TOTP weer in.
- **Nieuwe tabel `Gebruiker`** (bron van waarheid voor toegang in de app):
  `id` (cuid), `email` (uniek, lowercase), `naam`, `rol` (`invuller|beheerder`), `status`
  (`uitgenodigd|actief|ingetrokken`), `keycloakSub` (uniek, nullable tot eerste login),
  `aangemaakt`, `laatsteLogin`.
- **Koppelen bij login:** na een geslaagde Keycloak-login zoekt de app de `Gebruiker` op
  `keycloakSub`; bestaat die niet, dan op e-mail (uit het geverifieerde token) met
  `keycloakSub = null`, en legt de `sub` vast (`status → actief`, audit `eerste_login`).
  Geen match, of `status = ingetrokken`: geen sessie, pagina "Geen toegang" (Nederlands),
  audit `toegang_geweigerd`. Een e-mailadres dat al aan een andere `sub` gebonden is, wordt
  geweigerd (voorkomt overname na het hergebruiken van een adres).
- **Eerste beheerder (bootstrap):** env `BOOTSTRAP_BEHEERDER_EMAIL`. Bij de eerste login van dat
  adres, als er nog geen enkele beheerder bestaat, maakt de app een `Gebruiker` met rol
  `beheerder`. Daarna heeft de variabele geen effect meer.
- **Identiteit in data:** `PlatformInvuller.gebruiker`, `PlatformScore.laatstGewijzigdDoor` en
  `AuditLogEntry.actor` bevatten voortaan `Gebruiker.id`. Het e-mailadres op het moment van de
  actie komt in `AuditLogEntry.detail`. Geen foreign keys op deze kolommen (bestaande
  `test-user@lokaal`-rijen in dev-data blijven staan; de audit-UI toont onbekende actoren als
  "onbekend (`<waarde>`)"). Het voorbeelddatascript `scripts/seed-voorbeeldwaardes-2026.mjs` wordt
  aangepast naar een vaste seed-gebruiker.
- **Toegangscontrole (Process-laag `src/process/`), per request uit de DB:**
  - `requireSession()` — geen sessie → 401 (API, RFC 9457) of redirect naar login (pagina's).
  - Gebruiker opnieuw laden op id; `status ≠ actief` → 403. Intrekken werkt daardoor direct.
  - `requireRol('beheerder')` — leest `Gebruiker.rol` uit de DB → 403.
  - `requirePlatformSchrijfrecht(jaar, platformId)` — invuller moet een `PlatformInvuller`-rij
    hebben; beheerder mag alles → 403 met audit `toegang_geweigerd`.
- **Leesrechten (besluit gebruiker):** elke ingelogde, actieve gebruiker ziet alle platformen van
  een meetjaar, inclusief concepten (gestippeld, zoals nu). Alleen schrijven is beperkt.
- **Pagina-bescherming:** Next 16 `proxy.ts` (lees eerst
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`) als eerste
  filter op sessie-aanwezigheid, plus de expliciete checks in elke API-route en server-component.
  Proxy is nooit de enige controle.
- `src/integration/testUser.ts` en `TEST_USER_ID` verdwijnen; bestaande tests draaien met een
  ingelogde testgebruiker.

**Aanvulling 2026-11-14: rol lezer.** Naast `invuller` en `beheerder` bestaat de rol `lezer`
(`gebruikers.rol` blijft een string; geen migratie). Een lezer ziet alles wat een invuller ziet,
inclusief concepten, en mag het invulformulier openen: alle invoer is dan uitgeschakeld, er zijn
geen opslaanknoppen en bovenaan staat "Je hebt alleen leesrechten. Wijzigingen opslaan is niet
mogelijk." De server is de echte grens: `vereisPlatformSchrijfrecht` geeft een lezer altijd 403
met reden `alleen-lezen`, ook als er (nog) een koppeling bestaat, en de weigering wordt geaudit
als `toegang_geweigerd`. Beheer (`/beheer`, beheer-API's, meting aanmaken, heropenen) blijft
alleen voor `beheerder`. Een lezer heeft nooit platformkoppelingen: aanmaken met rol `lezer` en
niet-lege `platformIds`, of `PUT .../koppelingen` met een niet-lege lijst voor een lezer, geeft 400
"Een lezer kan niet aan platformen gekoppeld worden."; een rolwijziging naar `lezer` verwijdert in
dezelfde transactie alle koppelingen (alle meetjaren) en zet het aantal als
`koppelingenVerwijderd` in het auditdetail van `rol_gewijzigd`. Zelfbescherming en "laatste actieve
beheerder" gelden ook bij beheerder → lezer. In de auditlog krijgt een lezer het invullerzicht
(alleen regels van eigen platformen, dus leeg).

## 7. Beheerscherm en uitnodigen

**Nieuwe voorzitter (route A, twee plekken):**
1. Keycloak Admin Console (VPN), realm `gvprlg`: gebruiker aanmaken met e-mail, naam,
   `emailVerified = on`, required action `Configure OTP`; daarna "Send email" (execute actions,
   lifespan 72 uur). Runbook in de README.
2. App `/beheer` → "Voorzitter toevoegen": e-mail, naam, rol, meetjaar + platform(en). Maakt
   `Gebruiker` (`uitgenodigd`) + `PlatformInvuller`-rijen; audit `gebruiker_toegevoegd`.
   Volgorde maakt niet uit: de koppeling gebeurt bij de eerste login op e-mail.

Pagina `/beheer` (alleen rol `beheerder`):

```
Gebruikers                                        [+ Voorzitter toevoegen]
────────────────────────────────────────────────────────────────────────
Naam            E-mail                Rol        Status       Platformen 2026
J. Jansen       j.jansen@gem.nl       invuller   actief       Burgerzaken, Belastingen
P. de Vries     p.devries@gem.nl      invuller   uitgenodigd  Sociaal Domein
                              [Koppelingen] [Rol wijzigen] [Toegang intrekken]
```

- **Koppelingen:** `PlatformInvuller`-rijen per meetjaar toevoegen/verwijderen.
- **Rol wijzigen:** `invuller ↔ beheerder`, alleen in de app-DB.
- **Toegang intrekken / herstellen:** `Gebruiker.status`. Werkt direct op de volgende request.
  Het runbook vermeldt dat de beheerder daarnaast de gebruiker in Keycloak uitschakelt.
- **Zelfbescherming:** een beheerder kan zichzelf niet degraderen of intrekken, en de laatste
  actieve beheerder kan niet worden gedegradeerd of ingetrokken.
- **Heropenen:** op de platformpagina een knop "Heropenen" (alleen beheerder) die een
  `definitief` platform terugzet naar `concept`; audit `platform_heropend`. De bestaande 409-tekst
  (`app/api/metingen/[jaar]/platformen/[platformId]/route.ts:54`) verwijst er al naar.
- **Authenticator kwijt / uitnodiging opnieuw:** in de Keycloak-console (runbook): OTP-credential
  verwijderen, required action `Configure OTP` zetten, "Send email". Geen app-functie.

## 8. Audit-trail

Bestaande `AuditLogEntry` (append-only, geen update/delete-pad in de code). Acties:
`gebruiker_toegevoegd`, `eerste_login`, `ingelogd`, `uitgelogd`, `koppeling_toegevoegd`,
`koppeling_verwijderd`, `rol_gewijzigd`, `toegang_ingetrokken`, `toegang_hersteld`,
`toegang_geweigerd`, `platform_heropend`, plus de bestaande score-/statusacties, nu met de echte
actor.

- Beheerder: auditpagina `/beheer/audit` met filter op meetjaar, platform, actor en actie.
- Invuller: ziet alleen audit-regels van zijn eigen platform(en).
- Geen tokens, codes of secrets in `detail` of in logs.

## 9. Mail: mox en DNS

**Twee stappen (besluit gebruiker):**
1. **Testroute:** afzender op een bestaand mox-domein (SPF/DKIM al ingericht), bv. een
   `gvprlg-noreply`-adres (naam: bouwer). Hiermee wordt de uitnodigingsflow op de
   productie-Keycloak getest met eigen testmailboxen. **In deze stap worden geen echte
   voorzitters uitgenodigd.**
2. **Definitieve route** zodra de DNS-records er zijn: `noreply@spinnenweb.gvprlg.nl`. Omzetten =
   SMTP-account en from-adres in realm `gvprlg` wijzigen (configuratie, geen code).

- **mox (stap 2):** domein `spinnenweb.gvprlg.nl` toevoegen, account `noreply`, DKIM-sleutel laten
  genereren. Wachtwoorden als secret-bestand volgens het bestaande patroon.
- **DNS (handmatig, bij de registrar van `gvprlg.nl`, door de gebruiker):**
  - `spinnenweb.gvprlg.nl TXT "<SPF-record met het publieke IP van de mailserver>"`
  - `<selector>._domainkey.spinnenweb.gvprlg.nl TXT "<door mox gegenereerd>"`
  - `_dmarc.spinnenweb.gvprlg.nl TXT "v=DMARC1; p=quarantine; rua=mailto:…"` (rapportadres TBD)
  - Het SPF-record van `gvprlg.nl` zelf wordt niet aangeraakt.
- **Verificatie (beide stappen):** testmail naar een Microsoft-365-mailbox en een Gmail-adres;
  headers `spf=pass`, `dkim=pass`, `dmarc=pass`.

## 10. Configuratie en secrets

Nieuwe variabelen, Zod-gevalideerd bij start in een nieuw `src/service/env.ts` (niet in
`src/service/config.ts`, dat de domeinconfig bevat); ontbreken = harde startfout:
`KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET_FILE`, `NEXTAUTH_URL`,
`NEXTAUTH_SECRET_FILE`, `BOOTSTRAP_BEHEERDER_EMAIL`.
Secrets alleen als bestand (`<compose-map>/secrets/` in productie), nooit als waarde in compose of
een gecommit `.env`. `.env.example`, `docker-compose.yml` en README uit fase D worden bijgewerkt.

## 11. Testen

- **Lokaal (`docker-compose.dev.yml`):** bestaande Postgres + Keycloak 26.6.4 met import van
  `deploy/keycloak/realm-gvprlg.json` plus een dev-overlay (localhost-redirect, testgebruikers) +
  Mailpit als SMTP-vanger voor de dev-realm. Lokaal mag de dev-Keycloak in hetzelfde
  compose-netwerk als de app staan (geen productie-topologie; de app spreekt hem aan via
  `localhost`-poorten zoals de browser, zodat issuer-URL's overeenkomen).
- **Testgebruikers:** `beheerder@test.local`, `invuller@test.local` met een vaste, gedocumenteerde
  TOTP-seed. Playwright berekent de code met `otpauth`; de echte Keycloak-flow wordt doorlopen,
  geen mock.
- **E2E-journeys:** inloggen; uitloggen (daarna opnieuw code nodig); invuller wijzigt eigen
  platform, krijgt 403 op ander platform; invuller ziet concepten van andere platformen;
  beheerder voegt voorzitter toe + Keycloak-account (via dev-admin-API in de testsetup) → mail in
  Mailpit → QR → TOTP koppelen → eerste login koppelt; e-mail zonder `Gebruiker` → "Geen toegang";
  toegang intrekken → volgende request geweigerd; heropenen.
- **Integratie:** elke nieuwe/gewijzigde API-route 1 happy + 1 foutpad (401/403).
- **Unit:** Process-laag-checks, login-koppellogica, env-validatie.

## 12. Afhankelijkheden (README-licentietabel bijwerken)

| Pakket | Versie | Licentie |
|---|---|---|
| next-auth | 4.24.15 | ISC |
| otpauth (devDependency, E2E) | 9.6.0 | MIT |
| Keycloak (container) | 26.6.4 | Apache-2.0 |
| Mailpit (dev-container) | nader te pinnen | MIT |

Exacte versies en licenties verifieert de bouwer bij installatie.

## 13. Open punten

1. **Login-domein:** voorzitters zien de Keycloak-loginpagina op het domein van de bestaande Keycloak. Een eigen
   loginhostname (realm "Frontend URL", bv. `login.spinnenweb.gvprlg.nl`) vraagt een extra
   proxy-router en certificaat. Niet in fase B; besluit gebruiker vóór de eerste echte
   uitnodiging.
2. DMARC-rapportadres (§9).

## 14. Aan de bouwer gelaten

- Indeling van beheer- en auditpagina's binnen de bestaande stijl (`app/components.css`).
- Exacte Nederlandse meldingen.
- Realm-import op VPS-001 via Admin Console of `kc.sh import` (gedocumenteerd).
- Taakvolgorde, mits de lokale Keycloak-omgeving met realm-export eerst staat.
