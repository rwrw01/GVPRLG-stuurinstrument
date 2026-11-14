# Ontwerp: Spinnenweb — startscherm, zijmenu, huisstijl en woordkeuze

**Datum:** 2026-11-14
**Besluiten van de opdrachtgever (bindend):**
- De app heet **Spinnenweb**. Het woord "volwassenheid" (en afgeleiden) verdwijnt uit de hele
  gebruikersinterface: "niet volwassen" leest als een oordeel, terwijl de gebruikersvereniging en
  de directie van PinkRoccade samen willen werken. Het model blijft CMMI.
- Het startscherm is voor het **bestuur**; de **directie van PinkRoccade leest mee** (rol `lezer`).
  Elke tekst moet dus ook voor de leverancier respectvol en zakelijk zijn.
- Huisstijl: de kleuren van **gvprlg.nl**, niet de PinkRoccade-kleuren.
- Navigatie: een **zijmenu** (zoals Microsoft Entra) met de jaren aan de zijkant.
- Startscherm: een **overzicht met de trend over de jaren**.

Visuele referentie (klikbaar, drie varianten): `2026-11-14-spinnenweb-startscherm-ontwerpen.html`
in deze map. Gekozen: **variant A (zijmenu)** met de **openingszin van variant C**, in de
woordkeuze van dit document (de mockup gebruikt nog oude termen).

## Approaches

| Variant | Kern | Afweging | Besluit |
|---|---|---|---|
| A Zijmenu | Vast menu links: Overzicht, jaren, Beheer | Schaalt mee met jaren en beheerfuncties; kost breedte op smalle schermen (klapt in) | **Gekozen** |
| B Tijdlijn | Jaren als tijdlijn bovenaan, vier webben naast elkaar | Mooi beeld, maar webben per jaar lijken op elkaar; beheer heeft geen plek | Niet gekozen |
| C Bestuursbrief | Eén conclusiezin en een ranglijst | Sterk voor snelle lezers; een ranglijst zet platformen tegen elkaar af | Alleen de openingszin overgenomen, zonder rangorde |

## 1. Naam en woordkeuze

- Productnaam overal: **Spinnenweb**. Ondertitel in de kop: "Jaarlijkse meting van de
  PinkRoccade-platformen door de gebruikersvereniging". Browsertitel: "Spinnenweb GVPRLG".
- Geen enkel voorkomen van `volwassen` in UI-teksten (case-insensitive); een test bewaakt dit.
- Vaste vervangingen:

| Niet | Wel |
|---|---|
| volwassenheidsmeting | Spinnenweb / de meting |
| volwassener | verder ontwikkeld |
| laagste score | grootste groeikans |
| wat vraagt aandacht | Gespreksonderwerpen |
| daalt / blijft achter | staat onder druk / vraagt samen aandacht |
| ranglijst, plaats 1-5 | overzicht per platform in vaste volgorde, zonder nummering |

- Schaal: kop "Wat betekenen de niveaus" (niet "CMMI-niveaus"). Per niveau de Nederlandse naam
  met de CMMI-naam erachter: 1 Ad hoc (Initial), 2 Herhaalbaar (Managed), 3 Vastgelegd (Defined),
  4 Gemeten (Quantitatively Managed), 5 Lerend (Optimizing). Beschrijvingen blijven.

## 2. Huisstijl

- Tokens in `app/globals.css`: primair `#2a5b70`, diep `#1c3f4f`, accent `#2c7fa0`
  (hover `#2a5b70`), verloop `#437e9d → #2a5b70`. Het roze `#E2007A` en navy `#000041` verdwijnen,
  ook uit de focusring. Tekst `#16242b`. Scorekleuren (rood/oranje/groen) blijven.
- Alle tekst/achtergrond-combinaties WCAG 2.2 AA; knoppen met witte tekst op `#2c7fa0` is 4,5:1.
- Geen nieuwe dependencies: grafieken zijn eigen SVG.

## 3. Schil met zijmenu

- Links een vast menu (232 px) in het blauwe verloop; rechts de inhoud.
- Items: **Overzicht** (`/`); kop "Metingen" met elk meetjaar **oplopend** (oudste eerst) en een
  voortgangslabel (`3/5` voor een jaar dat niet volledig definitief is, anders "afgerond");
  kop "Beheer" met **Gebruikers** en **Nieuwe meting** (alleen `beheerder`) en **Auditlog**
  (iedereen die is ingelogd, zoals nu). Onderaan naam van de gebruiker en **Uitloggen**.
- Het actieve item heeft `aria-current="page"`.
- Onder 820 px: het menu klapt in achter een knop "Menu" (`aria-expanded`), de inhoud vult de
  breedte. Geen horizontale paginascroll op 390, 768 en 1024 px.
- Op `/inloggen`, `/inloggen/doorsturen` en `/geen-toegang` (geen sessie) geen menu, alleen de kop.
- Het kruimelpad blijft werken.
- "Nieuwe meting" verhuist van het startscherm naar de beheerpagina.

## 4. Startscherm "Overzicht" (`/`)

Voor elke actieve gebruiker (ook invuller en lezer); concepten tellen mee maar zijn gemarkeerd.

1. **Openingszin** — één zin, afgeleid uit de cijfers van het nieuwste jaar met scores, in de
   toon van §1. Regels: noem het platform met de grootste stijging t.o.v. het jaar ervoor
   ("… groeit door naar 4,1") en het platform plus de as met de grootste daling als
   "bij … ligt de grootste groeikans op de as …". Zonder vergelijkingsjaar: een neutrale zin over
   de stand. Zonder cijfers: "Er zijn nog geen scores ingevuld."
2. **Kerncijfers** — gemiddelde van het nieuwste jaar met verschil; aantal definitief van totaal;
   grootste stijger; grootste groeikans.
3. **Trend per platform** — lijngrafiek, y-as 1–5, één lijn per platform, vaste kleur per
   platform (zie mockup; palet is gevalideerd op kleurenblindheid), label met waarde aan het
   einde van elke lijn, legenda, tooltip per punt (ook met toetsenbordfocus). Concept: open stip
   en stippellijn.
4. **Gespreksonderwerpen** — maximaal vier punten uit de cijfers: grootste daling op een as,
   platformen in concept, platformen niet gestart, platform dat het langst stijgt.
5. **Alle jaren naast elkaar** — tabel platform × jaar met kleurschaal in één blauwtint
   (donkerder = verder ontwikkeld), getal in elke cel, concept omrand, niet gestart gearceerd.
   Dit is tevens de tabelweergave van de grafiek. Platformnaam linkt naar het resultaat van het
   nieuwste jaar.
6. **De drie assen** — Techniek, Mens, Proces: balk met de score van nu en een markering van
   het jaar ervoor, plus het verschil.

Verschillen altijd met pictogram én tekst (▲ +0,2 / ▼ −0,4 / = 0,0), nooit alleen kleur.
Lege toestand: bij minder dan twee jaren met scores staat er "Een trend verschijnt zodra er twee
jaren met scores zijn." en tonen de blokken wat er wel is.

## 5. Jaarpagina

Het bestaande dashboard per jaar blijft, met in het organisatieweb en de platformwebben het
**vorige meetjaar als grijze stippellijn** (als dat jaar scores heeft) en een regel uitleg.

## 6. Gegevens

- Nieuw: `GET /api/overzicht` — voor elke actieve gebruiker. Antwoord: per meetjaar, per platform
  `status` (`definitief` | `concept` | `niet-gestart`), gemiddelde per as, gewogen totaal en het
  aantal beantwoorde vragen; plus de afgeleide openingszin en gespreksonderwerpen.
- Het gemiddelde per as is het gemiddelde van de beantwoorde vragen van die as; het totaal is het
  gemiddelde over alle beantwoorde vragen. Onbeantwoorde vragen tellen niet mee.
- Rekenregels als pure functies in de Service-laag met unittests; samenstellen in de Process-laag.
- `api/specs/gvprlg.yaml` krijgt het endpoint.

## 7. Niet in dit ontwerp

Export naar pdf, donkere modus, meer dan één vergelijkingsjaar in het web, wijzigingen aan het
invulformulier, de Keycloak-loginpagina (heeft al gvprlg-kleuren).
