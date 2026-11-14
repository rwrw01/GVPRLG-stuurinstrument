# Verslag: fase B mailroute en realm `gvprlg` op VPS-001 (testroute)

**Datum:** 2026-11-14
**Uitgevoerd door:** Claude Code (sessie), per stap na expliciet akkoord van de beheerder
**Scope:** plan `docs/superpowers/plans/2026-11-13-gvprlg-fase-b-authenticatie.md`, Task 12
**Spec:** `docs/superpowers/specs/2026-11-13-fase-b-authenticatie-design.md`

Niet gewijzigd: realms `athide` en `master`, Traefik, firewall, Docker-netwerken.

## Stap 1 — vaststelling (alleen-lezen)

| Vraag | Bevinding |
|---|---|
| SMTPS-host van mox | `mail.publicvibes.nl:465`, certificaat CN `mail.publicvibes.nl` (Let's Encrypt, geldig tot 2027-01-31) |
| Keycloak → `mail.publicvibes.nl:465` | bereikbaar vanuit de container `keycloak` |
| Realm `gvprlg` | bestond niet (alleen `athide`, `master`) |
| DNS `publicvibes.nl` | SPF `ip4:89.167.107.143 … ~all`, DKIM-selector `2026a` ondertekent, DMARC `p=reject` |
| mox-accounts vooraf | `forwarder`, `scan`, `siteguardian`, `sparring`, `wazuh` (`noreply@publicvibes.nl` hoort bij `sparring`) |
| Keycloak | 26.6.4, `kcadm.sh` in container, admin-secrets via `/run/secrets/` |

## Stap 2 — mox-account

- Nieuw account `gvprlg-noreply`, adres `gvprlg-noreply@publicvibes.nl`
  (`mox config account add`, wachtwoord via `mox setaccountpassword` op stdin).
- Wachtwoord: `/opt/gvprlg/secrets/mox_gvprlg_noreply_password` (root:root, 0600, 48 tekens).
- Bewijs: `AUTH PLAIN` vanaf de host op `mail.publicvibes.nl:465` → `235 2.7.0 nice`.
- Rollback: `docker exec mox mox config account rm gvprlg-noreply`.

## Stap 3 — realm `gvprlg`

- Geïmporteerd uit `deploy/keycloak/realm-gvprlg.json` via `kcadm.sh create realms -f -` in de
  container `keycloak`; het ingevulde JSON ging via stdin, geen bestand met secrets op schijf.
- Ingevuld t.o.v. het repo-bestand: `smtpServer.host=mail.publicvibes.nl`, `user`/`from` =
  `gvprlg-noreply@publicvibes.nl`, `password` = mox-wachtwoord, client-secret `gvprlg-app`.
- Secrets: `/opt/gvprlg/secrets/keycloak_client_secret` en `nextauth_secret` (1001:1001, 0600).
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

- Gebruiker `ralph.wagter@gmail.com` (id `0f9e7dfb-…`), enabled, e-mail geverifieerd,
  required action `CONFIGURE_TOTP`; actiemail verstuurd met `execute-actions-email`
  (lifespan 259200 s, zonder `redirect_uri`: de app-URL is geen geregistreerde redirect en de
  app draait nog niet).
- mox-log: submission-login `gvprlg-noreply@publicvibes.nl` `result=ok` (TLS 1.3),
  `messages queued for delivery` (4044 bytes), `delivered from queue` naar
  `gmail-smtp-in.l.google.com` bij poging 1; wachtrij leeg.
- Gmail plaatste de eerste mail in **Spam** (eerste bericht van een nieuwe afzender).
- **Defect gevonden:** de actielink begon met `http://auth.athide.nl:8080/…` en het token had
  issuer `http://auth.athide.nl:8080/realms/gvprlg`. Oorzaak: `KC_HOSTNAME=auth.athide.nl`
  zonder schema/poort, waardoor Keycloak schema en poort van het verzoek overneemt; `kcadm`
  sprak Keycloak rechtstreeks aan op `http://localhost:8080`. Hetzelfde zou gebeuren bij
  verzenden vanuit de Admin Console op `:444` (link alleen via VPN bereikbaar).
- **Fix (stap 4c):** realm-attribuut `frontendUrl=https://auth.athide.nl`, alleen op realm
  `gvprlg`, zonder herstart. Daarna issuer via `localhost:8080` én via Traefik
  `https://auth.athide.nl/realms/gvprlg`; issuer van `athide` ongewijzigd.
  Rollback: attribuut leegmaken. Let op: `kcadm get realms/gvprlg --fields attributes` toont dit
  attribuut niet; controle via tabel `realm_attribute`.
- **Herverzending (stap 4d):** `delivered from queue` naar `gmail-smtp-in.l.google.com` bij
  poging 1. De eerste link is ongeldig geworden.
- Headers in Gmail (`Authentication-Results`): TBD — door beheerder te bevestigen.
- QR-koppeling in de Keycloak-accountflow: **geslaagd** (beheerder bevestigd, 2026-11-14) via
  de link uit de herverzonden mail.

### 4b Microsoft 365

TBD — nog geen adres opgegeven.

## Open punten

0. Afgehandeld: `deploy/keycloak/realm-gvprlg.json` bevat nu `attributes.frontendUrl`, met
   een test in `deploy/keycloak/realm.test.ts` en een controle-stap in de README-runbook.
1. Gmail zette de eerste mail in Spam. Verwacht hetzelfde bij echte ontvangers zolang de
   afzender `publicvibes.nl` is; reden temeer voor stap 2 van de mailroute.
2. Stap 2 van de mailroute (`noreply@spinnenweb.gvprlg.nl`): pas na DNS-records uit spec §9
   (SPF, DKIM-selector uit mox, DMARC); daarna SMTP-gebruiker/-wachtwoord/from omzetten in de
   realm. Tot die tijd geen echte voorzitters uitnodigen vanaf `publicvibes.nl`.
3. Login-domein: realm draait onder `auth.athide.nl` (spec §13, bewust open).
4. Deploy van de app zelf (fase C) is geen onderdeel van deze taak; `/opt/gvprlg/secrets/`
   bevat al de drie benodigde secrets.
5. Terzijde uit de mox-log: geautomatiseerde wachtwoordpogingen op submission met gebruikersnamen
   `ralph.wagter@athide.nl` en `ralph.wagter` vanaf twee externe IP's, alle `badcreds`;
   mox rate-limit actief. Geen actie binnen deze taak.
