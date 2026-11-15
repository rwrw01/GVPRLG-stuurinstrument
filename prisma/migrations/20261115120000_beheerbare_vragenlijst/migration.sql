-- Managed questionnaire: catalogue tables (assen, vragen, platformen, business_units) filled with
-- the former src/service/config.ts, a frozen copy per meting, and scores that reference the copy of
-- their year with composite foreign keys. Existing slugs stay the keys, so URLs, platform_invullers
-- rows and audit details keep working. Every meting that already has a platform_scores row is frozen
-- with exactly this list; years without rows keep following the catalogue.

-- 1. Abort before any change when a row references an id that is not in the current list.
DO $$
DECLARE
  onbekend TEXT;
BEGIN
  SELECT ps."platformId" INTO onbekend FROM "platform_scores" ps
   WHERE NOT (ps."platformId" = ANY (ARRAY['belastingen', 'ro', 'burgerzaken', 'sociaal-domein', 'informatievoorziening']))
   LIMIT 1;
  IF onbekend IS NOT NULL THEN
    RAISE EXCEPTION 'Migration beheerbare_vragenlijst aborted: platform_scores has a row with unknown platform id "%". Nothing was changed.', onbekend;
  END IF;

  SELECT vs."vraagId" INTO onbekend FROM "vraag_scores" vs
   WHERE NOT (vs."vraagId" = ANY (ARRAY[
     'common-ground-standaarden', 'cloud-data', 'ai-integratie', 'digitale-weerbaarheid',
     'capaciteit-kennis', 'digitaal-vakmanschap', 'klantbetrokkenheid', 'opleiding-continuiteit',
     'dienstverlening-nps', 'release-incident', 'roadmap-transparantie', 'burgers-ondernemers-centraal',
     'prijsbeleid', 'lifecyclemanagement', 'partner-productontwikkeling', 'partner-dienstverlening']))
   LIMIT 1;
  IF onbekend IS NOT NULL THEN
    RAISE EXCEPTION 'Migration beheerbare_vragenlijst aborted: vraag_scores has a row with unknown question id "%". Nothing was changed.', onbekend;
  END IF;

  SELECT pi."platformId" INTO onbekend FROM "platform_invullers" pi
   WHERE NOT (pi."platformId" = ANY (ARRAY['belastingen', 'ro', 'burgerzaken', 'sociaal-domein', 'informatievoorziening']))
   LIMIT 1;
  IF onbekend IS NOT NULL THEN
    RAISE EXCEPTION 'Migration beheerbare_vragenlijst aborted: platform_invullers has a row with unknown platform id "%". Nothing was changed.', onbekend;
  END IF;
END $$;

-- 2. Catalogue tables.
CREATE TABLE "assen" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "kleur" TEXT NOT NULL,
    "volgorde" INTEGER NOT NULL,
    "vervallen" BOOLEAN NOT NULL DEFAULT false,
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gewijzigd" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assen_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vragen" (
    "id" TEXT NOT NULL,
    "asId" TEXT NOT NULL,
    "kort" TEXT NOT NULL,
    "tekst" TEXT NOT NULL,
    "nds" TEXT,
    "volgorde" INTEGER NOT NULL,
    "vervallen" BOOLEAN NOT NULL DEFAULT false,
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gewijzigd" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vragen_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platformen" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "volgorde" INTEGER NOT NULL,
    "vervallen" BOOLEAN NOT NULL DEFAULT false,
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gewijzigd" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platformen_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_units" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "kleur" TEXT NOT NULL,
    "volgorde" INTEGER NOT NULL,
    "vervallen" BOOLEAN NOT NULL DEFAULT false,
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gewijzigd" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assen_kleur_key" ON "assen"("kleur");
CREATE UNIQUE INDEX "business_units_kleur_key" ON "business_units"("kleur");
ALTER TABLE "vragen" ADD CONSTRAINT "vragen_asId_fkey" FOREIGN KEY ("asId") REFERENCES "assen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platformen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Fill the catalogue with the former config.ts (same ids, texts, colours and order).
INSERT INTO "assen" ("id", "naam", "kleur", "volgorde", "gewijzigd") VALUES
  ('techniek', 'Techniek', '#1F6FB8', 0, CURRENT_TIMESTAMP),
  ('mens', 'Mens', '#15803D', 1, CURRENT_TIMESTAMP),
  ('proces', 'Proces', '#C2410C', 2, CURRENT_TIMESTAMP);

INSERT INTO "vragen" ("id", "asId", "kort", "tekst", "nds", "volgorde", "gewijzigd") VALUES
  ('common-ground-standaarden', 'techniek', 'Common Ground', 'De producten voldoen aan Common Ground-principes en open standaarden (API-first, ZGW-API''s, iConnect, scheiding data/logica)', 'Open', 0, CURRENT_TIMESTAMP),
  ('cloud-data', 'techniek', 'Cloud & data', 'De producten zijn volwaardige SaaS-oplossingen met datagedreven werken: data via API''s beschikbaar voor analyse en veilig deelbaar over overheidslagen', 'Cloud', 1, CURRENT_TIMESTAMP),
  ('ai-integratie', 'techniek', 'AI', 'AI is concreet en bruikbaar onderdeel van de productportfolio (werkende functionaliteit, niet alleen visie) en hierover zijn risicoanalyses uitgevoerd en een AI-act assessment van beschikbaar', 'AI', 2, CURRENT_TIMESTAMP),
  ('digitale-weerbaarheid', 'techniek', 'Digitale weerbaarheid', 'De producten voldoen aan actuele security-eisen (BIO, NIS2, pentesting) en verminderen leveranciersafhankelijkheid', 'Digitale weerbaarheid en autonomie', 3, CURRENT_TIMESTAMP),
  ('capaciteit-kennis', 'mens', 'Capaciteit & kennis', 'De personele capaciteit (aantal en kennisniveau) is op orde om producten te ondersteunen en door te ontwikkelen en heeft een meerjaars forecast', NULL, 0, CURRENT_TIMESTAMP),
  ('digitaal-vakmanschap', 'mens', 'Digitaal vakmanschap', 'PinkRoccade investeert aantoonbaar in kennisontwikkeling (nieuwe technologieën, AI, Common Ground) en ondersteunt gemeenten hierbij', 'Digitaal vakmanschap', 1, CURRENT_TIMESTAMP),
  ('klantbetrokkenheid', 'mens', 'Klantbetrokkenheid', 'Gebruikers worden structureel betrokken bij doorontwikkeling (co-creatie, klankbordgroepen, roadmap-invloed) en de betrokkenheid wordt op kwaliteit en kwantiteit periodiek geëvalueerd', NULL, 2, CURRENT_TIMESTAMP),
  ('opleiding-continuiteit', 'mens', 'Opleiding & borging', 'Training, documentatie en support zijn op orde; kennisborging is geborgd en niet afhankelijk van individuen', NULL, 3, CURRENT_TIMESTAMP),
  ('dienstverlening-nps', 'proces', 'Dienstverlening & NPS', 'De dienstverlening is uniform tussen businessunits; NPS en klanttevredenheid worden structureel gemeten en vertaald naar verbeteracties en gepubliceerd', NULL, 0, CURRENT_TIMESTAMP),
  ('release-incident', 'proces', 'Releases & incidenten', 'Releases zijn voorspelbaar en goed gecommuniceerd; incidenten worden snel en transparant conform SLA afgehandeld', NULL, 1, CURRENT_TIMESTAMP),
  ('roadmap-transparantie', 'proces', 'Roadmap', 'De productroadmap is transparant, realistisch en sluit aan bij NDS-prioriteiten en gemeentelijke behoeften', NULL, 2, CURRENT_TIMESTAMP),
  ('burgers-ondernemers-centraal', 'proces', 'Burger centraal', 'De producten stellen gemeenten in staat burgers en ondernemers als één overheid te bedienen met geïntegreerde digitale dienstverlening', 'Burgers en ondernemers centraal', 3, CURRENT_TIMESTAMP),
  ('prijsbeleid', 'proces', 'Prijsbeleid', 'Prijsbeleid (inclusief offertes) is uitlegbaar en marktconform en hanteert een voorspelbaar proces', NULL, 4, CURRENT_TIMESTAMP),
  ('lifecyclemanagement', 'proces', 'Lifecycle', 'Lifecyclemanagement volgt de afspraken van de uitvloeiingsregeling', NULL, 5, CURRENT_TIMESTAMP),
  ('partner-productontwikkeling', 'proces', 'Partner: product', 'PinkRoccade is een partner van betekenis: de productontwikkeling sluit voldoende aan bij de wensen en eisen die vanuit de markt (gemeenten) worden gesteld', NULL, 6, CURRENT_TIMESTAMP),
  ('partner-dienstverlening', 'proces', 'Partner: diensten', 'PinkRoccade is een partner van betekenis: de dienstverlening sluit voldoende aan bij de wensen en eisen die vanuit de markt (gemeenten) worden gesteld', NULL, 7, CURRENT_TIMESTAMP);

-- Each former unit becomes a platform with exactly one business unit, both with the old slug and name.
INSERT INTO "platformen" ("id", "naam", "volgorde", "gewijzigd") VALUES
  ('belastingen', 'Belastingen', 0, CURRENT_TIMESTAMP),
  ('ro', 'R&O', 1, CURRENT_TIMESTAMP),
  ('burgerzaken', 'Burgerzaken', 2, CURRENT_TIMESTAMP),
  ('sociaal-domein', 'Sociaal Domein', 3, CURRENT_TIMESTAMP),
  ('informatievoorziening', 'Informatievoorziening', 4, CURRENT_TIMESTAMP);

INSERT INTO "business_units" ("id", "platformId", "naam", "kleur", "volgorde", "gewijzigd") VALUES
  ('belastingen', 'belastingen', 'Belastingen', '#2a78d6', 0, CURRENT_TIMESTAMP),
  ('ro', 'ro', 'R&O', '#eb6834', 0, CURRENT_TIMESTAMP),
  ('burgerzaken', 'burgerzaken', 'Burgerzaken', '#1baf7a', 0, CURRENT_TIMESTAMP),
  ('sociaal-domein', 'sociaal-domein', 'Sociaal Domein', '#eda100', 0, CURRENT_TIMESTAMP),
  ('informatievoorziening', 'informatievoorziening', 'Informatievoorziening', '#e87ba4', 0, CURRENT_TIMESTAMP);

ALTER TABLE "platform_invullers" ADD CONSTRAINT "platform_invullers_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platformen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Snapshot tables.
ALTER TABLE "metingen" ADD COLUMN "vastgelegdOp" TIMESTAMP(3);

CREATE TABLE "meting_assen" (
    "metingId" TEXT NOT NULL,
    "asId" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "kleur" TEXT NOT NULL,
    "volgorde" INTEGER NOT NULL,
    CONSTRAINT "meting_assen_pkey" PRIMARY KEY ("metingId","asId")
);

CREATE TABLE "meting_vragen" (
    "metingId" TEXT NOT NULL,
    "vraagId" TEXT NOT NULL,
    "asId" TEXT NOT NULL,
    "kort" TEXT NOT NULL,
    "tekst" TEXT NOT NULL,
    "nds" TEXT,
    "volgorde" INTEGER NOT NULL,
    CONSTRAINT "meting_vragen_pkey" PRIMARY KEY ("metingId","vraagId")
);

CREATE TABLE "meting_platformen" (
    "metingId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "volgorde" INTEGER NOT NULL,
    CONSTRAINT "meting_platformen_pkey" PRIMARY KEY ("metingId","platformId")
);

CREATE TABLE "meting_business_units" (
    "metingId" TEXT NOT NULL,
    "businessUnitId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "kleur" TEXT NOT NULL,
    "volgorde" INTEGER NOT NULL,
    CONSTRAINT "meting_business_units_pkey" PRIMARY KEY ("metingId","businessUnitId")
);

ALTER TABLE "meting_assen" ADD CONSTRAINT "meting_assen_metingId_fkey" FOREIGN KEY ("metingId") REFERENCES "metingen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meting_assen" ADD CONSTRAINT "meting_assen_asId_fkey" FOREIGN KEY ("asId") REFERENCES "assen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meting_vragen" ADD CONSTRAINT "meting_vragen_metingId_fkey" FOREIGN KEY ("metingId") REFERENCES "metingen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meting_vragen" ADD CONSTRAINT "meting_vragen_vraagId_fkey" FOREIGN KEY ("vraagId") REFERENCES "vragen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meting_vragen" ADD CONSTRAINT "meting_vragen_metingId_asId_fkey" FOREIGN KEY ("metingId", "asId") REFERENCES "meting_assen"("metingId", "asId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meting_platformen" ADD CONSTRAINT "meting_platformen_metingId_fkey" FOREIGN KEY ("metingId") REFERENCES "metingen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meting_platformen" ADD CONSTRAINT "meting_platformen_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platformen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meting_business_units" ADD CONSTRAINT "meting_business_units_metingId_fkey" FOREIGN KEY ("metingId") REFERENCES "metingen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meting_business_units" ADD CONSTRAINT "meting_business_units_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "business_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meting_business_units" ADD CONSTRAINT "meting_business_units_metingId_platformId_fkey" FOREIGN KEY ("metingId", "platformId") REFERENCES "meting_platformen"("metingId", "platformId") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Freeze every meting that already has a platform row, with the list above. The moment is the
--    earliest save of that year.
UPDATE "metingen" m SET "vastgelegdOp" = eerste.op
  FROM (SELECT "metingId", MIN("laatstGewijzigdOp") AS op FROM "platform_scores" GROUP BY "metingId") eerste
 WHERE eerste."metingId" = m."id";

INSERT INTO "meting_assen" ("metingId", "asId", "naam", "kleur", "volgorde")
SELECT m."id", a."id", a."naam", a."kleur", a."volgorde" FROM "metingen" m CROSS JOIN "assen" a WHERE m."vastgelegdOp" IS NOT NULL;

INSERT INTO "meting_vragen" ("metingId", "vraagId", "asId", "kort", "tekst", "nds", "volgorde")
SELECT m."id", v."id", v."asId", v."kort", v."tekst", v."nds", v."volgorde" FROM "metingen" m CROSS JOIN "vragen" v WHERE m."vastgelegdOp" IS NOT NULL;

INSERT INTO "meting_platformen" ("metingId", "platformId", "naam", "volgorde")
SELECT m."id", p."id", p."naam", p."volgorde" FROM "metingen" m CROSS JOIN "platformen" p WHERE m."vastgelegdOp" IS NOT NULL;

INSERT INTO "meting_business_units" ("metingId", "businessUnitId", "platformId", "naam", "kleur", "volgorde")
SELECT m."id", b."id", b."platformId", b."naam", b."kleur", b."volgorde" FROM "metingen" m CROSS JOIN "business_units" b WHERE m."vastgelegdOp" IS NOT NULL;

-- 6. platform_scores becomes business_unit_scores (the old platform id is the business unit id).
ALTER TABLE "vraag_scores" DROP CONSTRAINT "vraag_scores_platformScoreId_fkey";
ALTER TABLE "platform_scores" RENAME TO "business_unit_scores";
ALTER TABLE "business_unit_scores" RENAME COLUMN "platformId" TO "businessUnitId";
ALTER TABLE "business_unit_scores" ADD COLUMN "aanwezigen" TEXT NOT NULL DEFAULT '';
ALTER TABLE "business_unit_scores" RENAME CONSTRAINT "platform_scores_pkey" TO "business_unit_scores_pkey";
ALTER TABLE "business_unit_scores" RENAME CONSTRAINT "platform_scores_metingId_fkey" TO "business_unit_scores_metingId_fkey";
ALTER INDEX "platform_scores_metingId_platformId_key" RENAME TO "business_unit_scores_metingId_businessUnitId_key";
CREATE UNIQUE INDEX "business_unit_scores_id_metingId_key" ON "business_unit_scores"("id", "metingId");
ALTER TABLE "business_unit_scores" ADD CONSTRAINT "business_unit_scores_metingId_businessUnitId_fkey" FOREIGN KEY ("metingId", "businessUnitId") REFERENCES "meting_business_units"("metingId", "businessUnitId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- 7. vraag_scores gets its meting and references the question of that year.
ALTER TABLE "vraag_scores" RENAME COLUMN "platformScoreId" TO "businessUnitScoreId";
ALTER INDEX "vraag_scores_platformScoreId_vraagId_key" RENAME TO "vraag_scores_businessUnitScoreId_vraagId_key";
ALTER TABLE "vraag_scores" ADD COLUMN "metingId" TEXT;
UPDATE "vraag_scores" vs SET "metingId" = b."metingId" FROM "business_unit_scores" b WHERE b."id" = vs."businessUnitScoreId";
ALTER TABLE "vraag_scores" ALTER COLUMN "metingId" SET NOT NULL;
ALTER TABLE "vraag_scores" ADD CONSTRAINT "vraag_scores_businessUnitScoreId_metingId_fkey" FOREIGN KEY ("businessUnitScoreId", "metingId") REFERENCES "business_unit_scores"("id", "metingId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vraag_scores" ADD CONSTRAINT "vraag_scores_metingId_vraagId_fkey" FOREIGN KEY ("metingId", "vraagId") REFERENCES "meting_vragen"("metingId", "vraagId") ON DELETE NO ACTION ON UPDATE CASCADE;
