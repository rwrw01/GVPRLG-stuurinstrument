# GVPRLG Backend Fase D — Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maak de Fase A-backend containerizeerbaar en deploybaar op VPS-001, zonder GitHub
Actions/CI-CD (bewust besluit, zie spec §7) en zonder dat dit plan zelf iets live zet op
VPS-001 of in de `sovereign-stack`-repo pusht. Het plan levert: health-endpoints, een
production-Dockerfile, een gehardende `docker-compose.yml` (in de GVPRLG-repo zelf), lokaal
bewezen werkend via `docker compose build && docker compose up`, plus een kant-en-klare
(niet-gepushte) diff voor de ene benodigde wijziging in `sovereign-stack`.

**Architecture:** Multi-stage Dockerfile (Node 22 Alpine, gepind op digest) met Next.js
`output: "standalone"`. Prisma 7 + `@prisma/adapter-pg` heeft geen native query-engine-binary
nodig (pure JS via `pg`), dus geen speciale Prisma-binary-handling in Docker. Twee services
naast Postgres: een one-shot `migrate`-service (`prisma migrate deploy`) en de persistente
`app`-service — zelfde patroon als SiteGuardian op VPS-001. Secrets via Docker
`secrets:`-bestandsreferenties, nooit plaintext.

**Tech Stack:** Node 22-alpine (digest-gepind), Next.js 16 `output: standalone`, Docker Compose
secrets, dezelfde Zod/Vitest-stack als fase A.

**Spec:** `docs/superpowers/specs/2026-10-09-backend-migratie-vps001-design.md` §7 (deployment,
inclusief het besluit om GitHub Actions/CI-CD niet te gebruiken en waar `docker-compose.yml`
leeft) en §9 punt 6 (vóór de eerste live deploy via SSH te verifiëren, hier expliciet buiten
scope van dit plan).

## Global Constraints

- Dit plan pusht **niets** naar `sovereign-stack` en zet **niets** live op VPS-001 — de laatste
  taak bereidt de sovereign-stack-wijziging voor als diff, zonder te committen/pushen.
- Geen GitHub Actions, geen GitHub-repo-secrets, geen `ghcr.io` (spec §7, expliciet besluit).
- Elke `FROM`-regel gebruikt een gepinde digest, geen los versienummer (globale regel
  02-portability.md).
- Non-root user in de runtime-image, `HEALTHCHECK` met timeout <5s, multi-stage build zonder
  build-tools in de uiteindelijke runtime-laag (02-portability.md).
- Secrets uitsluitend via bestandsreferenties (`secrets:`-blok), nooit plaintext in
  `docker-compose.yml` of een gecommit bestand.
- TypeScript strict, Zod op elke externe input, RFC 9457 problem+json — zelfde regels als fase A.

## Review Focus

1. **Standalone-build mist een runtime-afhankelijkheid** (bv. `pg` of `@prisma/client`'s
   gegenereerde bestanden worden niet meegenomen door Next's trace-based copy) — moet pas
   blijken bij een echte `docker run`, niet alleen bij `npm run build` lokaal zonder Docker.
2. **Migrate-service draait niet vóór de app start**, of de app start zonder dat de migratie
   geslaagd is — moet een echte containertest zijn (`depends_on: condition:
   service_completed_successfully`), niet alleen een leesbare compose-regel.
3. **Secret-bestand ontbreekt of is leeg bij het opstarten** — de entrypoint-scripts moeten dit
   duidelijk laten falen (geen stille lege `DATABASE_URL`), niet een cryptische Prisma-foutmelding
   pas diep in de stack.
4. **Health-endpoint liegt** — `/api/healthz` mag nooit 200 geven als het proces niet echt
   gezond is, en `/api/readyz` moet een echte DB-call doen, niet alleen "ja" terugsturen.
5. **`net-fe-gvprlg` bestaat lokaal niet** — de lokale verificatie van de production-compose
   moet dit netwerk zelf aanmaken/opruimen, anders faalt de hele compose-stack meteen bij het
   testen, nog voordat er iets inhoudelijks gecontroleerd is.

---

## Buiten scope van dit plan (expliciet)

- Daadwerkelijk pushen naar `sovereign-stack` of committen van de Traefik-netwerkwijziging —
  Taak 5 bereidt dit alleen voor.
- SSH naar VPS-001, `/opt/gvprlg/` aanmaken, `docker network create net-fe-gvprlg` op de
  server, de eerste echte deploy — vraagt expliciete go vooraf (spec §9 punt 6).
- GitHub Pages uitfaseren — pas zodra de echte app bevestigd live draait (spec §7).
- Backup-integratie (3-2-1) — losse, kleinere taak, niet blokkerend voor een eerste deploy.

---

### Task 1: Health-endpoints (TDD)

**Files:**
- Create: `app/api/healthz/route.ts`
- Create: `app/api/healthz/route.test.ts`
- Create: `app/api/readyz/route.ts`
- Create: `app/api/readyz/route.test.ts`

**Interfaces:**
- Produces: `GET /api/healthz` (liveness, geen dependency-checks, altijd 200 als het proces
  leeft), `GET /api/readyz` (readiness, 200 alleen als de database bereikbaar is via
  `prisma.$queryRaw`). Task 2's Dockerfile-`HEALTHCHECK` gebruikt `/api/healthz`.

- [ ] **Step 1: Schrijf de falende test voor `/api/healthz`**

`app/api/healthz/route.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/healthz', () => {
  it('geeft altijd 200, zonder database-afhankelijkheid', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
```

- [ ] **Step 2: Run test, verwacht falen**

Run: `npx vitest run app/api/healthz/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implementeer `app/api/healthz/route.ts`**

```ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
```

- [ ] **Step 4: Run test, verwacht slagen**

Run: `npx vitest run app/api/healthz/route.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Schrijf de falende test voor `/api/readyz`**

`app/api/readyz/route.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/data/prismaClient', () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { prisma } from '@/src/data/prismaClient';
import { GET } from './route';

describe('GET /api/readyz', () => {
  it('geeft 200 als de database bereikbaar is', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ ok: 1 }]);
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('geeft 503 als de database niet bereikbaar is', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('connection refused'));
    const response = await GET();
    expect(response.status).toBe(503);
  });
});
```

- [ ] **Step 6: Run test, verwacht falen**

Run: `npx vitest run app/api/readyz/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 7: Implementeer `app/api/readyz/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/src/data/prismaClient';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ready' });
  } catch {
    return NextResponse.json({ status: 'not-ready' }, { status: 503 });
  }
}
```

- [ ] **Step 8: Run test, verwacht slagen**

Run: `npx vitest run app/api/readyz/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Volledige unit-testrun + typecheck**

Run: `npm run test:unit && npm run typecheck`
Expected: alle tests slagen (fase A's 40 + deze 3 = 43), typecheck exit 0.

- [ ] **Step 10: Commit**

```bash
git add app/api/healthz/ app/api/readyz/
git commit -m "feat: add healthz/readyz endpoints for container orchestration"
```

---

### Task 2: Production Dockerfile (standalone build)

**Files:**
- Modify: `next.config.ts` (voeg `output: "standalone"` toe)
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Produces: een Docker-image met target `runner` (slim, non-root, luistert op `PORT=8080`) en
  target `migrator` (volledige `node_modules` + Prisma CLI, voor `prisma migrate deploy`).
  Task 3's `docker-compose.yml` gebruikt beide targets.

- [ ] **Step 1: `next.config.ts` — standalone output**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
};

export default nextConfig;
```

- [ ] **Step 2: `.dockerignore`**

```
node_modules
.next
.git
.superpowers
test-results
playwright-report
tests
js
css
varianten
docs
*.md
.env
.env.local
.env.test
docker-compose.dev.yml
```

- [ ] **Step 3: `Dockerfile`**

```dockerfile
FROM node@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM node@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS migrator
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S gvprlg -u 1001
COPY --from=builder --chown=gvprlg:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=gvprlg:nodejs /app/prisma ./prisma
COPY --from=builder --chown=gvprlg:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=gvprlg:nodejs /app/package.json ./package.json
USER gvprlg

FROM node@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S gvprlg -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=gvprlg:nodejs /app/.next/standalone ./
COPY --from=builder --chown=gvprlg:nodejs /app/.next/static ./.next/static
USER gvprlg
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/api/healthz || exit 1
CMD ["node", "server.js"]
```

- [ ] **Step 4: Bouw de runner-laag en verifieer dat deze start**

Run:
```bash
docker build --target runner -t gvprlg-runner-test .
docker run -d --name gvprlg-runner-test -p 8081:8080 -e DATABASE_URL="postgresql://invalid" gvprlg-runner-test
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/api/healthz
docker logs gvprlg-runner-test
docker rm -f gvprlg-runner-test
```
Expected: `200` van `/api/healthz` (geen database-afhankelijkheid voor liveness), container
logt geen crash. Dit bewijst dat Next's standalone-trace alle benodigde runtime-bestanden
(inclusief `pg` via `@prisma/adapter-pg`) heeft meegenomen — zie Review Focus #1.

- [ ] **Step 5: Bouw de migrator-laag en verifieer dat de Prisma CLI werkt**

Run: `docker build --target migrator -t gvprlg-migrator-test . && docker run --rm gvprlg-migrator-test npx prisma --version`
Expected: een Prisma-versienummer wordt getoond (bevestigt dat de CLI + schema aanwezig zijn),
geen `command not found`.

- [ ] **Step 6: Opruimen van test-images**

Run: `docker rmi gvprlg-runner-test gvprlg-migrator-test`

- [ ] **Step 7: Commit**

```bash
git add next.config.ts Dockerfile .dockerignore
git commit -m "feat: add production Dockerfile with standalone Next.js build"
```

---

### Task 3: Production docker-compose.yml + lokale end-to-end verificatie

**Files:**
- Create: `docker-compose.yml`
- Create: `migrate-entrypoint.sh`
- Create: `app-entrypoint.sh`
- Create: `README.md` (sectie "Deployment" toevoegen aan het bestaande bestand)

**Interfaces:**
- Consumes: Task 1 (`/api/healthz`), Task 2 (Dockerfile-targets `runner`/`migrator`).
- Produces: een lokaal bewezen werkende productie-stack (app + migrate + postgres), het
  patroon dat straks 1-op-1 op VPS-001 draait.

- [ ] **Step 1: `migrate-entrypoint.sh`**

```sh
#!/bin/sh
set -eu
DB_PASSWORD="$(cat /run/secrets/db_password)"
if [ -z "$DB_PASSWORD" ]; then
  echo "FATAL: /run/secrets/db_password is leeg of ontbreekt." >&2
  exit 1
fi
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
exec npx prisma migrate deploy
```

- [ ] **Step 2: `app-entrypoint.sh`**

```sh
#!/bin/sh
set -eu
DB_PASSWORD="$(cat /run/secrets/db_password)"
if [ -z "$DB_PASSWORD" ]; then
  echo "FATAL: /run/secrets/db_password is leeg of ontbreekt." >&2
  exit 1
fi
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
exec node server.js
```

- [ ] **Step 3: Maak beide scripts uitvoerbaar**

Run: `chmod +x migrate-entrypoint.sh app-entrypoint.sh`

- [ ] **Step 4: `docker-compose.yml`**

```yaml
services:
  migrate:
    build:
      context: .
      dockerfile: Dockerfile
      target: migrator
    container_name: gvprlg-migrate
    networks:
      - gvprlg-internal
    environment:
      DB_HOST: postgres
      DB_PORT: "5432"
      DB_USER: gvprlg
      DB_NAME: gvprlg
    volumes:
      - ./migrate-entrypoint.sh:/usr/local/bin/migrate-entrypoint.sh:ro
    entrypoint: ["/usr/local/bin/migrate-entrypoint.sh"]
    restart: "no"
    secrets:
      - db_password
    depends_on:
      postgres:
        condition: service_healthy

  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: gvprlg-app
    networks:
      - gvprlg-internal
      - net-fe-gvprlg
    environment:
      DB_HOST: postgres
      DB_PORT: "5432"
      DB_USER: gvprlg
      DB_NAME: gvprlg
      PORT: "8080"
      HOSTNAME: "0.0.0.0"
      NODE_ENV: "production"
    volumes:
      - ./app-entrypoint.sh:/usr/local/bin/app-entrypoint.sh:ro
    entrypoint: ["/usr/local/bin/app-entrypoint.sh"]
    secrets:
      - db_password
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,nodev
    deploy:
      resources:
        limits:
          memory: 512M
          pids: 100
    restart: on-failure:5
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1:8080/api/healthz || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    depends_on:
      postgres:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=net-fe-gvprlg"
      - "traefik.http.routers.gvprlg.rule=Host(`spinnenweb.gvprlg.nl`)"
      - "traefik.http.routers.gvprlg.entrypoints=websecure"
      - "traefik.http.routers.gvprlg.tls.certresolver=letsencrypt"
      - "traefik.http.services.gvprlg.loadbalancer.server.port=8080"
      - "traefik.http.routers.gvprlg.middlewares=crowdsec@file,rate-limit@file"

  postgres:
    image: postgres:16-alpine@sha256:b7587f3cb74f4f4b2a4f9d67f052edbf95eb93f4fec7c5ada3792546caaf7383
    container_name: gvprlg-postgres
    networks:
      - gvprlg-internal
    environment:
      POSTGRES_DB: gvprlg
      POSTGRES_USER: gvprlg
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - gvprlg-pgdata:/var/lib/postgresql/data
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    deploy:
      resources:
        limits:
          memory: 512M
          pids: 100
    restart: on-failure:5
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gvprlg"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  gvprlg-internal:
    internal: true
  net-fe-gvprlg:
    external: true

volumes:
  gvprlg-pgdata:

secrets:
  db_password:
    file: ./secrets/db_password
```

Let op: de `postgres:16-alpine`-digest hierboven is dezelfde die al in `docker-compose.dev.yml`
(fase A) staat getagd — vóór gebruik hier opnieuw verifiëren met `docker pull postgres:16-alpine`
+ `docker inspect`, niet aannemen dat hij nog klopt.

- [ ] **Step 5: Verifieer de digest van het Postgres-image**

Run: `docker pull postgres:16-alpine && docker inspect --format='{{index .RepoDigests 0}}' postgres:16-alpine`
Expected: een `sha256:...`-digest. Vervang de digest in Step 4's compose-bestand door de
werkelijk teruggegeven waarde als die afwijkt van wat hierboven staat.

- [ ] **Step 6: Lokale secrets en netwerk voor de verificatie**

Run:
```bash
mkdir -p secrets
echo -n "lokaal-test-wachtwoord" > secrets/db_password
docker network create net-fe-gvprlg
```
Expected: netwerk aangemaakt (of een duidelijke "already exists"-melding als een vorige run
niet opgeruimd is — dan eerst `docker network rm net-fe-gvprlg`).

- [ ] **Step 7: Bouw en start de volledige production-stack lokaal**

Run: `docker compose build && docker compose up -d`
Expected: `migrate` service rondt af en stopt (exit 0), `postgres` en `app` worden `healthy`.

- [ ] **Step 8: Verifieer dat de app écht werkt (niet alleen dat de container draait)**

Run:
```bash
sleep 5
docker compose ps
curl -s http://localhost:8080/api/healthz 2>&1 || echo "poort niet gepubliceerd, dat is OK — app heeft geen host-poort in productie, test via het netwerk:"
docker compose exec app wget -qO- http://127.0.0.1:8080/api/healthz
docker compose exec app wget -qO- http://127.0.0.1:8080/api/readyz
```
Expected: beide health-calls geven een geldige JSON-respons terug (`{"status":"ok"}` en
`{"status":"ready"}`) — bewijst dat de app daadwerkelijk draait, de database bereikt, en dat
Review Focus #1 en #4 kloppen.

- [ ] **Step 9: Verifieer dat de migratie daadwerkelijk is toegepast**

Run: `docker compose exec postgres psql -U gvprlg -d gvprlg -c "\dt"`
Expected: de tabellen `metingen`, `platform_scores`, `vraag_scores`, `platform_invullers`,
`audit_log` bestaan — bewijst Review Focus #2 (migrate liep vóór de app startte).

- [ ] **Step 10: Verifieer dat een leeg secret-bestand duidelijk faalt (Review Focus #3)**

Run:
```bash
docker compose stop app
echo -n "" > secrets/db_password
docker compose up -d app
sleep 2
docker compose logs app --tail 5
docker compose ps app
```
Expected: de `app`-container logt `FATAL: /run/secrets/db_password is leeg of ontbreekt.` en
stopt (geen "Up"-status) — geen stille lege `DATABASE_URL`, geen cryptische Prisma-foutmelding.
Herstel daarna het echte testwachtwoord (`echo -n "lokaal-test-wachtwoord" >
secrets/db_password`) voordat je verder gaat, anders faalt Step 12's opruiming niet maar wel
een eventuele hertest.

- [ ] **Step 11: Opruimen van de lokale verificatie**

Run:
```bash
docker compose down -v
docker network rm net-fe-gvprlg
rm -rf secrets
```
Expected: alles opgeruimd, geen resterende containers/netwerken/volumes van deze test.

- [ ] **Step 12: README — Deployment-sectie toevoegen**

Voeg aan het bestaande `README.md` (na de "Ontwikkelen (backend)"-sectie) toe:

```markdown
## Deployment (VPS-001, handmatig — bewust geen CI/CD)

Zie `docs/superpowers/specs/2026-10-09-backend-migratie-vps001-design.md` §7 voor de
motivatie. Op VPS-001, via de bestaande Tailscale-SSH-sessie:

```bash
ssh ralph@100.64.0.2
cd /opt/gvprlg
git pull
docker compose build
docker compose up -d
```

Secrets staan in `/opt/gvprlg/secrets/` (chmod 700, root-only) — nooit in `docker-compose.yml`
of een gecommit bestand. Eerste keer: maak `secrets/db_password` aan met een sterk,
gegenereerd wachtwoord (`openssl rand -base64 32 > /opt/gvprlg/secrets/db_password`) vóór de
eerste `docker compose up -d`.
```

- [ ] **Step 13: Commit**

```bash
git add docker-compose.yml migrate-entrypoint.sh app-entrypoint.sh README.md
git commit -m "feat: add production docker-compose stack, verified locally end-to-end"
```

---

### Task 4: `.gitignore` voor lokale secrets

**Files:**
- Modify: `.gitignore`

**Interfaces:** geen — kleine, losstaande veiligheidsmaatregel.

- [ ] **Step 1: Voeg toe aan `.gitignore`**

```
# Production secrets (nooit committen)
/secrets/
```

- [ ] **Step 2: Verifieer dat een toevallig aangemaakte secrets-map genegeerd wordt**

Run: `mkdir -p secrets && touch secrets/test && git status --porcelain | grep secrets; rmdir --ignore-fail-on-non-empty secrets 2>/dev/null; rm -rf secrets`
Expected: geen output van de `grep` (niets uit `secrets/` verschijnt in `git status`).

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore local production secrets directory"
```

---

### Task 5: Voorbereiden (niet pushen) van de sovereign-stack-wijziging

**Files:** geen wijziging in de GVPRLG-repo. Dit maakt een diff klaar voor een **andere**,
niet-aangeraakte repo (`C:\dev\sovereign-stack`), zonder daar te committen of te pushen.

**Interfaces:** geen — dit is voorbereidend, geen code-interface.

- [ ] **Step 1: Lees de huidige `stacks/traefik/docker-compose.yml` in sovereign-stack**

Run (alleen lezen): `cat "C:/dev/sovereign-stack/stacks/traefik/docker-compose.yml"`
Bevestig de exacte huidige `networks:`-lijst van de `traefik`-service en de
netwerkdefinities onderaan, vóórdat je iets voorstelt — niet uit het geheugen aannemen dat
dit nog identiek is aan wat eerder in deze sessie gelezen is.

- [ ] **Step 2: Stel de wijziging voor als een diff, zonder te committen**

Toon de beheerder een `diff`-achtige weergave: in de `traefik`-service se `networks:`-lijst
`net-fe-gvprlg` toevoegen, en onderaan bij de netwerkdefinities:
```yaml
  net-fe-gvprlg:
    external: true
```
Dit is de **enige** wijziging in sovereign-stack die dit plan voorstelt (spec §7).

- [ ] **Step 3: Wacht op expliciete goedkeuring**

Dit is de grens van dit plan. Niet zelf committen of pushen naar `sovereign-stack` — dat
raakt een andere, levende infrastructuur-repo en vraagt de beheerder's expliciete "ja, zet
dit door" ná het zien van de exacte diff (CFT-werkwijze regel 2). Rapporteer de voorgestelde
diff en stop.
