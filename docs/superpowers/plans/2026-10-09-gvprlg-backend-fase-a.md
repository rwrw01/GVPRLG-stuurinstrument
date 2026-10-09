# GVPRLG Backend Fase A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vervang de localStorage-gebaseerde GVPRLG-app door een Next.js/TypeScript/Prisma-backend
met een echte Postgres-database, zonder nog authenticatie te bouwen (vaste test-gebruiker) —
zodat de functionele kern (meting aanmaken, platform invullen inclusief opmerking per vraag en
algemene toelichting, afronden, resultaat bekijken) end-to-end werkt en getest is.

**Architecture:** Next.js 16 (App Router, TypeScript strict) binnen de bestaande `gvprlg`-repo,
naast (niet in plaats van) de huidige statische site — er verandert niets aan de live GitHub
Pages-site totdat fase D die uitfaseert. Common Ground 5-laags-structuur onder `src/`
(`ui`/`process`/`integration`/`service`/`data`), Prisma + lokale Postgres-container voor
development, Zod op alle API-grenzen, RFC 9457 `application/problem+json` voor API-fouten.

**Tech Stack:** Next.js 16.4.0, TypeScript 7.0.2 (strict), Prisma 7.10.0 + `@prisma/client`
7.10.0, Zod 4.6.5, Vitest 5.0.3 (unit/integratie-tests service+data-laag), bestaande
`@playwright/test` 1.58.2 (E2E), Postgres 16-alpine (lokale dev-container).

**Spec:** `docs/superpowers/specs/2026-10-09-backend-migratie-vps001-design.md` — dit plan
implementeert alleen Fase A uit §10 van die spec (backend + datamodel, zonder auth). Fase B
(Keycloak/OTP), Fase C (oefenomgeving) en Fase D (deployment) krijgen elk hun eigen plan zodra
Fase A is opgeleverd.

## Global Constraints

- TypeScript `strict: true`, geen `any` (globale regel 03-code-organization.md).
- ESM/modules only in nieuwe code; geen `require()` in nieuwe bestanden.
- Zod-schema voor elke externe input (API-request-bodies) — schema vóór handler.
- RFC 9457 `application/problem+json` voor elke API-foutrespons.
- Exacte versie-pinning (`save-exact=true`), lockfile altijd gecommit.
- Common Ground 5-laags-structuur: `src/ui` → `src/process` → `src/integration` → `src/service`
  → `src/data`, uitsluitend downward imports, nooit een laag overslaan.
- Max 300 regels per bestand, max 40 regels per functie.
- Geen secrets in code: `DATABASE_URL` uitsluitend via env var (`.env.local`, nooit gecommit;
  `.env.example` met dummy-waarden wel gecommit).
- Data-laag wordt getest tegen een echte Postgres-instance, niet gemockt (globale regel
  05-quality-gates.md: "Never mock within Service layer" geldt analoog voor de Data-laag hier).

## Review Focus

1. **Score buiten bereik 1-5 of niet-geheel getal** bij het opslaan van een vraag-score — Zod
   moet dit met 400 afwijzen, niet silent afronden of accepteren (Task 6/7).
2. **Niet alle vragen ingevuld bij "afronden"** — moet 422 geven met een leesbare Nederlandse
   foutmelding die de ontbrekende vraag-id's noemt, niet alsnog als definitief opslaan (Task 5/7).
3. **Onbekend platform-id** in de URL — moet 404 geven, nooit een crash of een leeg-maar-200
   antwoord (Task 7).
4. **Dubbele meting voor hetzelfde jaar aanmaken** — moet 409 geven, nooit een duplicaat of een
   silent overwrite van de bestaande meting (Task 7).
5. **Opmerking/algemene toelichting met HTML/script-inhoud** (`<script>alert(1)</script>`) —
   moet veilig weergegeven worden zonder uitvoering; React's JSX-auto-escaping dekt dit
   structureel, maar de E2E-test moet dit expliciet vastleggen zodat een toekomstige
   `dangerouslySetInnerHTML` dit niet stilletjes doorbreekt (Task 10).

---

## Buiten scope van dit plan (expliciet, YAGNI)

- Organisatie-dashboard, NDS-radardiagrammen, jaarvergelijking — aggregatie over meerdere
  platformen. Dit raakt niet de kern-flow (één platform invullen/afronden) en krijgt een eigen
  vervolgplan zodra Fase A staat.
- Autosave per veld (genoemd in de spec §5) — Fase A gebruikt dezelfde expliciete
  "Opslaan als concept"/"Afronden"-knoppen als de huidige statische app. Autosave is een UX-
  verbetering, geen blokkade voor "de functionele kern werkt", en wordt apart opgepakt.
- Authenticatie, rollen, uitnodigingen — Fase B. Fase A gebruikt een vaste, hardcoded
  test-gebruiker (`src/integration/testUser.ts`).
- Alles wat met deployment, Docker, Traefik, DNS of CI/CD te maken heeft — Fase D.

---

### Task 1: Project scaffold — Next.js, TypeScript, exacte versie-pinning

**Files:**
- Modify: `package.json`
- Create: `.npmrc`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `.env.example`
- Create: `.gitignore` (uitbreiden, niet vervangen)
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

**Interfaces:**
- Produces: een werkend `npm run dev` op poort 3000 met een lege homepage; dit is de basis
  waarop elke volgende taak bouwt.

- [ ] **Step 1: `.npmrc` met exacte pinning**

```ini
save-exact=true
```

- [ ] **Step 2: `package.json` bijwerken — bestaande deps exact pinnen, nieuwe deps toevoegen**

```json
{
  "name": "gvprlg",
  "version": "1.0.0",
  "description": "GVPRLG volwassenheidsmeting",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate"
  },
  "license": "EUPL-1.2",
  "devDependencies": {
    "@playwright/test": "1.58.2",
    "@types/node": "24.0.0",
    "@types/react": "19.0.0",
    "@types/react-dom": "19.0.0",
    "prisma": "7.10.0",
    "serve": "14.2.6",
    "typescript": "7.0.2",
    "vitest": "5.0.3"
  },
  "dependencies": {
    "@prisma/client": "7.10.0",
    "next": "16.4.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "xlsx": "0.18.5",
    "zod": "4.6.5"
  }
}
```

Let op: `"type": "commonjs"` blijft staan — Next.js' eigen build-pijplijn werkt hier onafhankelijk
van en `playwright.config.js`/`tests/*.spec.js` blijven ongewijzigd werken. Niet wijzigen zonder
expliciete reden.

- [ ] **Step 3: Installeren en lockfile controleren**

Run: `cd /c/dev/gvprlg && npm install`
Expected: installatie slaagt, `package-lock.json` bevat exacte versies (geen `^`-ranges) voor de
nieuw toegevoegde packages.

- [ ] **Step 4: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "varianten", "js"]
}
```

- [ ] **Step 5: `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 6: `.env.example`**

```
DATABASE_URL="postgresql://gvprlg:devpassword@localhost:5433/gvprlg"
```

- [ ] **Step 7: `.gitignore` uitbreiden**

Voeg toe aan het bestaande `.gitignore` (niet overschrijven):

```
# Next.js / Node
.next/
node_modules/
.env.local
next-env.d.ts

# Prisma
prisma/dev.db
```

- [ ] **Step 8: `app/globals.css` — hergebruik bestaande huisstijl**

Kopieer de volledige inhoud van `css/style.css` naar `app/globals.css` (ongewijzigd — dezelfde
klassen, `.question-row`, `.question-toelichting`, `.score-option`, etc. worden in Fase A
hergebruikt door de React-componenten).

Run: `cp css/style.css app/globals.css`

- [ ] **Step 9: `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Volwassenheidsmeting GVPRLG',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <header>
          <h1>Volwassenheidsmeting PinkRoccade Local Government</h1>
          <p className="subtitle">Gebruikersvereniging PinkRoccade LG</p>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 10: `app/page.tsx` — placeholder homepage**

```tsx
export default function HomePage() {
  return <p>GVPRLG backend — fase A in opbouw.</p>;
}
```

- [ ] **Step 11: Verifiëren dat de dev-server draait**

Run: `npm run dev` (in de achtergrond starten, dan testen, dan stoppen)
Test: `curl -s http://localhost:3000 | grep -c "fase A in opbouw"`
Expected: `1`

- [ ] **Step 12: Typecheck**

Run: `npm run typecheck`
Expected: exit 0, geen fouten.

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json .npmrc tsconfig.json next.config.ts .env.example .gitignore app/
git commit -m "feat: scaffold Next.js/TypeScript backend alongside the static site"
```

---

### Task 2: Prisma-schema en lokale Postgres voor development

**Files:**
- Create: `prisma/schema.prisma`
- Create: `docker-compose.dev.yml`
- Create: `src/data/prismaClient.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` env var uit `.env.local` (Task 1, Step 6 geeft het voorbeeld).
- Produces: `prisma.meting`, `prisma.platformScore`, `prisma.vraagScore`,
  `prisma.platformInvuller`, `prisma.auditLogEntry` — de Prisma-client die Task 4 gebruikt.

- [ ] **Step 1: `docker-compose.dev.yml` — alleen Postgres, uitsluitend voor lokale ontwikkeling**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: gvprlg-dev-postgres
    environment:
      POSTGRES_USER: gvprlg
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: gvprlg
    ports:
      - "5433:5432"
    volumes:
      - gvprlg-dev-pgdata:/var/lib/postgresql/data

volumes:
  gvprlg-dev-pgdata:
```

- [ ] **Step 2: Postgres starten**

Run: `docker compose -f docker-compose.dev.yml up -d`
Expected: container `gvprlg-dev-postgres` draait (`docker ps` toont `healthy`/`Up`).

- [ ] **Step 3: `.env.local` aanmaken (niet gecommit)**

Run: `cp .env.example .env.local`

- [ ] **Step 4: `prisma/schema.prisma`**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Meting {
  id         String          @id @default(cuid())
  jaar       Int             @unique
  aangemaakt DateTime        @default(now())
  isOefening Boolean         @default(false)
  platformen PlatformScore[]

  @@map("metingen")
}

model PlatformScore {
  id                  String       @id @default(cuid())
  metingId            String
  meting              Meting       @relation(fields: [metingId], references: [id], onDelete: Cascade)
  platformId          String
  status              String       @default("concept")
  algemeneToelichting String       @default("")
  laatstGewijzigdDoor String
  laatstGewijzigdOp   DateTime     @default(now())
  vraagScores         VraagScore[]

  @@unique([metingId, platformId])
  @@map("platform_scores")
}

model VraagScore {
  id              String        @id @default(cuid())
  platformScoreId String
  platformScore   PlatformScore @relation(fields: [platformScoreId], references: [id], onDelete: Cascade)
  vraagId         String
  score           Int?
  toelichting     String        @default("")

  @@unique([platformScoreId, vraagId])
  @@map("vraag_scores")
}

model PlatformInvuller {
  id         String @id @default(cuid())
  metingId   String
  platformId String
  gebruiker  String

  @@unique([metingId, platformId, gebruiker])
  @@map("platform_invullers")
}

model AuditLogEntry {
  id       String   @id @default(cuid())
  actor    String
  actie    String
  doelType String
  doelId   String
  tijdstip DateTime @default(now())
  detail   String   @default("")

  @@map("audit_log")
}
```

`PlatformInvuller` en `AuditLogEntry` worden in dit plan al aangemaakt (schema-compleet volgens
de spec), maar `PlatformInvuller` wordt in Fase A nog niet gebruikt om toegang te beperken (dat
is Fase B) — hier alleen het schema, zodat Fase B geen migratie meer nodig heeft voor dit stuk.

- [ ] **Step 5: Migratie draaien**

Run: `npx prisma migrate dev --name init`
Expected: migratie slaagt, `prisma/migrations/`-map met een eerste migratie wordt aangemaakt.

- [ ] **Step 6: `src/data/prismaClient.ts`**

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 7: Verifiëren met een smoke-query**

Run: `node -e "require('@prisma/client'); const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.meting.count().then(n=>{console.log('OK',n); process.exit(0)}).catch(e=>{console.error(e); process.exit(1)})"`
Expected: `OK 0`

- [ ] **Step 8: Commit**

```bash
git add prisma/ docker-compose.dev.yml src/data/prismaClient.ts
git commit -m "feat: add Prisma schema and local dev Postgres"
```

(De `gvprlg-dev-postgres`-container blijft draaien voor de volgende taken; bij het einde van de
sessie: `docker compose -f docker-compose.dev.yml down` als je lokaal klaar bent, of laten
draaien als je in dezelfde sessie doorwerkt aan Task 4+.)

---

### Task 3: Service-laag — config en scoreberekeningen (TDD)

**Files:**
- Create: `src/service/config.ts`
- Create: `src/service/config.test.ts`
- Create: `src/service/scores.ts`
- Create: `src/service/scores.test.ts`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `CONFIG: { platformen, assen, ndsThemas, schaal }`, `getNdsVragen()`,
  `berekenGemiddeldePerAs(platformData: PlatformScoresByAs): Record<string, number | null>`,
  `berekenTotaalGemiddelde(platformData: PlatformScoresByAs): number | null`. Task 4, 5 en 7
  importeren deze exacte namen en types uit `src/service/config.ts` en `src/service/scores.ts`.

- [ ] **Step 1: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 2: Schrijf de falende test voor `config.ts`**

`src/service/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CONFIG, getNdsVragen } from './config';

describe('CONFIG', () => {
  it('bevat 5 platformen inclusief de gesplitste R&O', () => {
    const ids = CONFIG.platformen.map((p) => p.id);
    expect(ids).toEqual(['belastingen', 'ro', 'burgerzaken', 'sociaal-domein', 'informatievoorziening']);
  });

  it('heeft een CMMI-schaal van 1 (Initial) tot 5 (Optimizing)', () => {
    expect(CONFIG.schaal[0]).toEqual({ waarde: 1, label: 'Initial', beschrijving: 'Ad-hoc, geen gestructureerde aanpak' });
    expect(CONFIG.schaal[4].label).toBe('Optimizing');
  });

  it('proces-as heeft 8 vragen inclusief de twee "partner van betekenis"-vragen', () => {
    const proces = CONFIG.assen.find((a) => a.id === 'proces');
    expect(proces?.vragen).toHaveLength(8);
    expect(proces?.vragen.map((v) => v.id)).toContain('partner-productontwikkeling');
    expect(proces?.vragen.map((v) => v.id)).toContain('partner-dienstverlening');
  });
});

describe('getNdsVragen', () => {
  it('verzamelt alle vragen met een nds-tag over alle assen', () => {
    const ndsVragen = getNdsVragen();
    expect(ndsVragen.length).toBeGreaterThan(0);
    expect(ndsVragen.every((v) => typeof v.nds === 'string')).toBe(true);
  });
});
```

- [ ] **Step 3: Run test, verwacht falen**

Run: `npx vitest run src/service/config.test.ts`
Expected: FAIL — `Cannot find module './config'`.

- [ ] **Step 4: Implementeer `src/service/config.ts` — 1-op-1 poort van `js/config.js`**

```ts
export interface Vraag {
  id: string;
  tekst: string;
  nds?: string;
}

export interface As {
  id: string;
  naam: string;
  kleur: string;
  vragen: Vraag[];
}

export interface Platform {
  id: string;
  naam: string;
}

export interface SchaalNiveau {
  waarde: number;
  label: string;
  beschrijving: string;
}

export interface NdsThema {
  id: string;
  kleur: string;
}

export const CONFIG: {
  platformen: Platform[];
  assen: As[];
  ndsThemas: NdsThema[];
  schaal: SchaalNiveau[];
} = {
  platformen: [
    { id: 'belastingen', naam: 'Belastingen' },
    { id: 'ro', naam: 'R&O' },
    { id: 'burgerzaken', naam: 'Burgerzaken' },
    { id: 'sociaal-domein', naam: 'Sociaal Domein' },
    { id: 'informatievoorziening', naam: 'Informatievoorziening' },
  ],
  assen: [
    {
      id: 'techniek',
      naam: 'Techniek',
      kleur: '#3786D2',
      vragen: [
        { id: 'common-ground-standaarden', tekst: 'De producten voldoen aan Common Ground-principes en open standaarden (API-first, ZGW-API\'s, iConnect, scheiding data/logica)', nds: 'Open' },
        { id: 'cloud-data', tekst: 'De producten zijn volwaardige SaaS-oplossingen met datagedreven werken: data via API\'s beschikbaar voor analyse en veilig deelbaar over overheidslagen', nds: 'Cloud' },
        { id: 'ai-integratie', tekst: 'AI is concreet en bruikbaar onderdeel van de productportfolio (werkende functionaliteit, niet alleen visie) en hierover zijn risicoanalyses uitgevoerd en een AI-act assessment van beschikbaar', nds: 'AI' },
        { id: 'digitale-weerbaarheid', tekst: 'De producten voldoen aan actuele security-eisen (BIO, NIS2, pentesting) en verminderen leveranciersafhankelijkheid', nds: 'Digitale weerbaarheid en autonomie' },
      ],
    },
    {
      id: 'mens',
      naam: 'Mens',
      kleur: '#15803D',
      vragen: [
        { id: 'capaciteit-kennis', tekst: 'De personele capaciteit (aantal en kennisniveau) is op orde om producten te ondersteunen en door te ontwikkelen en heeft een meerjaars forecast' },
        { id: 'digitaal-vakmanschap', tekst: 'PinkRoccade investeert aantoonbaar in kennisontwikkeling (nieuwe technologieën, AI, Common Ground) en ondersteunt gemeenten hierbij', nds: 'Digitaal vakmanschap' },
        { id: 'klantbetrokkenheid', tekst: 'Gebruikers worden structureel betrokken bij doorontwikkeling (co-creatie, klankbordgroepen, roadmap-invloed) en de betrokkenheid wordt op kwaliteit en kwantiteit periodiek geëvalueerd' },
        { id: 'opleiding-continuiteit', tekst: 'Training, documentatie en support zijn op orde; kennisborging is geborgd en niet afhankelijk van individuen' },
      ],
    },
    {
      id: 'proces',
      naam: 'Proces',
      kleur: '#C2410C',
      vragen: [
        { id: 'dienstverlening-nps', tekst: 'De dienstverlening is uniform tussen businessunits; NPS en klanttevredenheid worden structureel gemeten en vertaald naar verbeteracties en gepubliceerd' },
        { id: 'release-incident', tekst: 'Releases zijn voorspelbaar en goed gecommuniceerd; incidenten worden snel en transparant conform SLA afgehandeld' },
        { id: 'roadmap-transparantie', tekst: 'De productroadmap is transparant, realistisch en sluit aan bij NDS-prioriteiten en gemeentelijke behoeften' },
        { id: 'burgers-ondernemers-centraal', tekst: 'De producten stellen gemeenten in staat burgers en ondernemers als één overheid te bedienen met geïntegreerde digitale dienstverlening', nds: 'Burgers en ondernemers centraal' },
        { id: 'prijsbeleid', tekst: 'Prijsbeleid (inclusief offertes) is uitlegbaar en marktconform en hanteert een voorspelbaar proces' },
        { id: 'lifecyclemanagement', tekst: 'Lifecyclemanagement volgt de afspraken van de uitvloeiingsregeling' },
        { id: 'partner-productontwikkeling', tekst: 'PinkRoccade is een partner van betekenis: de productontwikkeling sluit voldoende aan bij de wensen en eisen die vanuit de markt (gemeenten) worden gesteld' },
        { id: 'partner-dienstverlening', tekst: 'PinkRoccade is een partner van betekenis: de dienstverlening sluit voldoende aan bij de wensen en eisen die vanuit de markt (gemeenten) worden gesteld' },
      ],
    },
  ],
  ndsThemas: [
    { id: 'Open', kleur: '#6366F1' },
    { id: 'Cloud', kleur: '#3786D2' },
    { id: 'AI', kleur: '#E2007A' },
    { id: 'Burgers en ondernemers centraal', kleur: '#15803D' },
    { id: 'Digitale weerbaarheid en autonomie', kleur: '#000041' },
    { id: 'Digitaal vakmanschap', kleur: '#C2410C' },
  ],
  schaal: [
    { waarde: 1, label: 'Initial', beschrijving: 'Ad-hoc, geen gestructureerde aanpak' },
    { waarde: 2, label: 'Managed', beschrijving: 'Herhaalbaar op projectniveau, nog niet organisatiebreed geborgd' },
    { waarde: 3, label: 'Defined', beschrijving: 'Gestandaardiseerd en organisatiebreed vastgelegd' },
    { waarde: 4, label: 'Quantitatively Managed', beschrijving: 'Gemeten en gestuurd op basis van data' },
    { waarde: 5, label: 'Optimizing', beschrijving: 'Continue verbetering ingebed in de organisatie' },
  ],
};

export function getNdsVragen(): Array<Vraag & { asId: string; asNaam: string }> {
  const result: Array<Vraag & { asId: string; asNaam: string }> = [];
  for (const as of CONFIG.assen) {
    for (const vraag of as.vragen) {
      if (vraag.nds) {
        result.push({ ...vraag, asId: as.id, asNaam: as.naam });
      }
    }
  }
  return result;
}
```

- [ ] **Step 5: Run test, verwacht slagen**

Run: `npx vitest run src/service/config.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Schrijf de falende test voor `scores.ts`**

`src/service/scores.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { berekenGemiddeldePerAs, berekenTotaalGemiddelde, type PlatformScoresByAs } from './scores';

describe('berekenGemiddeldePerAs', () => {
  it('berekent het gemiddelde per as, negeert null-scores', () => {
    const data: PlatformScoresByAs = {
      techniek: { 'common-ground-standaarden': 4, 'cloud-data': 2, 'ai-integratie': null, 'digitale-weerbaarheid': null },
      mens: { 'capaciteit-kennis': 3, 'digitaal-vakmanschap': 3, 'klantbetrokkenheid': 3, 'opleiding-continuiteit': 3 },
      proces: {},
    };
    const result = berekenGemiddeldePerAs(data);
    expect(result.techniek).toBe(3);
    expect(result.mens).toBe(3);
  });

  it('geeft null voor een as zonder enige score', () => {
    const result = berekenGemiddeldePerAs({ techniek: {}, mens: {}, proces: {} });
    expect(result.techniek).toBeNull();
  });
});

describe('berekenTotaalGemiddelde', () => {
  it('berekent het gemiddelde over de as-gemiddelden, niet over individuele vragen', () => {
    const data: PlatformScoresByAs = {
      techniek: { 'common-ground-standaarden': 4, 'cloud-data': 4, 'ai-integratie': 4, 'digitale-weerbaarheid': 4 },
      mens: { 'capaciteit-kennis': 2, 'digitaal-vakmanschap': 2, 'klantbetrokkenheid': 2, 'opleiding-continuiteit': 2 },
      proces: {},
    };
    expect(berekenTotaalGemiddelde(data)).toBe(3);
  });

  it('geeft null als geen enkele as een score heeft', () => {
    expect(berekenTotaalGemiddelde({ techniek: {}, mens: {}, proces: {} })).toBeNull();
  });
});
```

- [ ] **Step 7: Run test, verwacht falen**

Run: `npx vitest run src/service/scores.test.ts`
Expected: FAIL — `Cannot find module './scores'`.

- [ ] **Step 8: Implementeer `src/service/scores.ts`**

```ts
import { CONFIG } from './config';

export type VraagScoreMap = Record<string, number | null>;
export type PlatformScoresByAs = Record<string, VraagScoreMap>;

export function berekenGemiddeldePerAs(platformData: PlatformScoresByAs): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  for (const as of CONFIG.assen) {
    const asData = platformData[as.id];
    if (!asData) {
      result[as.id] = null;
      continue;
    }
    const scores = as.vragen
      .map((v) => asData[v.id])
      .filter((s): s is number => s != null);
    result[as.id] = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : null;
  }
  return result;
}

export function berekenTotaalGemiddelde(platformData: PlatformScoresByAs): number | null {
  const asGemiddelden = berekenGemiddeldePerAs(platformData);
  const waarden = Object.values(asGemiddelden).filter((v): v is number => v != null);
  return waarden.length > 0
    ? waarden.reduce((sum, v) => sum + v, 0) / waarden.length
    : null;
}
```

- [ ] **Step 9: Run test, verwacht slagen**

Run: `npx vitest run src/service/scores.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 10: Volledige unit-testrun + typecheck**

Run: `npm run test:unit && npm run typecheck`
Expected: alle 8 tests slagen, typecheck exit 0.

- [ ] **Step 11: Commit**

```bash
git add src/service/ vitest.config.ts
git commit -m "feat: port config and score calculations to typed service layer"
```

---

### Task 4: Data-laag — Prisma-repository

**Files:**
- Create: `src/data/metingenRepository.ts`
- Create: `src/data/metingenRepository.test.ts`

**Interfaces:**
- Consumes: `prisma` uit `src/data/prismaClient.ts` (Task 2), `CONFIG` uit `src/service/config.ts`
  (Task 3).
- Produces: `listMetingen()`, `createMeting(jaar: number)`, `getMetingByJaar(jaar: number)`,
  `savePlatformScore(input)`, en de types `MetingWithPlatformen`, `PlatformSnapshot` — Task 7
  (API-routes) importeert deze exacte namen.

- [ ] **Step 1: Schrijf de falende integratietest**

`src/data/metingenRepository.test.ts`:

```ts
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from './prismaClient';
import { createMeting, getMetingByJaar, listMetingen, savePlatformScore } from './metingenRepository';

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.vraagScore.deleteMany();
  await prisma.platformScore.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.meting.deleteMany();
});

describe('metingenRepository', () => {
  it('maakt een meting aan en vindt die terug op jaar', async () => {
    await createMeting(2027);
    const meting = await getMetingByJaar(2027);
    expect(meting?.jaar).toBe(2027);
    expect(meting?.platformen).toEqual({});
  });

  it('lijst alle metingen, meest recent eerst', async () => {
    await createMeting(2026);
    await createMeting(2027);
    const metingen = await listMetingen();
    expect(metingen.map((m) => m.jaar)).toEqual([2027, 2026]);
  });

  it('slaat een platform-score op en leest die terug met scores per as', async () => {
    const meting = await createMeting(2027);
    await savePlatformScore({
      metingId: meting.id,
      platformId: 'belastingen',
      status: 'concept',
      algemeneToelichting: 'testopmerking',
      laatstGewijzigdDoor: 'test-user@lokaal',
      vraagScores: [
        { vraagId: 'common-ground-standaarden', score: 4, toelichting: 'onderbouwing' },
      ],
    });
    const result = await getMetingByJaar(2027);
    const platform = result?.platformen.belastingen;
    expect(platform?.status).toBe('concept');
    expect(platform?.algemeneToelichting).toBe('testopmerking');
    expect(platform?.scoresPerAs.techniek['common-ground-standaarden']).toBe(4);
    expect(platform?.toelichtingen['common-ground-standaarden']).toBe('onderbouwing');
  });

  it('overschrijft een bestaande score bij een tweede keer opslaan (upsert, geen duplicaat)', async () => {
    const meting = await createMeting(2027);
    const payload = {
      metingId: meting.id,
      platformId: 'belastingen',
      status: 'concept' as const,
      algemeneToelichting: '',
      laatstGewijzigdDoor: 'test-user@lokaal',
      vraagScores: [{ vraagId: 'common-ground-standaarden', score: 2, toelichting: '' }],
    };
    await savePlatformScore(payload);
    await savePlatformScore({ ...payload, vraagScores: [{ vraagId: 'common-ground-standaarden', score: 5, toelichting: '' }] });
    const result = await getMetingByJaar(2027);
    expect(result?.platformen.belastingen.scoresPerAs.techniek['common-ground-standaarden']).toBe(5);
    const count = await prisma.vraagScore.count();
    expect(count).toBe(1);
  });

  it('schrijft een audit-log-regel bij elke platform-save', async () => {
    const meting = await createMeting(2027);
    await savePlatformScore({
      metingId: meting.id,
      platformId: 'belastingen',
      status: 'definitief',
      algemeneToelichting: '',
      laatstGewijzigdDoor: 'test-user@lokaal',
      vraagScores: [],
    });
    const logs = await prisma.auditLogEntry.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0].actie).toBe('platform_afgerond');
    expect(logs[0].actor).toBe('test-user@lokaal');
  });
});
```

- [ ] **Step 2: Zorg dat de dev-Postgres draait en gemigreerd is**

Run: `docker compose -f docker-compose.dev.yml up -d && npx prisma migrate deploy`
Expected: container draait, migraties toegepast (geen pending migrations).

- [ ] **Step 3: Run test, verwacht falen**

Run: `npx vitest run src/data/metingenRepository.test.ts`
Expected: FAIL — `Cannot find module './metingenRepository'`.

- [ ] **Step 4: Implementeer `src/data/metingenRepository.ts`**

```ts
import { prisma } from './prismaClient';
import { CONFIG } from '../service/config';

export interface PlatformSnapshot {
  status: string;
  algemeneToelichting: string;
  laatstGewijzigdDoor: string;
  laatstGewijzigdOp: Date;
  scoresPerAs: Record<string, Record<string, number | null>>;
  toelichtingen: Record<string, string>;
}

export interface MetingWithPlatformen {
  id: string;
  jaar: number;
  aangemaakt: Date;
  platformen: Record<string, PlatformSnapshot>;
}

export async function listMetingen() {
  return prisma.meting.findMany({ orderBy: { jaar: 'desc' } });
}

export async function createMeting(jaar: number) {
  return prisma.meting.create({ data: { jaar } });
}

function vraagToAsId(vraagId: string): string | undefined {
  for (const as of CONFIG.assen) {
    if (as.vragen.some((v) => v.id === vraagId)) return as.id;
  }
  return undefined;
}

export async function getMetingByJaar(jaar: number): Promise<MetingWithPlatformen | null> {
  const meting = await prisma.meting.findUnique({
    where: { jaar },
    include: { platformen: { include: { vraagScores: true } } },
  });
  if (!meting) return null;

  const platformen: Record<string, PlatformSnapshot> = {};
  for (const p of meting.platformen) {
    const scoresPerAs: Record<string, Record<string, number | null>> = {};
    const toelichtingen: Record<string, string> = {};
    for (const as of CONFIG.assen) scoresPerAs[as.id] = {};
    for (const vs of p.vraagScores) {
      const asId = vraagToAsId(vs.vraagId);
      if (asId) scoresPerAs[asId][vs.vraagId] = vs.score;
      toelichtingen[vs.vraagId] = vs.toelichting;
    }
    platformen[p.platformId] = {
      status: p.status,
      algemeneToelichting: p.algemeneToelichting,
      laatstGewijzigdDoor: p.laatstGewijzigdDoor,
      laatstGewijzigdOp: p.laatstGewijzigdOp,
      scoresPerAs,
      toelichtingen,
    };
  }

  return { id: meting.id, jaar: meting.jaar, aangemaakt: meting.aangemaakt, platformen };
}

export async function savePlatformScore(input: {
  metingId: string;
  platformId: string;
  status: string;
  algemeneToelichting: string;
  laatstGewijzigdDoor: string;
  vraagScores: Array<{ vraagId: string; score: number | null; toelichting: string }>;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const platformScore = await tx.platformScore.upsert({
      where: { metingId_platformId: { metingId: input.metingId, platformId: input.platformId } },
      create: {
        metingId: input.metingId,
        platformId: input.platformId,
        status: input.status,
        algemeneToelichting: input.algemeneToelichting,
        laatstGewijzigdDoor: input.laatstGewijzigdDoor,
      },
      update: {
        status: input.status,
        algemeneToelichting: input.algemeneToelichting,
        laatstGewijzigdDoor: input.laatstGewijzigdDoor,
        laatstGewijzigdOp: new Date(),
      },
    });

    for (const vs of input.vraagScores) {
      await tx.vraagScore.upsert({
        where: { platformScoreId_vraagId: { platformScoreId: platformScore.id, vraagId: vs.vraagId } },
        create: { platformScoreId: platformScore.id, vraagId: vs.vraagId, score: vs.score, toelichting: vs.toelichting },
        update: { score: vs.score, toelichting: vs.toelichting },
      });
    }

    await tx.auditLogEntry.create({
      data: {
        actor: input.laatstGewijzigdDoor,
        actie: input.status === 'definitief' ? 'platform_afgerond' : 'platform_opgeslagen_concept',
        doelType: 'platform_score',
        doelId: platformScore.id,
        detail: `platform=${input.platformId}`,
      },
    });
  });
}
```

- [ ] **Step 5: Run test, verwacht slagen**

Run: `npx vitest run src/data/metingenRepository.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/metingenRepository.ts src/data/metingenRepository.test.ts
git commit -m "feat: add Prisma repository for metingen and platform scores"
```

---

### Task 5: Process-laag — validatieregel "alle vragen verplicht vóór definitief"

**Files:**
- Create: `src/process/platformWorkflow.ts`
- Create: `src/process/platformWorkflow.test.ts`

**Interfaces:**
- Consumes: `CONFIG` uit `src/service/config.ts`.
- Produces: `valideerVoorAfronden(vraagScores: VraagScoreCheck[]): string | null` — Task 7
  importeert deze exacte functienaam en signatuur.

- [ ] **Step 1: Schrijf de falende test**

`src/process/platformWorkflow.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { valideerVoorAfronden } from './platformWorkflow';
import { CONFIG } from '../service/config';

const alleVraagIds = CONFIG.assen.flatMap((a) => a.vragen.map((v) => v.id));

describe('valideerVoorAfronden', () => {
  it('geeft null als alle vragen een score hebben', () => {
    const scores = alleVraagIds.map((id) => ({ vraagId: id, score: 3 }));
    expect(valideerVoorAfronden(scores)).toBeNull();
  });

  it('geeft een foutmelding met de ontbrekende vraag-id als er scores missen', () => {
    const scores = alleVraagIds.slice(1).map((id) => ({ vraagId: id, score: 3 }));
    const fout = valideerVoorAfronden(scores);
    expect(fout).not.toBeNull();
    expect(fout).toContain(alleVraagIds[0]);
    expect(fout).toContain('Vul alle vragen in');
  });

  it('behandelt een null-score als niet ingevuld', () => {
    const scores = alleVraagIds.map((id) => ({ vraagId: id, score: id === alleVraagIds[0] ? null : 3 }));
    const fout = valideerVoorAfronden(scores);
    expect(fout).toContain(alleVraagIds[0]);
  });
});
```

- [ ] **Step 2: Run test, verwacht falen**

Run: `npx vitest run src/process/platformWorkflow.test.ts`
Expected: FAIL — `Cannot find module './platformWorkflow'`.

- [ ] **Step 3: Implementeer `src/process/platformWorkflow.ts`**

```ts
import { CONFIG } from '../service/config';

export interface VraagScoreCheck {
  vraagId: string;
  score: number | null;
}

export function valideerVoorAfronden(vraagScores: VraagScoreCheck[]): string | null {
  const alleVraagIds = CONFIG.assen.flatMap((a) => a.vragen.map((v) => v.id));
  const ingevuld = new Map(vraagScores.map((v) => [v.vraagId, v.score]));
  const ontbrekend = alleVraagIds.filter((id) => ingevuld.get(id) == null);
  if (ontbrekend.length > 0) {
    return `Vul alle vragen in voordat u afrondt. Ontbrekend: ${ontbrekend.join(', ')}.`;
  }
  return null;
}
```

- [ ] **Step 4: Run test, verwacht slagen**

Run: `npx vitest run src/process/platformWorkflow.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/process/
git commit -m "feat: add process-layer validation for finalizing a platform score"
```

---

### Task 6: Integration-laag — Zod-schema's, OpenAPI-spec, test-gebruiker, problem+json

**Files:**
- Create: `src/integration/schemas.ts`
- Create: `src/integration/schemas.test.ts`
- Create: `src/integration/problemResponse.ts`
- Create: `src/integration/testUser.ts`
- Create: `api/specs/gvprlg.yaml`

**Interfaces:**
- Produces: `CreateMetingSchema`, `VraagScoreInputSchema`, `SavePlatformScoreSchema` (Zod-schema's),
  `problemResponse(status, title, detail)`, `TEST_USER_ID: string` — Task 7 importeert deze
  exacte namen.

- [ ] **Step 1: Schrijf de falende test**

`src/integration/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SavePlatformScoreSchema } from './schemas';

describe('SavePlatformScoreSchema', () => {
  it('accepteert een geldige payload', () => {
    const result = SavePlatformScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: 'ok',
      vraagScores: [{ vraagId: 'x', score: 3, toelichting: '' }],
    });
    expect(result.success).toBe(true);
  });

  it('wijst een score buiten 1-5 af', () => {
    const result = SavePlatformScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: '',
      vraagScores: [{ vraagId: 'x', score: 10, toelichting: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('wijst een niet-geheel getal als score af', () => {
    const result = SavePlatformScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: '',
      vraagScores: [{ vraagId: 'x', score: 3.5, toelichting: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('wijst een onbekende status af', () => {
    const result = SavePlatformScoreSchema.safeParse({
      status: 'onbekend',
      algemeneToelichting: '',
      vraagScores: [],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verwacht falen**

Run: `npx vitest run src/integration/schemas.test.ts`
Expected: FAIL — `Cannot find module './schemas'`.

- [ ] **Step 3: Implementeer `src/integration/schemas.ts`**

```ts
import { z } from 'zod';

export const CreateMetingSchema = z.object({
  jaar: z.number().int().min(2020).max(2100),
});

export const VraagScoreInputSchema = z.object({
  vraagId: z.string().min(1).max(100),
  score: z.number().int().min(1).max(5).nullable(),
  toelichting: z.string().max(2000).default(''),
});

export const SavePlatformScoreSchema = z.object({
  status: z.enum(['concept', 'definitief']),
  algemeneToelichting: z.string().max(5000).default(''),
  vraagScores: z.array(VraagScoreInputSchema),
});
```

- [ ] **Step 4: Run test, verwacht slagen**

Run: `npx vitest run src/integration/schemas.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: `src/integration/problemResponse.ts`**

```ts
import { NextResponse } from 'next/server';

export function problemResponse(status: number, title: string, detail: string) {
  return NextResponse.json(
    { type: 'about:blank', title, status, detail },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}
```

- [ ] **Step 6: `src/integration/testUser.ts`**

```ts
// Fase A heeft nog geen authenticatie (zie Fase B in de spec). Elke wijziging wordt
// toegeschreven aan deze vaste test-gebruiker totdat Keycloak-sessies dit vervangen.
export const TEST_USER_ID = 'test-user@lokaal';
```

- [ ] **Step 7: `api/specs/gvprlg.yaml` — OpenAPI-spec voor de Fase A-endpoints**

```yaml
openapi: 3.1.0
info:
  title: GVPRLG Volwassenheidsmeting API
  version: 1.0.0-fase-a
paths:
  /api/metingen:
    get:
      summary: Lijst alle metingen
      responses:
        '200':
          description: OK
    post:
      summary: Maak een nieuwe meting aan voor een jaar
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [jaar]
              properties:
                jaar:
                  type: integer
                  minimum: 2020
                  maximum: 2100
      responses:
        '201':
          description: Aangemaakt
        '400':
          description: Ongeldige invoer (problem+json)
        '409':
          description: Meting voor dit jaar bestaat al (problem+json)
  /api/metingen/{jaar}/platformen/{platformId}:
    get:
      summary: Haal de scores van één platform binnen een meting op
      parameters:
        - name: jaar
          in: path
          required: true
          schema: { type: integer }
        - name: platformId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: OK
        '404':
          description: Meting of platform niet gevonden (problem+json)
    put:
      summary: Sla scores en opmerkingen op voor één platform (concept of definitief)
      parameters:
        - name: jaar
          in: path
          required: true
          schema: { type: integer }
        - name: platformId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status, vraagScores]
              properties:
                status:
                  type: string
                  enum: [concept, definitief]
                algemeneToelichting:
                  type: string
                vraagScores:
                  type: array
                  items:
                    type: object
                    required: [vraagId, score]
                    properties:
                      vraagId: { type: string }
                      score: { type: integer, minimum: 1, maximum: 5, nullable: true }
                      toelichting: { type: string }
      responses:
        '200':
          description: Opgeslagen
        '400':
          description: Ongeldige invoer (problem+json)
        '404':
          description: Meting of platform niet gevonden (problem+json)
        '422':
          description: Niet alle vragen ingevuld bij afronden (problem+json)
```

- [ ] **Step 8: Commit**

```bash
git add src/integration/ api/specs/gvprlg.yaml
git commit -m "feat: add Zod schemas, OpenAPI spec and problem+json helper"
```

---

### Task 7: API-routes

**Files:**
- Create: `app/api/metingen/route.ts`
- Create: `app/api/metingen/[jaar]/platformen/[platformId]/route.ts`
- Create: `app/api/metingen/route.test.ts` (Vitest, importeert de route-handlers direct)
- Create: `app/api/metingen/[jaar]/platformen/[platformId]/route.test.ts`

**Interfaces:**
- Consumes: alles uit Task 3 (`CONFIG`), Task 4 (`listMetingen`, `createMeting`,
  `getMetingByJaar`, `savePlatformScore`), Task 5 (`valideerVoorAfronden`), Task 6
  (`CreateMetingSchema`, `SavePlatformScoreSchema`, `problemResponse`, `TEST_USER_ID`).
- Produces: de HTTP-contracten die Task 8/9 (UI) aanroepen via `fetch`.

- [ ] **Step 1: `app/api/metingen/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { CreateMetingSchema } from '@/src/integration/schemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { createMeting, listMetingen } from '@/src/data/metingenRepository';

export async function GET() {
  const metingen = await listMetingen();
  return NextResponse.json({ metingen });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = CreateMetingSchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(400, 'Ongeldige invoer', parsed.error.message);
  }
  const bestaande = await listMetingen();
  if (bestaande.some((m) => m.jaar === parsed.data.jaar)) {
    return problemResponse(409, 'Meting bestaat al', `Er bestaat al een meting voor ${parsed.data.jaar}.`);
  }
  const meting = await createMeting(parsed.data.jaar);
  return NextResponse.json({ meting }, { status: 201 });
}
```

- [ ] **Step 2: `app/api/metingen/[jaar]/platformen/[platformId]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { SavePlatformScoreSchema } from '@/src/integration/schemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { getMetingByJaar, savePlatformScore } from '@/src/data/metingenRepository';
import { CONFIG } from '@/src/service/config';
import { valideerVoorAfronden } from '@/src/process/platformWorkflow';
import { TEST_USER_ID } from '@/src/integration/testUser';

interface RouteParams {
  params: { jaar: string; platformId: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const jaar = Number(params.jaar);
  const meting = await getMetingByJaar(jaar);
  if (!meting) {
    return problemResponse(404, 'Meting niet gevonden', `Geen meting voor jaar ${jaar}.`);
  }
  const platform = meting.platformen[params.platformId] ?? null;
  return NextResponse.json({ platform });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const jaar = Number(params.jaar);
  if (!CONFIG.platformen.some((p) => p.id === params.platformId)) {
    return problemResponse(404, 'Onbekend platform', `Platform "${params.platformId}" bestaat niet.`);
  }
  const body = await request.json().catch(() => null);
  const parsed = SavePlatformScoreSchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(400, 'Ongeldige invoer', parsed.error.message);
  }
  if (parsed.data.status === 'definitief') {
    const fout = valideerVoorAfronden(parsed.data.vraagScores);
    if (fout) return problemResponse(422, 'Kan niet afronden', fout);
  }
  const meting = await getMetingByJaar(jaar);
  if (!meting) {
    return problemResponse(404, 'Meting niet gevonden', `Geen meting voor jaar ${jaar}.`);
  }

  await savePlatformScore({
    metingId: meting.id,
    platformId: params.platformId,
    status: parsed.data.status,
    algemeneToelichting: parsed.data.algemeneToelichting,
    laatstGewijzigdDoor: TEST_USER_ID,
    vraagScores: parsed.data.vraagScores,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Schrijf de integratietests (tegen de echte dev-Postgres)**

`app/api/metingen/route.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '@/src/data/prismaClient';
import { GET, POST } from './route';

afterEach(async () => {
  await prisma.meting.deleteMany();
});

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/metingen', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as import('next/server').NextRequest;
}

describe('POST /api/metingen', () => {
  it('maakt een meting aan en geeft 201', async () => {
    const response = await POST(jsonRequest({ jaar: 2027 }));
    expect(response.status).toBe(201);
  });

  it('geeft 409 bij een dubbel jaar', async () => {
    await POST(jsonRequest({ jaar: 2027 }));
    const response = await POST(jsonRequest({ jaar: 2027 }));
    expect(response.status).toBe(409);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('geeft 400 bij een ongeldig jaar', async () => {
    const response = await POST(jsonRequest({ jaar: 'niet-een-getal' }));
    expect(response.status).toBe(400);
  });
});

describe('GET /api/metingen', () => {
  it('geeft een lijst metingen terug', async () => {
    await POST(jsonRequest({ jaar: 2027 }));
    const response = await GET();
    const data = await response.json();
    expect(data.metingen).toHaveLength(1);
  });
});
```

`app/api/metingen/[jaar]/platformen/[platformId]/route.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '@/src/data/prismaClient';
import { createMeting } from '@/src/data/metingenRepository';
import { CONFIG } from '@/src/service/config';
import { GET, PUT } from './route';

afterEach(async () => {
  await prisma.vraagScore.deleteMany();
  await prisma.platformScore.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.meting.deleteMany();
});

function putRequest(body: unknown) {
  return new Request('http://localhost', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as import('next/server').NextRequest;
}

describe('PUT /api/metingen/[jaar]/platformen/[platformId]', () => {
  it('slaat een concept op, ook als niet alle vragen zijn ingevuld', async () => {
    await createMeting(2027);
    const response = await PUT(
      putRequest({ status: 'concept', algemeneToelichting: '', vraagScores: [{ vraagId: 'common-ground-standaarden', score: 3, toelichting: '' }] }),
      { params: { jaar: '2027', platformId: 'belastingen' } },
    );
    expect(response.status).toBe(200);
  });

  it('geeft 422 bij afronden met ontbrekende vragen', async () => {
    await createMeting(2027);
    const response = await PUT(
      putRequest({ status: 'definitief', algemeneToelichting: '', vraagScores: [{ vraagId: 'common-ground-standaarden', score: 3, toelichting: '' }] }),
      { params: { jaar: '2027', platformId: 'belastingen' } },
    );
    expect(response.status).toBe(422);
  });

  it('rondt af als alle vragen zijn ingevuld', async () => {
    await createMeting(2027);
    const alleVraagIds = CONFIG.assen.flatMap((a) => a.vragen.map((v) => v.id));
    const response = await PUT(
      putRequest({
        status: 'definitief',
        algemeneToelichting: '',
        vraagScores: alleVraagIds.map((id) => ({ vraagId: id, score: 3, toelichting: '' })),
      }),
      { params: { jaar: '2027', platformId: 'belastingen' } },
    );
    expect(response.status).toBe(200);
  });

  it('geeft 404 bij een onbekend platform-id', async () => {
    await createMeting(2027);
    const response = await PUT(
      putRequest({ status: 'concept', algemeneToelichting: '', vraagScores: [] }),
      { params: { jaar: '2027', platformId: 'niet-bestaand' } },
    );
    expect(response.status).toBe(404);
  });

  it('GET geeft 404 voor een niet-bestaand meetjaar', async () => {
    const response = await GET(new Request('http://localhost') as unknown as import('next/server').NextRequest, {
      params: { jaar: '1999', platformId: 'belastingen' },
    });
    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 4: Run de tests, verwacht slagen**

Run: `npm run test:unit`
Expected: alle tests in het project (service + process + integration + data + api) slagen.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add app/api/
git commit -m "feat: add API routes for creating metingen and saving platform scores"
```

---

### Task 8: UI — invulformulier (hergebruik CMMI-legenda, opmerking per vraag, algemene toelichting)

**Files:**
- Create: `src/ui/components/ScoreSchaalLegenda.tsx`
- Create: `app/metingen/[jaar]/[platformId]/page.tsx`

**Interfaces:**
- Consumes: `app/api/metingen/[jaar]/platformen/[platformId]` (GET/PUT, Task 7), `CONFIG` (Task 3).

- [ ] **Step 1: `src/ui/components/ScoreSchaalLegenda.tsx`**

```tsx
import { CONFIG } from '@/src/service/config';

export function ScoreSchaalLegenda() {
  return (
    <div className="card">
      <h3>Toelichting op de schaal (CMMI-niveaus)</h3>
      <table aria-label="Toelichting scoreschaal 1-5">
        <thead>
          <tr>
            <th>Niveau</th>
            <th>Naam</th>
            <th>Beschrijving</th>
          </tr>
        </thead>
        <tbody>
          {CONFIG.schaal.map((s) => (
            <tr key={s.waarde}>
              <td className={`score-${s.waarde}`}>{s.waarde}</td>
              <td>{s.label}</td>
              <td>{s.beschrijving}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: `app/metingen/[jaar]/[platformId]/page.tsx` — client component, poort van
  `renderInvullen` uit `js/app.js`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CONFIG } from '@/src/service/config';
import { ScoreSchaalLegenda } from '@/src/ui/components/ScoreSchaalLegenda';

interface PlatformData {
  status: string;
  algemeneToelichting: string;
  scoresPerAs: Record<string, Record<string, number | null>>;
  toelichtingen: Record<string, string>;
}

export default function InvulformulierPage() {
  const params = useParams<{ jaar: string; platformId: string }>();
  const router = useRouter();
  const [data, setData] = useState<PlatformData | null>(null);
  const [algemeneToelichting, setAlgemeneToelichting] = useState('');
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [toelichtingen, setToelichtingen] = useState<Record<string, string>>({});
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/metingen/${params.jaar}/platformen/${params.platformId}`)
      .then((r) => r.json())
      .then((json) => {
        const platform: PlatformData | null = json.platform;
        setData(platform);
        setAlgemeneToelichting(platform?.algemeneToelichting ?? '');
        const vlakkeScores: Record<string, number | null> = {};
        for (const as of CONFIG.assen) {
          for (const v of as.vragen) {
            vlakkeScores[v.id] = platform?.scoresPerAs[as.id]?.[v.id] ?? null;
          }
        }
        setScores(vlakkeScores);
        setToelichtingen(platform?.toelichtingen ?? {});
      });
  }, [params.jaar, params.platformId]);

  async function opslaan(status: 'concept' | 'definitief') {
    setFout(null);
    const vraagScores = CONFIG.assen.flatMap((as) =>
      as.vragen.map((v) => ({
        vraagId: v.id,
        score: scores[v.id] ?? null,
        toelichting: toelichtingen[v.id] ?? '',
      })),
    );
    const response = await fetch(`/api/metingen/${params.jaar}/platformen/${params.platformId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, algemeneToelichting, vraagScores }),
    });
    if (!response.ok) {
      const problem = await response.json();
      setFout(problem.detail);
      return;
    }
    if (status === 'definitief') {
      router.push(`/metingen/${params.jaar}/${params.platformId}/resultaat`);
    } else {
      alert('Opgeslagen als concept.');
    }
  }

  if (!data && data !== null) return <p>Laden...</p>;

  const platform = CONFIG.platformen.find((p) => p.id === params.platformId);

  return (
    <div>
      <h2>{platform?.naam} — Meting {params.jaar}</h2>
      {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
      <ScoreSchaalLegenda />
      {CONFIG.assen.map((as) => (
        <div className="card" key={as.id}>
          <h2 style={{ color: as.kleur }}>{as.naam}</h2>
          {as.vragen.map((v, vi) => (
            <div className="question-row" key={v.id}>
              <span className="question-nr">{vi + 1}.</span>
              <span className="question-text-compact">
                {v.tekst}
                {v.nds && <span className="nds-tag">NDS</span>}
              </span>
              <div className="score-group" role="radiogroup" aria-label={v.tekst}>
                {CONFIG.schaal.map((s) => (
                  <label className="score-option" key={s.waarde}>
                    <input
                      type="radio"
                      name={v.id}
                      value={s.waarde}
                      checked={scores[v.id] === s.waarde}
                      onChange={() => setScores((prev) => ({ ...prev, [v.id]: s.waarde }))}
                      aria-label={`${s.waarde} - ${s.label}: ${s.beschrijving}`}
                    />
                    <span className="score-btn">{s.waarde}</span>
                  </label>
                ))}
              </div>
              <div className="question-toelichting">
                <label htmlFor={`toelichting-${v.id}`}>Opmerking (optioneel)</label>
                <textarea
                  id={`toelichting-${v.id}`}
                  value={toelichtingen[v.id] ?? ''}
                  onChange={(e) => setToelichtingen((prev) => ({ ...prev, [v.id]: e.target.value }))}
                  placeholder="Onderbouwing / verantwoording voor deze score"
                />
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="card">
        <div className="form-group">
          <label htmlFor="algemene-toelichting">Algemene toelichting bij deze meting (optioneel)</label>
          <textarea
            id="algemene-toelichting"
            value={algemeneToelichting}
            onChange={(e) => setAlgemeneToelichting(e.target.value)}
            placeholder="Overkoepelende opmerkingen bij deze platform-meting"
          />
        </div>
      </div>
      <div className="btn-group">
        <button className="btn btn-primary" onClick={() => opslaan('concept')}>Opslaan als concept</button>
        <button className="btn btn-success" onClick={() => opslaan('definitief')}>Afronden (definitief)</button>
      </div>
    </div>
  );
}
```

React's JSX escaping dekt hier automatisch de "HTML in opmerking"-dreiging uit de Review Focus
(regel 5): `{v.tekst}`, `{toelichtingen[v.id]}` en `{algemeneToelichting}` worden nooit als HTML
geïnterpreteerd. Geen `dangerouslySetInnerHTML` gebruiken in dit bestand of enig ander
UI-bestand in dit plan.

- [ ] **Step 3: Handmatig verifiëren in de browser**

Run: `npm run dev`, open `http://localhost:3000/metingen/2027/belastingen` (na het aanmaken van
een meting 2027 via `curl -X POST http://localhost:3000/api/metingen -H "Content-Type: application/json" -d "{\"jaar\":2027}"`).
Verifieer: de legenda toont de 5 CMMI-niveaus, elke vraag heeft een opmerkingveld, het algemene
toelichtingveld staat onderaan, "Opslaan als concept" en "Afronden" werken.

- [ ] **Step 4: Commit**

```bash
git add src/ui/ app/metingen/
git commit -m "feat: add invulformulier page wired to the backend API"
```

---

### Task 9: UI — home, meting-overzicht en resultaatpagina

**Files:**
- Create: `app/page.tsx` (overschrijft de placeholder uit Task 1)
- Create: `app/metingen/[jaar]/page.tsx`
- Create: `app/metingen/[jaar]/[platformId]/resultaat/page.tsx`

**Interfaces:**
- Consumes: `GET /api/metingen`, `POST /api/metingen`, `GET /api/metingen/[jaar]/platformen/[platformId]`
  (Task 7), `berekenTotaalGemiddelde`/`berekenGemiddeldePerAs` (Task 3).

- [ ] **Step 1: `app/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Meting {
  id: string;
  jaar: number;
}

export default function HomePage() {
  const [metingen, setMetingen] = useState<Meting[]>([]);
  const [nieuwJaar, setNieuwJaar] = useState('');
  const [fout, setFout] = useState<string | null>(null);

  function laadMetingen() {
    fetch('/api/metingen').then((r) => r.json()).then((data) => setMetingen(data.metingen));
  }

  useEffect(laadMetingen, []);

  async function meetingAanmaken() {
    setFout(null);
    const jaar = Number(nieuwJaar);
    const response = await fetch('/api/metingen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jaar }),
    });
    if (!response.ok) {
      const problem = await response.json();
      setFout(problem.detail);
      return;
    }
    setNieuwJaar('');
    laadMetingen();
  }

  return (
    <div>
      <div className="card">
        <div className="form-group">
          <label htmlFor="nieuw-jaar">Nieuwe meting (jaar)</label>
          <input id="nieuw-jaar" type="number" value={nieuwJaar} onChange={(e) => setNieuwJaar(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={meetingAanmaken}>Meting aanmaken</button>
        {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
      </div>
      {metingen.length === 0 && <p>Nog geen metingen.</p>}
      <div className="dashboard-grid">
        {metingen.map((m) => (
          <div className="card" key={m.id}>
            <h3>Meting {m.jaar}</h3>
            <Link className="btn btn-outline" href={`/metingen/${m.jaar}`}>Openen</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `app/metingen/[jaar]/page.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CONFIG } from '@/src/service/config';

export default function MetingOverzichtPage() {
  const params = useParams<{ jaar: string }>();

  return (
    <div>
      <h2>Meting {params.jaar}</h2>
      <div className="dashboard-grid">
        {CONFIG.platformen.map((p) => (
          <div className="card" key={p.id}>
            <h3>{p.naam}</h3>
            <div className="btn-group">
              <Link className="btn btn-primary" href={`/metingen/${params.jaar}/${p.id}`}>Invullen</Link>
              <Link className="btn btn-outline" href={`/metingen/${params.jaar}/${p.id}/resultaat`}>Bekijken</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `app/metingen/[jaar]/[platformId]/resultaat/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CONFIG } from '@/src/service/config';
import { berekenGemiddeldePerAs, berekenTotaalGemiddelde, type PlatformScoresByAs } from '@/src/service/scores';

interface PlatformData {
  status: string;
  algemeneToelichting: string;
  scoresPerAs: PlatformScoresByAs;
}

export default function ResultaatPage() {
  const params = useParams<{ jaar: string; platformId: string }>();
  const [data, setData] = useState<PlatformData | null>(null);

  useEffect(() => {
    fetch(`/api/metingen/${params.jaar}/platformen/${params.platformId}`)
      .then((r) => r.json())
      .then((json) => setData(json.platform));
  }, [params.jaar, params.platformId]);

  if (!data) return <p>Laden...</p>;

  const platform = CONFIG.platformen.find((p) => p.id === params.platformId);
  const gemPerAs = berekenGemiddeldePerAs(data.scoresPerAs);
  const totaal = berekenTotaalGemiddelde(data.scoresPerAs);

  return (
    <div>
      <h2>{platform?.naam} — Resultaat {params.jaar}</h2>
      <span className={`badge badge-${data.status}`}>{data.status}</span>
      <table aria-label="Scores per as">
        <thead>
          <tr>
            {CONFIG.assen.map((a) => <th key={a.id}>{a.naam}</th>)}
            <th>Totaal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {CONFIG.assen.map((a) => (
              <td key={a.id}>{gemPerAs[a.id]?.toFixed(1) ?? '-'}</td>
            ))}
            <td>{totaal?.toFixed(1) ?? '-'}</td>
          </tr>
        </tbody>
      </table>
      {data.algemeneToelichting && (
        <div className="card">
          <h3>Algemene toelichting</h3>
          <p>{data.algemeneToelichting}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Handmatig verifiëren — volledige flow in de browser**

Run: `npm run dev`
Test (handmatig): open `http://localhost:3000`, maak meting 2027 aan, open "Invullen" voor
Belastingen, vul alle vragen in met opmerkingen, vul de algemene toelichting, klik "Afronden",
controleer dat de resultaatpagina het totaal en de algemene toelichting toont.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/metingen/
git commit -m "feat: add home, meting overview and result pages"
```

---

### Task 10: E2E-test — volledige happy flow + XSS-check

**Files:**
- Create: `tests/gvprlg-backend-fase-a.spec.js`
- Modify: `playwright.config.js` (tweede project/baseURL voor de Next.js-dev-server, naast de
  bestaande statische-site-tests)

**Interfaces:**
- Consumes: de draaiende Next.js-app op `http://localhost:3000` (via `npm run dev`, apart gestart
  — niet via de bestaande `serve`-webServer die voor de statische site geldt).

- [ ] **Step 1: `playwright.config.js` uitbreiden met een tweede, apart project**

Voeg, naast de bestaande config voor de statische site, een los Playwright-project toe dat tegen
`http://localhost:3000` draait. De bestaande `webServer`-entry (voor `serve -l 3456 .`) blijft
ongewijzigd staan — deze nieuwe testfile draait tegen een handmatig gestarte `npm run dev` op
poort 3000, niet via Playwright's eigen `webServer`-orchestratie (de twee servers hebben
verschillende techstacks en opstarttijden; dit voorkomt dat de bestaande statische-site-tests
vertragen door op de Next.js-devserver te wachten).

```js
// Toevoegen aan playwright.config.js, als los project naast de bestaande config:
// projects: [{ name: 'static-site', testMatch: 'volwassenheidsmeting.spec.js' },
//            { name: 'backend-fase-a', testMatch: 'gvprlg-backend-fase-a.spec.js', use: { baseURL: 'http://localhost:3000' } }]
```

Lees eerst de bestaande `playwright.config.js` in zijn geheel en voeg de `projects`-array toe
zonder de bestaande `use`/`webServer`-top-level-instellingen te verwijderen — die blijven gelden
als fallback voor projecten zonder eigen `use.baseURL`.

- [ ] **Step 2: `tests/gvprlg-backend-fase-a.spec.js`**

```js
// @ts-check
import { test, expect } from '@playwright/test';

test.describe('GVPRLG backend fase A — happy flow', () => {
  test('maakt een meting aan, vult een platform in met opmerkingen, rondt af, toont resultaat', async ({ page, request }) => {
    const jaar = 2000 + Math.floor(Math.random() * 100); // uniek per testrun, voorkomt 409 tussen testruns

    await page.goto('/');
    await page.fill('#nieuw-jaar', String(jaar));
    await page.click('text=Meting aanmaken');
    await expect(page.locator(`text=Meting ${jaar}`)).toBeVisible();

    await page.click(`a[href="/metingen/${jaar}/belastingen"]`);
    await expect(page.locator('h2')).toContainText(`Belastingen — Meting ${jaar}`);

    const questions = page.locator('.question-row');
    const count = await questions.count();
    expect(count).toBe(16); // 4 techniek + 4 mens + 8 proces

    for (let i = 0; i < count; i++) {
      await questions.nth(i).locator('.score-option:nth-child(3) .score-btn').click();
    }
    await questions.first().locator('textarea').fill('onderbouwing van de score');
    // De algemene toelichting is het enige vrije-tekstveld dat op de resultaatpagina als
    // HTML-tekst wordt teruggerenderd (per-vraag-opmerkingen komen alleen terug in een
    // <textarea>-waarde, dat is inherent veilig). Dit veld is dus de juiste plek om de
    // XSS-aanname uit Review Focus-punt 5 te verifiëren.
    await page.fill('#algemene-toelichting', '<script>window.__xss = true;</script>algemene opmerking');

    await page.click('text=Afronden (definitief)');
    await expect(page).toHaveURL(new RegExp(`/metingen/${jaar}/belastingen/resultaat$`));
    await expect(page.locator('text=3.0')).toBeVisible();
    await expect(page.locator('text=algemene opmerking')).toBeVisible();

    const xssTriggered = await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss);
    expect(xssTriggered).toBeUndefined();

    const apiResponse = await request.get(`/api/metingen/${jaar}/platformen/belastingen`);
    const body = await apiResponse.json();
    expect(body.platform.status).toBe('definitief');
  });

  test('weigert afronden met ontbrekende scores', async ({ page }) => {
    const jaar = 2000 + Math.floor(Math.random() * 100);
    await page.goto('/');
    await page.fill('#nieuw-jaar', String(jaar));
    await page.click('text=Meting aanmaken');
    await page.click(`a[href="/metingen/${jaar}/belastingen"]`);

    const firstQuestion = page.locator('.question-row').first();
    await firstQuestion.locator('.score-option:nth-child(3) .score-btn').click();
    await page.click('text=Afronden (definitief)');

    await expect(page.locator('.alert-warning')).toContainText('Vul alle vragen in');
  });
});
```

- [ ] **Step 3: Infrastructuur starten en de test draaien**

Run:
```bash
docker compose -f docker-compose.dev.yml up -d
npx prisma migrate deploy
npm run dev &
sleep 3
npx playwright test tests/gvprlg-backend-fase-a.spec.js
```
Expected: beide tests slagen (PASS).

- [ ] **Step 4: Infrastructuur netjes afsluiten**

Run: stop de achtergrond-`npm run dev`-process (via het process-ID dat Step 3 startte), en laat
`docker compose -f docker-compose.dev.yml` draaien als je in dezelfde sessie doorwerkt, of sluit
af met `docker compose -f docker-compose.dev.yml down` als je klaar bent voor nu. Documenteer in
de PR/commit-boodschap welke staat is achtergelaten.

- [ ] **Step 5: Volledige regressietest — ook de bestaande statische-site-tests**

Run: `npx playwright test tests/volwassenheidsmeting.spec.js`
Expected: alle 16 bestaande tests slagen nog steeds onveranderd (de statische site is niet
aangeraakt in dit plan).

- [ ] **Step 6: Commit**

```bash
git add tests/gvprlg-backend-fase-a.spec.js playwright.config.js
git commit -m "test: add E2E happy-path coverage for the fase A backend"
```
