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

## Ontwikkelen (backend)

```bash
cp .env.example .env
cp .env.test.example .env.test
docker compose -f docker-compose.dev.yml up -d
npx prisma migrate deploy
npm install
npm run dev
```

`npm run test:unit` draait tegen de database in `.env.test` (een apart `_test`-gesufixte
database op dezelfde lokale Postgres) — nooit tegen de interactieve dev-database in `.env`.

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

## Dependencies en licenties

| Package | Versie | Licentie |
|---|---|---|
| next | 16.4.0 | MIT |
| react | 19.0.0 | MIT |
| react-dom | 19.0.0 | MIT |
| zod | 4.6.5 | MIT |
| @prisma/client | 7.10.0 | Apache-2.0 |
| @prisma/adapter-pg | 7.10.0 | Apache-2.0 |
| xlsx | 0.18.5 | Apache-2.0 |
| dotenv | 17.4.2 | BSD-2-Clause |
| prisma (CLI) | 7.10.0 | Apache-2.0 |
| typescript | 7.0.2 | Apache-2.0 |
| vitest | 5.0.3 | MIT |
| @playwright/test | 1.58.2 | Apache-2.0 |
| serve | 14.2.6 | MIT |
| @types/node | 24.0.0 | MIT |
| @types/react | 19.0.0 | MIT |
| @types/react-dom | 19.0.0 | MIT |

## Licentie

EUPL-1.2 — zie [LICENSE](LICENSE).
