# Ontwerp: beheerbare vragenlijst, platformen en businessunits (relationeel, vastgelegd per meetjaar)

**Datum:** 2026-11-15
**Status:** concept, ter goedkeuring door de opdrachtgever

## 1. Doel en waarom

De vragen, de assen waar ze onder hangen en de beoordeelde eenheden (in de app nu "platformen")
staan vast in `src/service/config.ts`. Elke wijziging vraagt een codewijziging en een deploy. De opdrachtgever
wil ze **relationeel** opbouwen: als tabellen in de database die een beheerder in de app muteert.
Het startscherm, de jaarpagina's, de webben en het invulformulier volgen daaruit.

**Succes (woorden van de opdrachtgever):** vragen kunnen aangepast, toegevoegd en verwijderd worden,
en zo ook businessunits. De assen ("hoofdlabels", nu Techniek, Mens, Proces) zijn ook muteerbaar.

**Werkruimte:** maximaal 5 iteraties van bouwen en reviewen.

## 2. Besluiten van de opdrachtgever (bindend)

1. **Vier beheerbare lijsten:** assen, vragen (elke vraag hangt aan één as), platformen en
   businessunits (elke businessunit hoort bij één platform).
   - Een **platform** is een gebruikersplatform van de vereniging; invullers horen bij een platform.
   - Een **businessunit** is het onderdeel van PinkRoccade dat beoordeeld wordt; elke businessunit
     krijgt per meetjaar een eigen ingevulde vragenlijst.
   - Een platform kan meerdere businessunits vertegenwoordigen (voorbeeld: Informatievoorziening
     met twee businessunits en één invuller die beide vragenlijsten invult).
   - **Alle koppelingen lopen via sleutels,** niet via namen. Namen zijn variabel: platformen en
     businessunits kunnen erbij komen en hernoemd worden zonder dat koppelingen of geschiedenis
     breken. Sleutels zijn nooit zichtbaar of door de gebruiker te kiezen.
2. **Variant A: elk meetjaar bewaart zijn eigen vragenlijst.** Een wijziging geldt voor nieuwe
   metingen; eerdere jaren blijven exact zoals ze zijn ingevuld, met de tekst die de invullers toen
   zagen.
3. **Bouwwijze optie 1:** beheertabellen plus een vastgelegde kopie per meetjaar, ook als tabellen,
   met harde verwijzingen (foreign keys) van scores naar de vraag van dat jaar. Niet als JSON-blok,
   niet als één lijst met geldigheidsjaren.
4. **Akkoord op de voorstellen (2026-11-15):**
   - *Vastleggen:* een meetjaar volgt de actuele lijsten tot de eerste score van dat jaar is
     opgeslagen; vanaf dat moment ligt de lijst van dat jaar vast. 2024 en 2025 krijgen bij de
     overgang precies de huidige 16 vragen, 3 assen en 5 businessunits (elk met een eigen platform, zie §10.7). De lege jaren 2026 tot en
     met 2028 volgen nog de actuele lijst.
   - *Wijzigen versus vervangen:* een wijziging van tekst, kort label of NDS-thema houdt dezelfde
     vraag; de trend per vraag loopt door. Bij een wezenlijk andere betekenis verwijdert de beheerder
     de vraag en voegt een nieuwe toe; die begint zonder trend. Een as met een nieuwe naam is dezelfde
     as.
   - *Verwijderen:* betekent "niet meer in nieuwe metingen". In jaren waarin het al vastlag blijft
     het zichtbaar met de scores van toen. Een as met (actieve) vragen eronder kan niet weg.
   - *Volgorde:* de beheerder bepaalt de volgorde van assen en van vragen binnen een as; die
     bepaalt de spaken in het web.
   - *Ondergrens:* minstens 3 actieve vragen in totaal (een web heeft 3 spaken nodig) en geen
     actieve as zonder actieve vragen.
   - *Kleuren:* een nieuwe businessunit of as krijgt automatisch de volgende vrije kleur uit een
     vast, op kleurenblindheid gevalideerd palet. Ruimte voor 8 businessunits; daarboven weigert de
     app tot er een kleur bij komt.
   - *Rechten en audit:* alleen `beheerder` wijzigt; elke wijziging komt in het auditlog met oude
     en nieuwe waarde. Invullers en lezers kunnen de lijsten inzien.
   - *Plek:* onder Beheer twee nieuwe menu-items: **Vragenlijst** (assen met hun vragen in één
     tabel) en **Businessunits**.
   - *Wat vast blijft:* de NDS-thema's en de schaal 1 tot en met 5 blijven in de code.
5. **Aanwezigen:** bij het vastleggen van een meting per businessunit komt een **vrij tekstveld
   "Aanwezigen"**, zodat duidelijk is wie erbij waren. Het is bewust vrije tekst (geen koppeling aan
   gebruikers, geen structuur).

## 3. Doelen, niet-doelen, anti-doelen

**Doelen**
- Assen, vragen en businessunits toevoegen, wijzigen, verwijderen (en een businessunit laten
  vervallen) vanuit de app, zonder deploy.
- Geschiedenis is hard geborgd: een score verwijst via de database naar de vraag zoals die in dat
  jaar gold.
- Alle schermen en rekenregels lezen de lijst van het betreffende jaar, niet een globale constante.

**Niet-doelen**
- Beheer van NDS-thema's of de schaal.
- Wijzigen van de vragenlijst van een jaar dat al vastligt (ook niet "een vraag toevoegen aan 2026"
  nadat daar al een score is opgeslagen).
- Wegingen per vraag of per as; het totaal blijft het gemiddelde over alle beantwoorde vragen.
- Import/export van de vragenlijst.

**Anti-doelen (mislukt, ook als het technisch werkt)**
- Een oud jaar toont na een wijziging andere teksten, andere vragen of andere gemiddelden dan
  voorheen.
- Een trend verbindt twee verschillende vragen omdat een id is hergebruikt.
- Scores, toelichtingen of algemene toelichtingen van 2024 en 2025 gaan verloren bij de omzetting.
  (Aanwezigen bestaat nog niet; voor 2024 en 2025 blijft het leeg.)
- Een lezer of invuller kan de lijsten wijzigen (ook niet via directe API-aanroepen).

## 4. Approaches

| Optie | Kern | Afweging | Besluit |
|---|---|---|---|
| 1 Relationele kopie per jaar | Beheertabellen + per meetjaar kopietabellen; scores met FK naar de vraag van dat jaar | Meeste ombouw (scores krijgen een nieuwe verwijzing, 26 plekken lezen de lijst van het jaar); database bewaakt de samenhang | **Gekozen** |
| 2 JSON-kopie per jaar | Beheertabellen + per meting één JSON-blok in de vorm van de huidige `CONFIG` | Minder ombouw, maar geen databasebewaking tussen scores en vragen; minder relationeel dan gevraagd | Niet gekozen |
| 3 Geldigheidsjaren | Eén lijst met "geldig van/tot", geen kopie | Geen duplicatie, maar elke tekstwijziging wordt een nieuwe rijversie; beheer en queries complex voor enkele tientallen rijen | Niet gekozen |

## 5. Gegevensmodel (richting; namen zijn aan de bouwer)

**Beheertabellen (de actuele lijst)**
- `assen`: stabiele id, naam, kleur, volgorde, vervallen (ja/nee), tijdstempels.
- `vragen`: stabiele id, as-id (FK), kort label (max 22 tekens, spaaklabel), tekst, NDS-thema
  (optioneel, uit de vaste lijst in code), volgorde binnen de as, vervallen (ja/nee), tijdstempels.
- `platformen`: stabiele id, naam, volgorde, vervallen (ja/nee), tijdstempels.
- `business_units`: stabiele id, platform-id (FK), naam, kleur, volgorde, vervallen (ja/nee),
  tijdstempels.
- De koppeling van invullers (`platform_invullers`) verwijst met een sleutel naar het **platform**
  (per meetjaar, zoals nu). Een invuller van een platform mag alle businessunits van dat platform
  in dat jaar invullen.

Verwijderen in de beheertabellen is een **zachte verwijdering** (vervallen). Daardoor wordt een
sleutel nooit hergebruikt en verbindt een trend nooit twee verschillende vragen of businessunits.
Sleutels zijn ondoorzichtig en niet afgeleid van namen; hernoemen verandert nooit een sleutel. Of de
bestaande slugs (`common-ground-standaarden`, `belastingen`, ...) als sleutel blijven of worden
omgezet naar gegenereerde sleutels is aan de bouwer, zolang geen enkele koppeling (scores,
invullers, audit-detail, URL's) breekt.

**Kopie per meetjaar (vastgelegd)**
- Per meting: de assen, vragen, platformen en businessunits van dat jaar, met naam, tekst, kort
  label, kleur, NDS-thema, volgorde en de indeling businessunit → platform zoals ze golden, plus een
  verwijzing naar de stabiele sleutel voor de trend. Een latere herindeling of hernoeming verandert
  een vastgelegd jaar niet.
- Een meting heeft een tijdstip "vastgelegd op" (leeg zolang ze de actuele lijst volgt).
- De scorerij per businessunit (nu `platform_scores`) verwijst naar de businessunit van dat jaar en `vraag_scores` naar de vraag van
  dat jaar, beide met een foreign key. Een score voor een vraag of businessunit die niet in de lijst
  van dat jaar staat, is daarmee onmogelijk.
- De scorerij per businessunit krijgt het veld **aanwezigen** (vrije tekst).

**Vastleggen**
- Bij de eerste opgeslagen score van een meetjaar kopieert de app, in dezelfde transactie als het
  opslaan, de actieve assen, vragen en businessunits naar de kopie van dat jaar en zet "vastgelegd
  op". Twee gelijktijdige eerste opslagen mogen geen dubbele of halve kopie opleveren.
- Een jaar dat niet is vastgelegd toont overal de actuele (niet-vervallen) lijst.

**Omzetting (migratie)**
- De beheertabellen worden gevuld met de huidige inhoud van `config.ts` (zelfde ids, teksten,
  kleuren, volgorde).
- Elk meetjaar met scores (in productie 2024 en 2025; lokaal ook E2E-jaren) wordt vastgelegd met die
  lijst; bestaande scores krijgen de nieuwe verwijzingen. Jaren zonder scores blijven open.
- De migratie is te herhalen op een verse database en verliest geen enkele score, toelichting of
  algemene toelichting. Er is een terugweg (backup vóór de deploy; zie §9).

## 6. Gedrag in de app

**Beheer, Vragenlijst** (iedereen ingelogd ziet het; alleen `beheerder` ziet bewerkknoppen)
- Eén tabel: per as een kopregel (naam, kleur) met daaronder de vragen (kort label, tekst,
  NDS-thema). Acties: as toevoegen, hernoemen, verplaatsen, verwijderen; vraag toevoegen, wijzigen,
  naar een andere as verplaatsen, verplaatsen binnen de as, verwijderen.
- Bevestiging bij verwijderen, met de uitleg dat eerdere jaren ongewijzigd blijven.
- Duidelijke melding welke open meetjaren de wijziging overnemen en welke jaren al vastliggen.
- Fouten in het Nederlands, onder meer: as heeft nog vragen; minder dan 3 vragen; kort label
  langer dan 22 tekens; lege tekst; geen kleur meer vrij.

**Beheer, Platformen en businessunits** (zelfde opbouw als de vragenlijst)
- Eén tabel: per platform een kopregel (naam, status) met daaronder zijn businessunits (naam, kleur,
  status). Acties: platform toevoegen, hernoemen, verplaatsen, laten vervallen, weer actief maken;
  businessunit toevoegen, hernoemen, naar een ander platform verplaatsen, verplaatsen binnen het
  platform, laten vervallen, weer actief maken.
- Een platform met actieve businessunits kan niet vervallen; een platform zonder businessunits mag
  bestaan (zoals een lege as).
- Een vervallen businessunit doet niet mee in open meetjaren. Een vervallen platform: koppelingen
  van invullers aan dat platform in open meetjaren vervallen mee (met audit). In vastgelegde jaren
  blijft alles staan.
- Gebruikersbeheer en de platformkeuze tonen de platformen die in het gekozen jaar meedoen, met hun
  businessunits ter informatie; het auditfilter toont alle ooit bestaande.

**Woordkeuze**
- "Platform" betekent voortaan alleen het gebruikersplatform; "businessunit" de beoordeelde eenheid.
  Teksten die nu over de beoordeelde eenheid gaan worden "businessunit" (bijv. "Trend per
  businessunit", "3 van 6 businessunits afgerond"). Waar het platform van een businessunit iets
  toevoegt, staat de platformnaam erbij.

**Invulformulier, resultaat, jaarpagina, startscherm**
- Lezen de lijst van het betreffende jaar (vastgelegd of actueel).
- Het invulformulier krijgt het veld **Aanwezigen** (vrije tekst, bij de algemene toelichting);
  ook bij concept op te slaan; lezers zien het alleen-lezen; het resultaat toont het.
- Overzicht, trend en jarentabel tonen per businessunit; kleur hoort bij de businessunit.
- Vergelijkingen tussen jaren: per as op stabiele as-id; per businessunit op stabiele sleutel; per vraag alleen voor vragen die in beide
  jaren bestaan; businessunits alleen als ze in beide jaren meedoen. Bestaande regels R1-R3 uit het
  startschermontwerp blijven gelden.
- Een vervallen businessunit blijft in de trendgrafiek en de jarentabel zichtbaar voor de jaren
  waarin ze meedeed.

## 7. API

- Beheer-endpoints voor assen, vragen, platformen en businessunits (lijst, toevoegen, wijzigen, volgorde,
  verwijderen/vervallen), Zod-validatie, RFC 9457-fouten, alleen `beheerder` voor schrijven,
  iedereen actief ingelogd voor lezen.
- Een endpoint dat de vragenlijst van een meetjaar levert (vastgelegd of actueel), met per item de
  stabiele id; het invulformulier en de webben gebruiken dit in plaats van de import van `CONFIG`.
- De score-API accepteert `aanwezigen` en valideert vraag-ids tegen de lijst van dat jaar.
- `api/specs/gvprlg.yaml` wordt vóór of samen met de implementatie bijgewerkt.

## 8. Randvoorwaarden

- Laagindeling UI → Process → Integration → Service → Data; geen nieuwe overtredingen. De
  rekenregels in de Service-laag krijgen de lijst als parameter in plaats van `CONFIG` te importeren.
- Bestaande projectregels: TypeScript strict, geen `any`, Zod op alle invoer, max 300 regels per
  bestand en 40 per functie, UI-teksten Nederlands, code Engels, woordkeuzebewaking (`volwassen`,
  `voorzitter`) blijft groen.
- Kleurpaletten worden gevalideerd met de dataviz-validator; tekstkleur van assen haalt WCAG AA.
- Toegankelijkheid WCAG 2.2 AA voor de nieuwe beheertabellen, ook op 390 px (stapelweergave zoals de
  gebruikerstabel).
- Tests: unit- en integratietests voor elke nieuwe regel en elk endpoint (happy en error path);
  E2E-journeys voor vraag toevoegen/wijzigen/verwijderen, as toevoegen/verwijderen, businessunit
  toevoegen/laten vervallen, tweede businessunit onder één platform die dezelfde invuller kan
  invullen, hernoemen zonder verlies van koppelingen, vastleggen bij eerste score, oud jaar
  onveranderd, aanwezigen.
- De Docker-build en de deploy-gate blijven groen; niets op VPS-001 zonder apart akkoord.

## 9. Productie-overgang

- De migratie draait via de bestaande migrator bij de deploy. Vooraf een `pg_dump` van de
  productiedatabase op de VPS (apart akkoord), en een controle na de deploy dat 2024 en 2025 dezelfde
  gemiddelden tonen als vóór de deploy.
- Rollback: vorige images plus terugzetten van de dump.

## 10. Keuzes van de ontwerper na de bouwerscheck (te controleren door de opdrachtgever)

1. **Wat legt een jaar vast:** de eerste opgeslagen rij van een businessunit in dat jaar, ook een
   concept zonder scores (alleen toelichting of aanwezigen). Die rij heeft verwijzingen nodig, dus
   de kopie moet er dan zijn. De migratie legt elk jaar vast dat al een `platform_scores`-rij heeft.
2. **Terugweg:** een beheerder kan de lijst van een vastgelegd jaar weer openzetten zolang dat jaar
   geen enkele score, toelichting, algemene toelichting of aanwezigen bevat (er gaat dan niets
   verloren). De lege rijen en de kopie vervallen; audit legt het vast. In alle andere gevallen is
   een vastgelegd jaar definitief.
3. **Lege assen:** een as zonder actieve vragen mag in de beheertabel bestaan (zo kun je een as
   aanmaken en daarna vragen toevoegen). Bij het vastleggen worden alleen assen met actieve vragen
   gekopieerd. Een vraag verwijderen of verplaatsen wordt geweigerd als er daarna minder dan 3
   actieve vragen zijn; vastleggen wordt geweigerd bij minder dan 3 (met Nederlandse melding).
4. **Kleuren:** een kleur wordt nooit hergebruikt, ook niet na vervallen, zodat twee lijnen in één
   grafiek nooit dezelfde kleur hebben. Businessunits: vast palet van 8, dus maximaal 8 ooit
   aangemaakt (nu 5); daarboven een Nederlandse melding en een codewijziging om het palet uit te
   breiden. Assen: eigen palet van 6 kleuren, elk WCAG AA als tekstkleur, met dezelfde regel. De
   kopie per jaar bewaart de kleur.
5. **Terugzetten:** assen, vragen en businessunits kunnen alle drie "weer actief" worden gemaakt,
   met hun oude id, zodat de trend doorloopt. Een vraag terugzetten in een vervallen as kan pas als
   de as eerst weer actief is. De beheertabellen tonen vervallen items apart (ingeklapt).
6. **Wezen in productiedata:** als er een score of businessunit-rij is met een id die niet in de
   huidige lijst staat, stopt de migratie met een melding; er wordt niets weggegooid. Vóór de deploy
   een alleen-lezen telling op productie (apart akkoord).

7. **Omzetting platformen:** elk van de 5 huidige eenheden wordt een platform met precies één
   businessunit, beide met dezelfde naam; de businessunit erft de scores, de kleur en de trend van
   2024 en 2025. De beheerder kan daarna bij Informatievoorziening een tweede businessunit toevoegen
   en beide hernoemen. De bestaande koppelingen van invullers blijven bij het platform.
   **Besluit opdrachtgever:** een nieuwe businessunit begint kaal: geen geërfde scores, geen trend,
   geen kopie van een andere businessunit. Hetzelfde geldt voor een nieuw platform en een nieuwe vraag.

## 11. Aan de bouwer

Tabel- en kolomnamen, endpointpaden, de exacte vorm van de beheertabel en de bewerkinteractie
(inline of dialoog), de keuze van id-generatie, en hoe de 26 huidige gebruikers van `CONFIG`
worden omgezet.
