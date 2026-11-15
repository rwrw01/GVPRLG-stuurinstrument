# GVPRLG Fase B — Authenticatie, toegang en audit-trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Platformvoorzitters loggen wachtwoordloos in met TOTP via Keycloak-realm `gvprlg`, de app
dwingt per request sessie, status, rol en platform-schrijfrecht af, de beheerder beheert
koppelingen/rollen/toegang en heropent platformen, en elke actie staat met echte identiteit in de
audit-trail. Lokaal volledig E2E-bewezen; op VPS-001 alleen mox-account + realm met akkoord per stap.

**Architecture:** next-auth v4.24.15 met `KeycloakProvider` (OIDC, JWT-sessie). Keycloak levert
alleen identiteit; rol, status en koppelingen leven in de app-DB (`Gebruiker`, `PlatformInvuller`).
Toegangscontrole in `src/process/toegang.ts`, aangeroepen vanuit elke API-route via één
integratiefunctie `vereisGebruiker()`. `proxy.ts` is alleen een eerste filter. Geen Keycloak
Admin-API, geen gedeelde Docker-netwerken met andere stacks.

**Tech Stack:** Next.js 16.4.0, next-auth 4.24.15, Prisma 7.10.0 + Postgres 16, Zod 4.6.5,
Vitest 5.0.3, Playwright 1.58.2, otpauth 9.6.0 (dev), Keycloak 26.6.4 + Mailpit (dev-containers).

**Spec:** `docs/superpowers/specs/2026-11-13-fase-b-authenticatie-design.md` (leidend), aangevuld
met `docs/superpowers/specs/2026-10-09-backend-migratie-vps001-design.md` (datamodel, deployment).

## Global Constraints

- **Geen direct intercontainerverkeer:** de gvprlg-app hangt in productie alleen aan
  het proxy-netwerk en `gvprlg-internal`. Nooit aan de netwerken van Keycloak of mox.
  App → Keycloak uitsluitend via de publieke issuer-URL `https://<keycloak-host>/realms/gvprlg`.
- **Geen Keycloak Admin-API in de app** en geen wijziging aan de VPN-only-afscherming van `/admin`.
- De bestaande realms (beheer-realm en `master`) worden niet gewijzigd.
- Sessiecookie: HttpOnly, Secure (productie), `SameSite=Strict`, `maxAge` 8 uur (28800 s).
  Nooit `localStorage` voor sessies.
- Keycloak-realm: SSO session idle 30 min, max 8 uur; TOTP SHA1, 6 cijfers, 30 s, look-ahead 1;
  brute-force-detectie aan; execute-actions-lifespan 72 uur.
- Leesrechten: elke ingelogde, **actieve** gebruiker ziet alle platformen incl. concepten.
  Schrijven alleen gekoppelde invuller of beheerder.
- Rol en status komen per request uit de DB (`Gebruiker`), nooit uit het token.
- Gebruikersgerichte teksten Nederlands; logs, code, commits Engels. RFC 9457 problem+json voor
  API-fouten (bestaande `problemResponse`).
- Zod op alle externe input (requestbodies, params, env, token-claims).
- Secrets alleen als bestand (`*_FILE`-variabelen), nooit als waarde in compose of gecommit `.env`.
- Container-images in compose op digest gepind.
- Max 300 regels per bestand, 40 per functie; named exports (behalve waar Next.js een default
  export eist: pages, layouts); JSDoc met `@param`/`@returns` op nieuwe functies.
- Commits: Engels, **geen `Co-Authored-By`-regels**.
- Werk op VPS-001 (Taak 12) alleen na expliciet akkoord per stap; huidige staat tonen, oud→nieuw,
  rollback beschreven. Geen echte voorzitters uitnodigen zolang de afzender op het testmaildomein staat.

## Review Focus

1. **E-mailvarianten:** `J.Jansen@Gem.nl ` in het beheerscherm vs. `j.jansen@gem.nl` in het token
   moeten dezelfde gebruiker zijn; een token zonder `email` of met `email_verified=false` wordt
   geweigerd → Taak 4 (tests `normaliseert e-mail…`, `weigert ongeverifieerde e-mail`) en Taak 8.
2. **Strict-cookie na cross-site redirect:** na de Keycloak-callback moet de eerste pagina de
   gebruiker als ingelogd tonen, zonder inloglus → Taak 5 (doorstuurpagina) + Taak 11
   (E2E `toont na inloggen direct de naam van de gebruiker`).
3. **Intrekken tijdens actieve sessie:** de eerstvolgende API-call geeft 403 → Taak 6
   (test `geeft 403 voor een ingetrokken gebruiker met geldige sessie`) + Taak 11.
4. **Laatste beheerder buitensluiten:** zichzelf of de laatste actieve beheerder degraderen of
   intrekken wordt geweigerd → Taak 8 (tests `weigert…laatste beheerder`).
5. **Keycloak-account opnieuw aangemaakt (nieuwe `sub`, zelfde e-mail):** standaard geweigerd
   (geen overname), maar de beheerder kan het account ontkoppelen zodat de volgende login opnieuw
   bindt → Taak 4 (test `weigert e-mail die aan andere sub gebonden is`) + Taak 8
   (test `ontkoppelt keycloakSub`).

---

## File Structure

| Bestand | Verantwoordelijkheid |
|---|---|
| `docker-compose.dev.yml` (wijzig) | + `keycloak` (26.6.4, `start-dev --import-realm`, poort 8081), + `mailpit` (SMTP 1025, UI 8025) |
| `deploy/keycloak/realm-gvprlg.json` (nieuw) | Productie-realm zonder users/secrets |
| `deploy/keycloak/realm-gvprlg.dev.json` (nieuw) | Dev-realm: zelfde + localhost-redirect, Mailpit-SMTP, testgebruikers met vaste TOTP-seed |
| `deploy/keycloak/realm.test.ts` (nieuw) | Bewaakt dat dev en prod alleen op toegestane sleutels verschillen; prod bevat geen users/secrets |
| `src/service/env.ts` (nieuw) | Zod-validatie van auth-env, leest `*_FILE` |
| `prisma/schema.prisma` + migratie (wijzig) | + `Gebruiker` |
| `src/data/gebruikersRepository.ts` (nieuw) | CRUD `Gebruiker` + koppelingen |
| `src/data/auditRepository.ts` (nieuw) | `schrijfAudit`, `zoekAudit` |
| `src/data/metingenRepository.ts` (wijzig) | + `heropenPlatform` |
| `src/process/loginKoppeling.ts` (nieuw) | Token-claims → `Gebruiker` (binden, bootstrap, weigeren) |
| `src/process/toegang.ts` (nieuw) | `vereisActief`, `vereisRol`, `vereisPlatformSchrijfrecht` |
| `src/process/beheerWorkflow.ts` (nieuw) | Toevoegen, rol/status wijzigen, ontkoppelen, koppelingen; zelfbescherming |
| `src/integration/auth/authOptions.ts` (nieuw) | next-auth-config: provider, cookies, callbacks, events |
| `src/integration/auth/sessie.ts` (nieuw) | `vereisGebruiker()` voor routes/server-componenten |
| `app/api/auth/[...nextauth]/route.ts` (nieuw) | next-auth handler |
| `app/api/auth/uitloggen/route.ts` (nieuw) | Sessie wissen + RP-initiated logout |
| `app/inloggen/page.tsx`, `app/inloggen/doorsturen/page.tsx`, `app/geen-toegang/page.tsx` (nieuw) | Publieke auth-pagina's |
| `proxy.ts` (nieuw) | Eerste filter: zonder sessiecookie → `/inloggen` |
| Alle `app/api/metingen/**/route.ts` (wijzig) | `vereisGebruiker()` + schrijfrecht |
| `app/api/metingen/[jaar]/platformen/[platformId]/heropenen/route.ts` (nieuw) | Heropenen |
| `app/api/beheer/gebruikers/route.ts`, `.../[id]/route.ts`, `.../[id]/koppelingen/route.ts`, `app/api/audit/route.ts` (nieuw) | Beheer- en audit-API |
| `app/beheer/page.tsx`, `app/beheer/audit/page.tsx` (nieuw) | Beheer-UI |
| `src/ui/components/GebruikerMenu.tsx` (nieuw), `app/layout.tsx` (wijzig) | Naam + uitloggen + link beheer in header |
| `api/specs/gvprlg.yaml` (wijzig) | Nieuwe endpoints, 401/403 |
| `src/integration/testUser.ts` (verwijder) | — |
| `scripts/seed-voorbeeldwaardes-2026.ts` (vervangt `.mjs`) | Seed direct via repository met actor `seed-voorbeelddata` |
| `docker-compose.yml`, `.env.example`, `.env.test.example`, `README.md` (wijzig) | Secrets/env, runbook, licentietabel |
| `tests/auth-helpers.js`, `tests/gvprlg-fase-b-auth.spec.js` (nieuw), bestaande E2E (wijzig), `playwright.config.js` (wijzig) | E2E |

---

### Task 1: Lokale Keycloak + Mailpit met realm-als-code

**Files:**
- Modify: `docker-compose.dev.yml`
- Create: `deploy/keycloak/realm-gvprlg.json`, `deploy/keycloak/realm-gvprlg.dev.json`
- Test: `deploy/keycloak/realm.test.ts`; `vitest.config.ts` include uitbreiden met `deploy/**/*.test.ts`

**Interfaces:**
- Produces: dev-issuer `http://localhost:8081/realms/gvprlg`; client `gvprlg-app` met dev-secret
  `dev-gvprlg-app-secret`; testgebruikers `beheerder@test.local` en `invuller@test.local` met
  TOTP-seed `JBSWY3DPEHPK3PXP` (base32); `invuller2@test.local` **zonder** OTP-credential en met
  required action `CONFIGURE_TOTP` (voor de QR-journey); Mailpit-API `http://localhost:8025/api/v1/`.

- [ ] **Step 1: Write the failing test** `deploy/keycloak/realm.test.ts`

```ts
describe('realm-gvprlg', () => {
  it('productierealm bevat geen gebruikers of client-secrets', () => {
    expect(prod.users ?? []).toEqual([]);
    expect(prod.clients.find((c) => c.clientId === 'gvprlg-app')?.secret).toBeUndefined();
    expect(prod.smtpServer?.password).toBeUndefined();
  });
  it('dev wijkt alleen af op users, redirectUris, webOrigins, secret, smtpServer', () => {
    expect(zonderToegestaneVerschillen(dev)).toEqual(zonderToegestaneVerschillen(prod));
  });
  it('legt de afgesproken beveiligingswaarden vast', () => {
    expect(prod).toMatchObject({
      realm: 'gvprlg', registrationAllowed: false, resetPasswordAllowed: false,
      loginWithEmailAllowed: true, duplicateEmailsAllowed: false, verifyEmail: false,
      bruteForceProtected: true, permanentLockout: false,
      ssoSessionIdleTimeout: 1800, ssoSessionMaxLifespan: 28800,
      actionTokenGeneratedByAdminLifespan: 259200,
      otpPolicyType: 'totp', otpPolicyAlgorithm: 'HmacSHA1', otpPolicyDigits: 6,
      otpPolicyPeriod: 30, otpPolicyLookAheadWindow: 1,
      internationalizationEnabled: true, supportedLocales: ['nl'], defaultLocale: 'nl',
    });
    expect(prod.browserFlow).toBe('gvprlg-browser-otp');
  });
  it('browserflow heeft Username Form en OTP Form, geen wachtwoordstap', () => {
    const providers = alleAuthenticators(prod, 'gvprlg-browser-otp');
    expect(providers).toEqual(expect.arrayContaining(['auth-cookie', 'auth-username-form', 'auth-otp-form']));
    expect(providers).not.toContain('auth-username-password-form');
    expect(providers).not.toContain('auth-password-form');
  });
});
```
`zonderToegestaneVerschillen` en `alleAuthenticators` zijn lokale helpers in het testbestand.

- [ ] **Step 2: Run** `npx vitest run deploy/keycloak/realm.test.ts` — Expected: FAIL (bestanden ontbreken).

- [ ] **Step 3: Maak de realm-bestanden.** Prod: client `gvprlg-app` confidential, standard flow
  aan, direct access grants uit, `pkce.code.challenge.method=S256`, redirect
  `https://spinnenweb.gvprlg.nl/api/auth/callback/keycloak`, post-logout redirect
  `https://spinnenweb.gvprlg.nl/*`, geen service-account; `smtpServer` met `host`, `port: "465"`,
  `ssl: "true"`, `auth: "true"`, `fromDisplayName: "GVPRLG Spinnenweb"`, zonder `user`/`password`/`from`
  (die zet Taak 12). Dev: localhost:3000-redirects, `secret: dev-gvprlg-app-secret`,
  `smtpServer` naar `mailpit:1025` zonder auth/ssl, from `noreply@gvprlg.test`, plus de drie
  testgebruikers (OTP-credential als `credentials: [{type: 'otp', secretData, credentialData}]`
  volgens het Keycloak 26-exportformaat — maak het formaat zeker door één gebruiker handmatig in
  de dev-Keycloak te maken en te exporteren met `kc.sh export --realm gvprlg --users realm_file`).

- [ ] **Step 4: Voeg services toe aan `docker-compose.dev.yml`:** `keycloak`
  (`quay.io/keycloak/keycloak:26.6.4@sha256:<digest>`, command
  `start-dev --import-realm --http-port=8080`, poort `8081:8080`, mount
  `./deploy/keycloak/realm-gvprlg.dev.json:/opt/keycloak/data/import/realm-gvprlg.json:ro`,
  `KC_BOOTSTRAP_ADMIN_USERNAME=admin`, `KC_BOOTSTRAP_ADMIN_PASSWORD=devadmin`) en `mailpit`
  (`axllent/mailpit:<versie>@sha256:<digest>`, poorten `1025:1025`, `8025:8025`). Digests ophalen
  met `docker buildx imagetools inspect`. Keycloak `KC_HOSTNAME=http://localhost:8081` zodat de
  issuer voor browser én app gelijk is.

- [ ] **Step 5: Verify.** `npx vitest run deploy/keycloak/realm.test.ts` → PASS.
  `docker compose -f docker-compose.dev.yml up -d keycloak mailpit` en
  `curl -s http://localhost:8081/realms/gvprlg/.well-known/openid-configuration` → JSON met
  `"issuer":"http://localhost:8081/realms/gvprlg"`. `curl -s http://localhost:8025/api/v1/info` → 200.

- [ ] **Step 6: Commit** `git commit -m "feat: add local Keycloak and Mailpit with gvprlg realm as code"`

---

### Task 2: Auth-configuratie uit env

**Files:**
- Create: `src/service/env.ts`, `src/service/env.test.ts`
- Modify: `.env.example`, `.env.test.example` (dev-waarden; secrets als pad naar
  `./secrets-dev/*` bestanden, map in `.gitignore`), `.gitignore`

**Interfaces:**
- Produces: `interface AuthEnv { keycloakIssuer: string; keycloakClientId: string; keycloakClientSecret: string; nextauthUrl: string; nextauthSecret: string; bootstrapBeheerderEmail: string; }`
  en `function leesAuthEnv(bron?: NodeJS.ProcessEnv): AuthEnv` (gooit `Error` met Engelse melding
  die de ontbrekende variabele noemt, nooit de waarde), plus `function authEnv(): AuthEnv`
  (per proces gecachte aanroep van `leesAuthEnv(process.env)`; dit gebruiken latere taken).

- [ ] **Step 1: Tests** in `env.test.ts`:
  `leest secrets uit *_FILE-bestanden` (tijdelijke bestanden met `\n` aan het eind → getrimd);
  `faalt met de naam van een ontbrekende variabele` (`toThrow(/KEYCLOAK_ISSUER/)`);
  `weigert een issuer die geen URL is`; `weigert http-issuer in productie`
  (`NODE_ENV=production`, `http://…` → throw; `https://…` → ok);
  `normaliseert BOOTSTRAP_BEHEERDER_EMAIL naar lowercase zonder spaties`;
  `noemt nooit de secretwaarde in de foutmelding` (leeg secret-bestand → melding bevat het pad,
  niet de inhoud).
- [ ] **Step 2: Run** `npx vitest run src/service/env.test.ts` → FAIL.
- [ ] **Step 3: Implement** `leesAuthEnv` met een Zod-schema over de ruwe variabelen
  `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET_FILE`, `NEXTAUTH_URL`,
  `NEXTAUTH_SECRET_FILE`, `BOOTSTRAP_BEHEERDER_EMAIL`; bestanden met `readFileSync` + `trim()`;
  leeg na trim = fout. Resultaat per proces cachen in een module-variabele achter een aparte
  `authEnv()`-getter.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat: validate auth configuration from env and secret files`

---

### Task 3: Datamodel `Gebruiker` + repositories

**Files:**
- Modify: `prisma/schema.prisma`; Create: migratie via `npx prisma migrate dev --name gebruiker`
- Create: `src/data/gebruikersRepository.ts`, `src/data/gebruikersRepository.test.ts`,
  `src/data/auditRepository.ts`, `src/data/auditRepository.test.ts`
- Modify: `src/data/metingenRepository.ts` (+ `heropenPlatform`), `src/data/metingenRepository.test.ts`

**Interfaces:**
- Schema:
```prisma
model Gebruiker {
  id           String    @id @default(cuid())
  email        String    @unique
  naam         String
  rol          String    // 'invuller' | 'beheerder'
  status       String    @default("uitgenodigd") // 'uitgenodigd' | 'actief' | 'ingetrokken'
  keycloakSub  String?   @unique
  aangemaakt   DateTime  @default(now())
  laatsteLogin DateTime?
  @@map("gebruikers")
}
```
- Produces (`gebruikersRepository.ts`), types `Rol = 'invuller' | 'beheerder'`,
  `GebruikerStatus = 'uitgenodigd' | 'actief' | 'ingetrokken'`, `GebruikerRecord` (= Prisma-rij met
  die unions):
  `vindGebruikerOpId(id: string): Promise<GebruikerRecord | null>`,
  `vindGebruikerOpSub(sub: string)`, `vindGebruikerOpEmail(email: string)`,
  `maakGebruiker(input: { email: string; naam: string; rol: Rol; status?: GebruikerStatus }): Promise<GebruikerRecord>`,
  `bindKeycloakSub(id: string, sub: string): Promise<GebruikerRecord>` (zet ook `status='actief'`, `laatsteLogin=now`),
  `registreerLogin(id: string): Promise<void>`,
  `wijzigGebruiker(id: string, wijziging: { rol?: Rol; status?: GebruikerStatus; keycloakSub?: null }): Promise<GebruikerRecord>`,
  `telActieveBeheerders(): Promise<number>`,
  `lijstGebruikersMetKoppelingen(jaar: number): Promise<Array<GebruikerRecord & { platformIds: string[] }>>`,
  `heeftKoppeling(gebruikerId: string, metingId: string, platformId: string): Promise<boolean>`,
  `zetKoppelingen(gebruikerId: string, metingId: string, platformIds: string[]): Promise<{ toegevoegd: string[]; verwijderd: string[] }>`.
- Produces (`auditRepository.ts`): `schrijfAudit(entry: { actor: string; actie: AuditActie; doelType: string; doelId: string; detail?: string }, tx?: Prisma.TransactionClient): Promise<void>`;
  `zoekAudit(filter: { jaar?: number; platformIds?: string[]; actor?: string; actie?: AuditActie; limiet: number }): Promise<AuditLogEntry[]>`.
  `AuditActie` = union van de spec-acties (`gebruiker_toegevoegd`, `eerste_login`, `ingelogd`,
  `uitgelogd`, `koppeling_toegevoegd`, `koppeling_verwijderd`, `rol_gewijzigd`,
  `toegang_ingetrokken`, `toegang_hersteld`, `toegang_geweigerd`, `platform_heropend`,
  `account_ontkoppeld`, `platform_opgeslagen_concept`, `platform_afgerond`).
  Audit van een platform krijgt `detail` met `platform=<id>;jaar=<jaar>` zodat `zoekAudit` erop
  filtert (bestaande `savePlatformScore` gebruikt al `platform=<id>`; breid uit met `;jaar=`).
- Produces (`metingenRepository.ts`): `heropenPlatform(input: { metingId: string; platformId: string; actor: string }): Promise<'heropend' | 'niet-definitief' | 'niet-gevonden'>` (status → `concept`, audit `platform_heropend` in dezelfde transactie).

- [ ] **Step 1: Tests** (DB-tests, patroon als `metingenRepository.test.ts` met `afterEach deleteMany`):
  `maakGebruiker slaat e-mail lowercase en getrimd op`; `bindKeycloakSub zet status actief en laatsteLogin`;
  `keycloakSub is uniek` (tweede bind met zelfde sub → reject);
  `zetKoppelingen voegt toe en verwijdert per meting, laat andere jaren ongemoeid`;
  `telActieveBeheerders telt alleen status actief`;
  `zoekAudit filtert op platform en jaar via detail`;
  `heropenPlatform zet definitief terug naar concept en schrijft audit`;
  `heropenPlatform geeft niet-definitief voor een concept`.
- [ ] **Step 2: Run** `npm run test:unit -- src/data` → FAIL.
- [ ] **Step 3: Schema + migratie** (`npx prisma migrate dev --name gebruiker`; controleer dat de
  gegenereerde SQL alleen `gebruikers` toevoegt). Normaliseren van e-mail gebeurt in de repository
  (`trim().toLowerCase()`) bij elke lees- en schrijffunctie op e-mail.
- [ ] **Step 4: Implement** de repository-functies; `zetKoppelingen` in één `$transaction`.
- [ ] **Step 5: Run** → PASS. **Step 6: Commit** `feat: add Gebruiker model with user and audit repositories`

---

### Task 4: Login-koppeling (token → gebruiker)

**Files:** Create `src/process/loginKoppeling.ts`, `src/process/loginKoppeling.test.ts`

**Interfaces:**
- Consumes: Task 3 repository-functies, `schrijfAudit`; Task 2 `authEnv().bootstrapBeheerderEmail`.
- Produces:
```ts
export const TokenClaimsSchema = z.object({ sub: z.string().min(1), email: z.string().email(), email_verified: z.literal(true), name: z.string().optional() });
export type LoginWeigering = 'claims-ongeldig' | 'onbekend' | 'ingetrokken' | 'sub-conflict';
export function koppelLogin(claims: unknown, bootstrapEmail: string): Promise<Result<GebruikerRecord, LoginWeigering>>;
```
  `Result<T, E> = { ok: true; data: T } | { ok: false; error: E }` — definieer in
  `src/service/result.ts` als die nog niet bestaat.

Algoritme (vastgelegd): claims parsen (fout → `claims-ongeldig`); e-mail normaliseren;
1) gebruiker op `sub` → gevonden: `ingetrokken` → weigering, anders `registreerLogin` + audit
`ingelogd`; 2) anders op e-mail → gevonden met `keycloakSub` ≠ null → `sub-conflict`; gevonden
`ingetrokken` → `ingetrokken`; anders `bindKeycloakSub` + audit `eerste_login`;
3) niet gevonden: e-mail == bootstrapEmail én `telActieveBeheerders() === 0` → `maakGebruiker`
(rol beheerder) + bind + audit `eerste_login` (detail `bootstrap`); anders `onbekend`.
Elke weigering schrijft audit `toegang_geweigerd` (actor = `sub` uit claims of `onbekend`,
detail = reden + e-mail).

- [ ] **Step 1: Tests:** `bindt de sub bij de eerste login op e-mail`;
  `normaliseert e-mail uit het token (hoofdletters, spaties)`; `weigert ongeverifieerde e-mail`
  (`email_verified: false` → `claims-ongeldig`); `weigert een onbekend e-mailadres`;
  `weigert een ingetrokken gebruiker`; `weigert e-mail die aan andere sub gebonden is`;
  `maakt de bootstrap-beheerder alleen als er nog geen actieve beheerder is`
  (tweede keer met andere sub en bestaande actieve beheerder → `onbekend`);
  `schrijft toegang_geweigerd bij elke weigering`.
- [ ] **Step 2: Run** `npx vitest run src/process/loginKoppeling.test.ts` → FAIL.
- [ ] **Step 3: Implement** `koppelLogin` (functies ≤ 40 regels: split per pad).
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat: map Keycloak identity to app users on login`

---

### Task 5: next-auth, inloggen, uitloggen, proxy

**Files:**
- Create: `src/integration/auth/authOptions.ts`, `src/integration/auth/authOptions.test.ts`,
  `app/api/auth/[...nextauth]/route.ts`, `app/api/auth/uitloggen/route.ts`,
  `app/inloggen/page.tsx`, `app/inloggen/doorsturen/page.tsx`, `app/geen-toegang/page.tsx`,
  `proxy.ts`, `proxy.test.ts`
- Modify: `package.json` (`next-auth: "4.24.15"` exact, `otpauth: "9.6.0"` dev), lockfile,
  `vitest.config.ts` (include `proxy.test.ts`)

**Interfaces:**
- Consumes: `authEnv()`, `koppelLogin`.
- Produces: `export const authOptions: NextAuthOptions`; `SESSIE_COOKIE_NAAM` =
  `__Secure-next-auth.session-token` in productie, `next-auth.session-token` anders (export uit
  `authOptions.ts`, gebruikt door `proxy.ts`); JWT/sessie bevat `gebruikerId: string`,
  `idToken: string` (alleen server-side; **niet** in het `session`-object naar de client).
  Module-augmentatie voor `next-auth` / `next-auth/jwt` in `src/integration/auth/next-auth.d.ts`.

Vastgelegd gedrag:
- `KeycloakProvider({ clientId, clientSecret, issuer, checks: ['pkce', 'state'] })`.
- `session: { strategy: 'jwt', maxAge: 28800 }`, `jwt: { maxAge: 28800 }`.
- `cookies.sessionToken.options = { httpOnly: true, sameSite: 'strict', path: '/', secure: <productie> }`.
  **State-, PKCE- en callbackUrl-cookies blijven op de next-auth-standaard (`lax`)** — anders
  ontbreken ze op de cross-site callback vanaf Keycloak.
- `pages: { signIn: '/inloggen', error: '/geen-toegang' }`.
- `callbacks.signIn`: `koppelLogin(profile, bootstrapEmail)`; weigering → `return '/geen-toegang'`.
- `callbacks.jwt`: bij `account` → `token.gebruikerId`, `token.idToken = account.id_token`.
- `callbacks.session`: alleen `gebruikerId`, naam, e-mail naar de client.
- `callbacks.redirect`: altijd naar `/inloggen/doorsturen?naar=<pad>` op de eigen origin
  (alleen relatieve paden; alles anders → `/`).
- `/inloggen/doorsturen` is een client-pagina die `window.location.replace(naar)` doet (pad
  opnieuw valideren: begint met `/`, niet met `//`). Reden: de eerste request na de cross-site
  redirect stuurt een Strict-cookie niet mee; een navigatie vanaf de eigen pagina wel.
- `/inloggen`: knop "Inloggen" → `signIn('keycloak', { callbackUrl })`; tekst over de
  authenticator-app. `/geen-toegang`: Nederlandse uitleg + contact beheerder, knop uitloggen.
- `GET /api/auth/uitloggen`: leest JWT via `getToken`, audit `uitgelogd`, wist sessiecookie,
  redirect naar `<issuer>/protocol/openid-connect/logout?id_token_hint=…&post_logout_redirect_uri=<NEXTAUTH_URL>/`.
- `proxy.ts`: matcher sluit uit `/_next`, `/favicon.ico`, `/api/healthz`, `/api/readyz`,
  `/api/auth/*`, `/inloggen*`, `/geen-toegang`. Zonder sessiecookie: pagina → redirect
  `/inloggen?callbackUrl=<pad>`, `/api/*` → 401 problem+json. Met cookie: door (validatie gebeurt
  in Taak 6).

- [ ] **Step 1: Tests** `authOptions.test.ts`: `sessiecookie is httpOnly en sameSite strict`;
  `state- en pkce-cookies zijn niet strict`; `redirect stuurt eigen paden via doorsturen`;
  `redirect weigert externe en protocol-relatieve URL's` (`https://evil.example`, `//evil.example` → `/inloggen/doorsturen?naar=%2F`);
  `signIn-callback stuurt een geweigerde login naar /geen-toegang` (mock `koppelLogin` via
  `vi.mock('@/src/process/loginKoppeling')` — integratiegrens);
  `session-callback geeft geen idToken door`.
  `proxy.test.ts`: `stuurt een pagina zonder cookie naar /inloggen met callbackUrl`;
  `geeft 401 problem+json op /api zonder cookie`; `laat /api/healthz door`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Handmatige rook-test:** `npm run dev`, open `http://localhost:3000` → redirect naar
  Keycloak-login, inloggen als `beheerder@test.local` met code uit
  `node -e "import('otpauth').then(o=>console.log(new o.TOTP({secret:'JBSWY3DPEHPK3PXP'}).generate()))"`
  → terug op `/` als ingelogd. (Volledige E2E volgt in Taak 11.)
- [ ] **Step 6: Commit** `feat: add Keycloak login with strict session cookie and RP-initiated logout`

---

### Task 6: Toegangscontrole in alle bestaande routes

**Files:**
- Create: `src/process/toegang.ts`, `src/process/toegang.test.ts`, `src/integration/auth/sessie.ts`
- Modify: `app/api/metingen/route.ts`, `app/api/metingen/[jaar]/route.ts`,
  `app/api/metingen/[jaar]/platformen/[platformId]/route.ts` en hun `route.test.ts`
- Delete: `src/integration/testUser.ts`

**Interfaces:**
- Produces (`toegang.ts`, puur, testbaar zonder HTTP):
  `type Weigering = { status: 401 | 403; reden: string }`;
  `vereisActief(g: GebruikerRecord | null): Result<GebruikerRecord, Weigering>`;
  `vereisRol(g: GebruikerRecord, rol: Rol): Result<GebruikerRecord, Weigering>`;
  `vereisPlatformSchrijfrecht(g: GebruikerRecord, metingId: string, platformId: string): Promise<Result<GebruikerRecord, Weigering>>`.
- Produces (`sessie.ts`): `vereisGebruiker(): Promise<{ ok: true; gebruiker: GebruikerRecord } | { ok: false; response: NextResponse }>`
  — `getServerSession(authOptions)` → `vindGebruikerOpId(gebruikerId)` → `vereisActief`;
  bij 403 audit `toegang_geweigerd`. Routes mocken **dit** module in tests
  (`vi.mock('@/src/integration/auth/sessie')`).

Vastgelegd: `POST /api/metingen` (meting aanmaken) alleen `beheerder`. `GET`-routes: elke actieve
gebruiker. `PUT …/platformen/[platformId]`: `vereisPlatformSchrijfrecht`; `laatstGewijzigdDoor`
= `gebruiker.id`; audit-detail krijgt `;jaar=<jaar>;email=<email>`.

- [ ] **Step 1: Tests** `toegang.test.ts`: `401 zonder gebruiker`;
  `geeft 403 voor een ingetrokken gebruiker met geldige sessie`; `403 voor uitgenodigd-status`;
  `invuller zonder koppeling krijgt 403`; `invuller met koppeling mag schrijven`;
  `beheerder mag elk platform schrijven`. Route-tests: elke bestaande test krijgt een gemockte
  actieve beheerder; nieuw per route: `geeft 401 zonder sessie`, en voor PUT
  `geeft 403 als invuller niet gekoppeld is` en `legt de echte gebruiker vast als laatstGewijzigdDoor`;
  voor `POST /api/metingen` `geeft 403 voor een invuller`.
- [ ] **Step 2: Run** `npm run test:unit` → nieuwe tests FAIL.
- [ ] **Step 3: Implement**; verwijder `testUser.ts`; `git grep TEST_USER_ID` → geen treffers.
- [ ] **Step 4: Run** `npm run test:unit && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `feat: enforce session, status and platform write access on all routes`

---

### Task 7: Heropenen door beheerder

**Files:**
- Create: `app/api/metingen/[jaar]/platformen/[platformId]/heropenen/route.ts` + `route.test.ts`
- Modify: `api/specs/gvprlg.yaml` (de UI-knop "Heropenen" volgt in Taak 9)

**Interfaces:** Consumes `vereisGebruiker`, `vereisRol`, `heropenPlatform`. Produces
`POST …/heropenen` → 200 `{ ok: true }`; 403 voor invuller; 404 onbekend platform/meting;
409 `Platform is niet definitief`.

- [ ] **Step 1: Tests:** `heropent een definitief platform als beheerder`, `403 voor invuller`,
  `409 voor een concept`, `401 zonder sessie`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (+ OpenAPI). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: let administrators reopen a finalised platform`

---

### Task 8: Beheer- en audit-API

**Files:**
- Create: `src/process/beheerWorkflow.ts` + test, `src/integration/beheerSchemas.ts` + test,
  `app/api/beheer/gebruikers/route.ts`, `app/api/beheer/gebruikers/[id]/route.ts`,
  `app/api/beheer/gebruikers/[id]/koppelingen/route.ts`, `app/api/audit/route.ts`,
  `app/api/ik/route.ts`, met `route.test.ts` per route
- Modify: `api/specs/gvprlg.yaml`

**Interfaces:**
- Zod (`beheerSchemas.ts`):
  `VoorzitterToevoegenSchema = { email: z.string().trim().toLowerCase().email().max(254), naam: z.string().trim().min(1).max(200), rol: z.enum(['invuller','beheerder']), jaar: z.number().int().min(2020).max(2100), platformIds: z.array(z.string()).max(<aantal platformen>) }` met refine dat elk `platformId` in `CONFIG.platformen` bestaat;
  `GebruikerWijzigenSchema = z.discriminatedUnion('actie', [{actie:'rol', rol}, {actie:'intrekken'}, {actie:'herstellen'}, {actie:'ontkoppelAccount'}])`;
  `KoppelingenSchema = { jaar, platformIds }`; `AuditFilterSchema` (query: `jaar?`, `platformId?`, `actor?`, `actie?`, `limiet` 1–500 default 200).
- `beheerWorkflow.ts`:
  `voegVoorzitterToe(actor: GebruikerRecord, input): Promise<Result<GebruikerRecord, 'bestaat-al' | 'meting-onbekend'>>`;
  `wijzigGebruikerDoorBeheerder(actor, doelId, wijziging): Promise<Result<GebruikerRecord, 'niet-gevonden' | 'zelfbescherming' | 'laatste-beheerder'>>`;
  `zetKoppelingenDoorBeheerder(actor, doelId, jaar, platformIds): Promise<Result<void, 'niet-gevonden' | 'meting-onbekend'>>`.
  Audit per actie (`gebruiker_toegevoegd`, `rol_gewijzigd`, `toegang_ingetrokken`,
  `toegang_hersteld`, `account_ontkoppeld`, `koppeling_toegevoegd`/`_verwijderd` per platform).
- Routes: `GET/POST /api/beheer/gebruikers?jaar=`, `PATCH /api/beheer/gebruikers/[id]`,
  `PUT /api/beheer/gebruikers/[id]/koppelingen` — alle `beheerder`; `GET /api/audit` — beheerder
  alles, invuller alleen regels van platformen waaraan hij in enig jaar gekoppeld is
  (`zoekAudit` met `platformIds`); `GET /api/ik` → `{ id, naam, email, rol }` voor elke actieve gebruiker.
  Foutmapping: `bestaat-al`/`laatste-beheerder`/`zelfbescherming` → 409, `niet-gevonden`/`meting-onbekend` → 404.

- [ ] **Step 1: Tests** `beheerWorkflow.test.ts`: `voegt voorzitter toe met koppelingen en audit`;
  `weigert een bestaand e-mailadres (ongeacht hoofdletters)`;
  `weigert dat een beheerder zichzelf degradeert of intrekt`;
  `weigert het degraderen van de laatste beheerder`; `weigert het intrekken van de laatste beheerder`;
  `ontkoppelt keycloakSub zodat de volgende login opnieuw bindt`;
  `zetKoppelingen schrijft audit per toegevoegd en verwijderd platform`.
  `beheerSchemas.test.ts`: `normaliseert e-mail`, `weigert onbekend platform`, `weigert limiet 0 en 501`.
  Route-tests: per route 1 happy + `403 voor invuller` (+ `401 zonder sessie` voor `/api/ik`);
  `GET /api/audit` `invuller ziet geen regels van andere platformen`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (+ OpenAPI). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: add user administration and audit API`

---

### Task 9: Beheer-UI en gebruikersmenu

**Files:**
- Create: `app/beheer/page.tsx`, `app/beheer/audit/page.tsx`, `src/ui/components/GebruikerMenu.tsx`
- Modify: `app/metingen/[jaar]/[platformId]/resultaat/page.tsx` (knop "Heropenen" → `POST …/heropenen`,
  alleen getoond als `/api/ik` rol `beheerder` geeft en het platform `definitief` is),
  `app/layout.tsx` (menu in header), `src/ui/components/_kruimelpad.ts` + test
  (`/beheer` → "Beheer", `/beheer/audit` → "Beheer › Audit"), `app/components.css`

**Interfaces:** Consumes de API's uit Taak 7–8. UI bevat geen bedrijfslogica en geen rolcontrole
als beveiliging (alleen verbergen; server dwingt af).

Vastgelegd: `/beheer` toont de tabel uit spec §7 voor een gekozen meetjaar (default: hoogste
jaar), formulier "Voorzitter toevoegen" met platform-checkboxes, acties Koppelingen / Rol wijzigen /
Toegang intrekken|herstellen / Keycloak-account ontkoppelen (met bevestiging). Bovenaan een vaste
uitlegregel: "Maak het account eerst aan in de Keycloak-console (realm gvprlg) en verstuur daar de
uitnodiging." Foutmeldingen uit problem+json `detail` tonen. `GebruikerMenu`: naam, link "Beheer"
als `rol === 'beheerder'` (uit `/api/ik`), link "Uitloggen" naar `/api/auth/uitloggen`.

- [ ] **Step 1: Test** `_kruimelpad.test.ts`: twee nieuwe gevallen voor `/beheer` en `/beheer/audit`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `npm run build` slaagt.
- [ ] **Step 5: Commit** `feat: add administration and audit pages`

---

### Task 10: Seed-script, productie-compose, documentatie

**Files:**
- Create: `scripts/seed-voorbeeldwaardes-2026.ts`; Delete: `scripts/seed-voorbeeldwaardes-2026.mjs`
- Modify: `docker-compose.yml`, `app-entrypoint.sh`, `.env.example`, `README.md`, `.dockerignore`
  (secrets-dev uitsluiten)

Vastgelegd:
- Seed: zelfde `VOORBEELDEN`-data, maar schrijft via `savePlatformScore` met
  `laatstGewijzigdDoor: 'seed-voorbeelddata'`; draait met `npx tsx --env-file=.env scripts/seed-voorbeeldwaardes-2026.ts`
  (`tsx` als exact gepinde devDependency, MIT — Node's eigen type-stripping kan de bestaande
  extensieloze relatieve imports in `src/` niet resolven). Weigert te draaien als
  `NODE_ENV=production`. Voeg `tsx` toe aan de licentietabel.
- Compose `app`: env `KEYCLOAK_ISSUER=https://<keycloak-host>/realms/gvprlg`,
  `KEYCLOAK_CLIENT_ID=gvprlg-app`, `KEYCLOAK_CLIENT_SECRET_FILE=/run/secrets/keycloak_client_secret`,
  `NEXTAUTH_URL=https://spinnenweb.gvprlg.nl`, `NEXTAUTH_SECRET_FILE=/run/secrets/nextauth_secret`,
  `BOOTSTRAP_BEHEERDER_EMAIL` (waarde uit `.env` op de server, niet gecommit); secrets
  `keycloak_client_secret`, `nextauth_secret` als `file: ./secrets/...`. **Netwerken ongewijzigd**
  (`gvprlg-internal`, proxy-netwerk) — controleer dat er geen netwerk bijkomt.
- README: (a) runbook "Nieuwe voorzitter" (Keycloak-console: gebruiker, e-mail, email verified,
  required action Configure OTP, Send email; daarna `/beheer`), "Authenticator kwijt",
  "Toegang intrekken" (app + Keycloak uitschakelen), "Keycloak-account opnieuw aangemaakt"
  (ontkoppelen in `/beheer`); (b) eerste-installatie: realm-import, client-secret genereren en in
  `secrets/` zetten, `openssl rand -hex 32 > secrets/nextauth_secret`; (c) mail-sectie met beide
  stappen uit spec §9 inclusief exacte DNS-records; (d) licentietabel: + next-auth 4.24.15 ISC,
  otpauth 9.6.0 MIT (dev), Keycloak 26.6.4 Apache-2.0, Mailpit <versie> MIT (dev).

- [ ] **Step 1:** Seed-script herschrijven; draai het tegen de dev-DB → output meldt de
  aangemaakte platformen; tweede run is idempotent of meldt dat platformen definitief zijn.
- [ ] **Step 2:** Compose/entrypoint/README bijwerken; `docker compose config` → geen fouten,
  `docker compose config | Select-String 'networks:' -Context 0,3` toont alleen de twee netwerken.
- [ ] **Step 3:** `docker compose build app` slaagt.
- [ ] **Step 4: Commit** `chore: wire auth secrets into production compose and document runbooks`

---

### Task 11: E2E — echte Keycloak-flow

**Files:**
- Create: `tests/auth-helpers.js` (`login(page, email)`: vult e-mail, genereert TOTP met
  `otpauth` uit seed `JBSWY3DPEHPK3PXP`, wacht tot `GebruikerMenu` zichtbaar is;
  `mailpitLaatsteLink(request, aan)`), `tests/gvprlg-fase-b-auth.spec.js`
- Modify: `playwright.config.js` (project `backend-fase-b`, baseURL `http://localhost:3000`;
  fase-A-projecten loggen eerst in via de helper), `tests/gvprlg-backend-fase-a.spec.js`,
  `tests/gvprlg-spinnenweb.spec.js`, `tests/e2e-global-setup.ts` (koppelingen en
  `invuller@test.local`-Gebruiker klaarzetten; `invuller2` resetten)

Journeys (testnamen vastgelegd):
1. `toont na inloggen direct de naam van de gebruiker` (geen tweede loginprompt, geen lus).
2. `uitloggen vraagt bij opnieuw inloggen weer om een code`.
3. `invuller wijzigt eigen platform en krijgt 403 op een ander platform`.
4. `invuller ziet concepten van andere platformen`.
5. `nieuwe voorzitter: uitnodiging via Mailpit, QR koppelen, eerste login bindt account`
   (testsetup triggert de uitnodiging voor `invuller2@test.local` via de **dev**-Keycloak
   admin-API met `admin/devadmin` — alleen in de test, nooit in de app; QR-pagina: lees het
   secret uit de "Unable to scan?"-weergave, genereer de code).
6. `e-mail zonder app-gebruiker ziet Geen toegang`.
7. `ingetrokken gebruiker wordt bij de volgende actie geweigerd` (beheerder trekt in in context B,
   context A krijgt bij opslaan een foutmelding).
8. `beheerder heropent een definitief platform`.

- [ ] **Step 1:** Infra starten: `docker compose -f docker-compose.dev.yml up -d`,
  `npx prisma migrate deploy`, `npm run dev` (achtergrond).
- [ ] **Step 2:** Schrijf de journeys; **Step 3:** `npx playwright test --project=backend-fase-b`
  → eerst FAIL waar functionaliteit nog ontbreekt; repareer selectors/seed tot PASS.
- [ ] **Step 4:** Volledige suite: `npm run test:unit && npm run typecheck && npx playwright test`
  → alles PASS. Output bewaren als bewijs.
- [ ] **Step 5:** Infra stoppen (`docker compose -f docker-compose.dev.yml stop`) of de staat
  documenteren.
- [ ] **Step 6: Commit** `test: cover Keycloak TOTP login, access control and administration end-to-end`

---

### Task 12: VPS-001 — mox-account en realm `gvprlg` (testroute)

**Alleen met expliciet akkoord van de gebruiker per stap.** Elke stap: huidige staat tonen →
voorstel oud→nieuw → akkoord → uitvoeren → verifiëren. SSH via
`C:/Windows/System32/OpenSSH/ssh.exe <beheerder>@<VPN-adres VPS>` (Windows-agent-sleutel).
Geen wijzigingen aan de bestaande realms, de reverse proxy, firewall of netwerken.

- [ ] **Step 1 (alleen-lezen):** vaststellen en rapporteren: publieke mox-hostnaam voor SMTPS en
  zijn certificaatnaam; of de Keycloak-container uitgaand `<mox-host>:465` kan bereiken
  (`docker exec <keycloak-container> bash -c 'timeout 5 bash -c "</dev/tcp/<host>/465"'`); bestaat realm
  `gvprlg` nog niet (query uit de eerdere sessie). Blokkeert iets: stoppen en melden.
- [ ] **Step 2 (akkoord):** mox-account `gvprlg-noreply` op het testmaildomein aanmaken volgens het
  bestaande accountpatroon; wachtwoord in `<compose-map>/secrets/` (root, 0600). Rollback: account
  verwijderen.
- [ ] **Step 3 (akkoord):** realm importeren uit `deploy/keycloak/realm-gvprlg.json` (via Admin
  Console over het beheer-VPN of `kc.sh import`); SMTP-user/-password/from instellen; client-secret laten
  genereren en in `<compose-map>/secrets/keycloak_client_secret` zetten. Rollback: realm `gvprlg`
  verwijderen.
- [ ] **Step 4 (akkoord):** testgebruiker met een eigen mailbox van de gebruiker (M365 én Gmail)
  aanmaken, "Send email" (Configure OTP). Verifiëren: mail komt aan, headers `spf=pass`,
  `dkim=pass`, `dmarc=pass`; QR-koppeling lukt in de Keycloak-accountflow.
- [ ] **Step 5:** Verslag in `docs/superpowers/verslagen/2026-11-xx-fase-b-mailroute.md`
  (wat gedaan, bewijs, rollback-pad, open: DNS-stap 2 en login-domein). Commit
  `docs: record fase B mail route verification on VPS-001`.

**Stap 2 van de mailroute** (`noreply@spinnenweb.gvprlg.nl`) start pas als de gebruiker meldt dat
de DNS-records uit spec §9 staan; dat is een aparte, kleine vervolgtaak met dezelfde
akkoord-per-stap-werkwijze.
