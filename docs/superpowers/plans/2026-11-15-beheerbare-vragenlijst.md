# Beheerbare vragenlijst, platformen en businessunits — Implementation Plan

> **For agentic workers:** one implementer executes all tasks in order on `main`, one commit or more
> per task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move axes, questions, platforms and business units from `src/service/config.ts` into
relational tables managed in the app, frozen per measurement year, with business units (scored)
grouped under platforms (user groups) and a free-text "Aanwezigen" field per scored business unit.

**Architecture:** Catalogue tables (current list) plus per-meting snapshot tables filled in the same
transaction as the first save of that year; score rows reference the snapshot with composite foreign
keys. Every calculation and screen receives the list of its year as a parameter instead of importing
`CONFIG`.

**Tech Stack:** Next.js 16 (read `AGENTS.md`; docs in `node_modules/next/dist/docs/`), Prisma 7,
PostgreSQL, next-auth 4, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-beheerbare-vragenlijst-design.md` (binding; §2 and §10
are decisions, §11 is left to the builder).

## Global Constraints

- Layering UI → Process → Integration → Service → Data, no new violations; TypeScript strict, no
  `any`; Zod on every input; RFC 9457 problem+json; max 300 lines per file, 40 per function; JSDoc
  with `@param`/`@returns` on new functions; named exports only.
- UI text, user-facing errors: Dutch. Code, comments, logs, commits: English.
- Words: "platform" = user platform (group of invullers); "businessunit" = the scored unit. The
  wording guard `app/woordkeuze.test.ts` (`volwassen|voorzitter`) stays green.
- Keys are opaque and never derived from names for new rows (cuid). Existing rows keep their current
  slug as key (`common-ground-standaarden`, `belastingen`, ...) so existing URLs, `platform_invullers`
  rows and audit details keep working. Migrated platform and its business unit both get the old slug.
- Deletion in the catalogue is soft (`vervallen`); keys are never reused; colours are never reused.
- Palettes: business units 8 colours (the current 5 first, in order), axes 6 colours (current 3
  first, each WCAG AA as text on white). Validate with
  `node "C:\Users\RALPHW~1\AppData\Local\Temp\claude\bundled-skills\2.1.323\bc847a03cf7e807a51dca40eb7f3d570\dataviz\scripts\validate_palette.js" "<hex,...>" --mode light`
  and record the output in the report.
- NDS themes and the 1–5 scale stay in code (`CONFIG.ndsThemas`, `CONFIG.schaal`); `CONFIG.assen` and
  `CONFIG.platformen` disappear.
- No new dependencies. No push, no deploy, nothing on VPS-001. No subagents.
- Commits: English, never a `Co-Authored-By` line, last line
  `Claude-Session: https://claude.ai/code/session_01S794csvyeenF1qqFS3DBVX`.
- Do not touch untracked `GVPRLG-Volwassenheidsmeting.xlsx` or `varianten/*.html`.

## Definition of Done (the judge checks exactly this)

1. A `beheerder` can, through the UI, add, edit, remove and restore a **question**, an **axis**, a
   **platform** and a **business unit**, and reorder questions/axes and business units; one
   Playwright journey per entity proves it.
2. Changing the catalogue changes open years and never a frozen year: a frozen year keeps its texts,
   questions, business units, platform grouping and averages (integration test + E2E).
3. A year freezes on the first saved business-unit row (also a concept without scores); a beheerder
   can unfreeze a year only when it holds no score, toelichting, algemene toelichting or aanwezigen.
4. A second business unit under one platform can be filled in by the same invuller (E2E); a new
   business unit, platform or question starts without scores or trend.
5. "Aanwezigen" is saved with concept and definitief, shown on the result page, read-only for `lezer`.
6. Every catalogue write and unfreeze by a non-beheerder returns 403 and is audited as a denial; every
   successful write is audited with old and new value.
7. The database refuses a score for a question or business unit that is not in that year's snapshot
   (integration test against Postgres).
8. Migration: on a database with the old schema and data shaped like production (2 frozen-to-be years
   with scores, 3 empty years) it yields identical per-axis and total averages per business unit, and
   it aborts with a clear error when a score row has an unknown question or platform id (tests).
9. Rules enforced server-side with Dutch messages: fewer than 3 active questions refused; axis with
   active questions cannot be removed; platform with active business units cannot be removed; no
   free colour refused; short label > 22 chars refused; restoring a question into a removed axis
   refused.
10. `git grep -n "CONFIG\.\(assen\|platformen\)" -- src app` returns nothing.
11. `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.build.json`, `npx vitest run`, full
    `npx playwright test`, and the deploy-gate block (copy without `.dockerignore` paths +
    `tsc -p tsconfig.build.json`) are green; `api/specs/gvprlg.yaml` describes every new or changed
    endpoint; README runbook mentions the new beheer pages.

## Review Focus

1. Two first saves of the same open year at the same moment → exactly one snapshot, both saves land
   (Task 2 test with two parallel transactions).
2. Catalogue edited while an invuller has the form of an open year open, then saves → the save uses
   the list at save time and the server rejects question ids not in it with a Dutch 400 (Task 2).
3. E2E runs mutate the shared catalogue → each journey restores what it changed or uses items it
   created itself, so reruns and parallel workers stay green (Task 6).
4. A removed business unit with scores in frozen years still appears with its old name and colour in
   trend and year table, and not in open years (Task 3 service test).
5. Renaming a platform or business unit leaves invuller links, audit filter and old URLs working
   (Task 4 test).

---

### Task 1: Schema, migration and repositories

**Files:** `prisma/schema.prisma`; new migration under `prisma/migrations/`; new
`src/data/catalogusRepository.ts`, `src/data/vragenlijstRepository.ts` (+ colocated tests); modify
`src/data/metingenRepository.ts`.

**Interfaces — Produces:**
- Prisma models (names fixed): `As`, `Vraag`, `Platform`, `BusinessUnit` (catalogue, each with
  `id`, `volgorde Int`, `vervallen Boolean @default(false)`, timestamps; `Vraag.asId`,
  `BusinessUnit.platformId`, `BusinessUnit.kleur`, `As.kleur`, `Vraag.kort`, `Vraag.tekst`,
  `Vraag.nds String?`); snapshot `MetingAs`, `MetingVraag`, `MetingPlatform`, `MetingBusinessUnit`,
  each keyed `@@id([metingId, <entity>Id])` with the copied fields; `Meting.vastgelegdOp DateTime?`.
- `PlatformScore` becomes `BusinessUnitScore` (table `business_unit_scores`, column
  `businessUnitId`, new column `aanwezigen String @default("")`), composite FK
  `(metingId, businessUnitId)` → `MetingBusinessUnit`; `VraagScore` gets `metingId` and composite FK
  `(metingId, vraagId)` → `MetingVraag`. `PlatformInvuller.platformId` gets FK → `Platform`.
- `type Vragenlijst = { jaar: number; vastgelegd: boolean; assen: LijstAs[]; platformen: LijstPlatform[]; businessUnits: LijstBusinessUnit[] }`
  with `LijstAs = { id; naam; kleur; vragen: LijstVraag[] }`, `LijstVraag = { id; asId; kort; tekst; nds?: string }`,
  `LijstPlatform = { id; naam; businessUnitIds: string[] }`, `LijstBusinessUnit = { id; platformId; naam; kleur }`,
  all ordered. Exported from `src/data/vragenlijstRepository.ts`.
- `leesVragenlijst(jaar: number): Promise<Vragenlijst | null>` (snapshot if frozen, otherwise active
  catalogue; null if the meting does not exist).
- `legVast(tx, metingId): Promise<void>` idempotent and race-safe (row lock on the meting).

- [ ] Write failing tests: migration on a fresh DB yields the 3/16/5/5 catalogue equal to the old
  `config.ts`; migration fixture (old schema + scores for two years) yields identical averages;
  orphan fixture aborts with an error naming the id; FK rejects a `vraag_scores` row whose question
  is not in the year snapshot; `leesVragenlijst` returns catalogue for open and snapshot for frozen
  years; two parallel `legVast` produce one snapshot.
- [ ] Run, see them fail. Implement. Run, see them pass. Commit.

### Task 2: Process and service on the year list

**Files:** `src/service/{scores,overzichtCijfers,overzichtAnalyse,kerncijfers,openingszin,gespreksonderwerpen}.ts`,
`src/process/{platformWorkflow,overzicht,toegang}.ts`, `src/integration/schemas.ts`,
`src/service/config.ts` (+ tests).

**Interfaces:** every service function that used `CONFIG.assen`/`CONFIG.platformen` takes
`lijst: Vragenlijst` (or the subset it needs) as first parameter. `slaBusinessUnitOp(...)` in the
process layer freezes the year in the same transaction, validates question ids against the list at
save time (Dutch 400 "Deze vraag hoort niet bij de vragenlijst van {jaar}."), stores `aanwezigen`
(max 2000). Write access: invuller linked to the business unit's platform in that year; `lezer`
always 403 `alleen-lezen` (unchanged).

- [ ] Failing tests for Review Focus 1, 2 and 4, for freeze-on-concept-without-scores, and for the
  cross-year comparison rules (axis by key, question only when in both years, business unit only when
  in both years; R1–R3 unchanged). Implement, pass, commit.

### Task 3: Read APIs and score API

**Files:** `app/api/metingen/[jaar]/vragenlijst/route.ts` (new, GET, any active user);
rename `app/api/metingen/[jaar]/platformen/[platformId]` → `app/api/metingen/[jaar]/businessunits/[businessUnitId]`
(incl. `heropenen`); `app/api/overzicht/route.ts` (per year the business units with name, colour,
platform name); `api/specs/gvprlg.yaml` (+ route tests happy and error path).

- [ ] Failing route tests, implement, pass, commit.

### Task 4: Catalogue management API with audit

**Files:** `app/api/beheer/catalogus/route.ts` (GET full catalogue incl. vervallen, any active user);
`app/api/beheer/{assen,vragen,platformen,businessunits}/route.ts` (POST) and `[id]/route.ts` (PATCH
fields incl. `vervallen`), `[id]/verplaats/route.ts` (POST `{ richting: 'omhoog' | 'omlaag' }`);
`app/api/beheer/metingen/[jaar]/vrijgeven/route.ts` (POST unfreeze); process module
`src/process/catalogusWorkflow.ts`; Zod schemas in `src/integration/catalogusSchemas.ts`.

- [ ] Failing tests for every rule in DoD 9, for 403 + denial audit (DoD 6), for audit old→new
  values, for Review Focus 5, for unfreeze allowed/refused (DoD 3), for a removed platform dropping
  its invuller links in open years with audit. Implement, pass, OpenAPI, commit.

### Task 5: Screens read the year list; wording; Aanwezigen

**Files:** `app/metingen/[jaar]/[platformId]` → `app/metingen/[jaar]/[businessUnitId]` (form and
result), `app/metingen/[jaar]/page.tsx`, `app/page.tsx` components under `src/ui/components/overzicht`,
`src/ui/components/{VraagDetail,_spinnenwebSpaken,_kruimelpad,PlatformStatus}.ts*`,
`src/ui/components/beheer/{PlatformKeuze,GebruikersTabel,AuditFilters}.tsx`; new hook
`src/ui/hooks/useVragenlijst.ts` (`useVragenlijst(jaar)` → `GET /api/metingen/{jaar}/vragenlijst`).

- [ ] Texts about the scored unit say "businessunit" (e.g. "Trend per businessunit",
  "{n} van {m} businessunits afgerond"); the year page groups business units under their platform
  name when a platform has more than one. Form gets "Aanwezigen" (textarea, label "Aanwezigen",
  hint "Wie waren erbij?"), disabled for lezer; result page shows it. Update existing E2E selectors
  minimally. tsc, vitest, Playwright green; commit.

### Task 6: Beheer pages and journeys

**Files:** `app/beheer/vragenlijst/page.tsx`, `app/beheer/businessunits/page.tsx`, components under
`src/ui/components/beheer/catalogus/`; side menu items "Vragenlijst" and "Businessunits" under Beheer
(visible to every active user; edit controls only for beheerder); `tests/gvprlg-catalogus.spec.js`;
README runbook section; dev seed if needed.

- [ ] Tables follow spec §6 (group header rows, stacked view at 390 px like the users table, removed
  items in a collapsed section with "Weer actief maken", confirm dialogs explaining frozen years stay
  unchanged, list of open years that take over the change). Journeys for DoD 1, 2, 4, 5 and Review
  Focus 3. Full suite green; commit.

## Report

Write nothing to files outside the repo; return the report as text: per task what was built, commits,
test counts, palette validator output, deviations from spec/plan with reason.
