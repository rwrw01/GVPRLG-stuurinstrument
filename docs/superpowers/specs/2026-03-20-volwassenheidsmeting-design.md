# Volwassenheidsmeting PinkRoccade Local Government

## Doel

Een interactieve webapplicatie waarmee bestuursleden van de Gebruikersvereniging PinkRoccade Local Government per product/platform de volwassenheid scoren op 3 assen (Mens, Proces, Techniek). Elk bestuurslid vult de meting in voor het platform waarvoor hij/zij verantwoordelijk is. Het instrument toont resultaten per platform, een totaaloverzicht over alle platformen, en maakt jaarlijkse vergelijking mogelijk.

## Context

De Gebruikersvereniging PinkRoccade LG (gvprlg.nl) vertegenwoordigt circa 125 gemeenten die software van PinkRoccade Local Government gebruiken. Het bestuur wil een objectief meetinstrument om de volwassenheid van PinkRoccade te beoordelen vanuit het perspectief van de gebruikers, gebaseerd op actuele ontwikkelingen zoals Common Ground, de Nederlandse Digitaliseringsstrategie (NDS) en gemeentelijke ICT-prioriteiten.

## Platformen

Initieel vier platformen, uitbreidbaar via configuratie:

1. Belastingen
2. Burgerzaken
3. Sociaal Domein
4. Informatievoorziening

Platformen worden gedefinieerd in een configuratiebestand zodat ze later eenvoudig kunnen worden toegevoegd of gewijzigd.

## Meetmodel

### Schaal

CMMI-achtige volwassenheidsschaal van 1 tot 5:

| Score | Betekenis |
|-------|-----------|
| 1 | Afwezig — er is niets van zichtbaar |
| 2 | Initieel — ad hoc, niet structureel |
| 3 | Herhaalbaar — er is een aanpak maar niet consistent |
| 4 | Gedefinieerd — structureel ingericht en meetbaar |
| 5 | Best practice — voorbeeldstellend, continu verbeterend |

### Assen en vragen

Per platform 17 vragen verdeeld over 3 assen (Techniek 6, Mens 5, Proces 6).
Vragen die corresponderen met een NDS-prioriteit zijn gemarkeerd met `[NDS]`. Deze zijn apart te rapporteren als doorsnede "NDS-gereedheid".

#### Techniek (6 vragen)

1. **Common Ground** — De producten voldoen aan de Common Ground-principes (API-first, componentenarchitectuur, scheiding data/logica)
2. **AI-integratie** `[NDS: AI]` — AI is concreet en bruikbaar onderdeel van de productportfolio (niet alleen visie, maar werkende functionaliteit)
3. **Cloud/SaaS** `[NDS: Cloud]` — De producten worden aangeboden als volwaardige SaaS-oplossing met moderne cloud-architectuur
4. **Open standaarden & koppelingen** — De producten ondersteunen open standaarden (ZGW-API's, iConnect) en zijn eenvoudig te koppelen met derden
5. **Digitale weerbaarheid** `[NDS: Digitale weerbaarheid en autonomie]` — De producten voldoen aan actuele security-eisen (BIO, pentesting, responsible disclosure, NIS2-voorbereiding) en verminderen afhankelijkheid van een beperkt aantal leveranciers
6. **Datagedreven werken** `[NDS: Datagedreven werken]` — De producten ondersteunen verantwoord datagebruik: data is beschikbaar via API's, bruikbaar voor analyse en rapportage, en kan veilig gedeeld worden over overheidslagen heen

#### Mens (5 vragen)

1. **Capaciteit & kennis** — De personele capaciteit in aantal en kennisniveau bij PinkRoccade is op orde om de producten te ondersteunen en door te ontwikkelen
2. **Digitaal vakmanschap** `[NDS: Digitaal vakmanschap]` — PinkRoccade investeert aantoonbaar in kennisontwikkeling van eigen medewerkers (nieuwe technologieën, AI, Common Ground) en ondersteunt gemeenten bij het versterken van digitale vaardigheden
3. **Klantbetrokkenheid** — Gebruikers worden structureel betrokken bij doorontwikkeling (co-creatie, klankbordgroepen, roadmap-invloed)
4. **Opleiding & ondersteuning** — De kwaliteit van training, documentatie en support voor eindgebruikers bij gemeenten is op orde
5. **Continuiteit & personeel** — Er is stabiliteit in sleutelposities; kennisborging is niet afhankelijk van individuele medewerkers

#### Proces (6 vragen)

1. **Uniformiteit dienstverlening** — Er is uniformering in de dienstverlening tussen de businessunits naar de klanten toe
2. **NPS & klanttevredenheid** — De NPS-score en klanttevredenheid worden structureel gemeten, gedeeld en vertaald naar verbeteracties
3. **Releasemanagement** — Releases zijn voorspelbaar, goed gecommuniceerd en veroorzaken minimale verstoringen
4. **Roadmap & transparantie** — De productroadmap is transparant, realistisch en sluit aan bij de NDS-prioriteiten en gemeentelijke behoeften
5. **Incidentafhandeling** — Incidenten en storingen worden snel, transparant en volgens afgesproken SLA's afgehandeld
6. **Burgers en ondernemers centraal** `[NDS: Burgers en ondernemers centraal]` — De producten stellen gemeenten in staat om burgers en ondernemers als één overheid te bedienen: geïntegreerde digitale dienstverlening, eenvoudige toegang en inzicht in lopende zaken

### NDS-rapportage

De 6 NDS-gemarkeerde vragen vormen samen een apart rapporteerbare doorsnede: de "NDS-gereedheid". Dit levert:
- Een NDS-score per platform (gemiddelde van de 6 NDS-vragen, ongeacht in welke as ze zitten)
- Een NDS-totaalscore over alle platformen
- Een separaat NDS-radardiagram met 6 assen (de 6 NDS-thema's)
- Jaarlijkse vergelijking specifiek op NDS-thema's

## Samenwerkingsmodel

Elk bestuurslid vult de meting in voor zijn/haar eigen platform. Omdat de applicatie client-side werkt (localStorage), is er geen gedeelde database. De samenwerking verloopt als volgt:

1. **Elk bestuurslid** opent de app op eigen device en vult de scores in voor zijn/haar platform.
2. **Export**: elk bestuurslid exporteert de platformmeting als JSON-bestand.
3. **Samensteller** (bijv. de voorzitter) importeert alle platformbestanden in één sessie. Bij import worden platformen samengevoegd tot één complete meting.
4. **Het samengestelde resultaat** kan opnieuw geexporteerd worden als backup en als "officiële meting" gedeeld worden met alle bestuursleden.

Bij import geldt:
- Een geimporteerd platform wordt toegevoegd aan de huidige meting van dat jaar.
- Als het platform al bestaat in die meting, wordt gevraagd of het overschreven moet worden.
- Validatie: scores moeten 1-5 zijn, platform-ID's en vraag-ID's moeten bekend zijn in de configuratie.

## Gebruikersflow

1. **Startscherm** — Overzicht van alle metingen (per jaar). Knoppen: "Nieuwe meting starten" of een bestaande meting openen.
2. **Naam invoeren** — Bestuurslid voert zijn/haar naam in (vrij tekstveld, verplicht).
3. **Platform kiezen** — Bestuurslid selecteert het platform waarvoor hij/zij verantwoordelijk is.
4. **Meting invullen** — Per vraag een score invullen (1-5) met optioneel een toelichting. Tussentijds opslaan is mogelijk (status "concept").
5. **Afronden** — Bestuurslid markeert de platformmeting als "definitief". Daarna is de meting nog wel in te zien maar niet meer te wijzigen (tenzij status wordt teruggezet).
6. **Resultaat per platform** — Na invullen: radardiagram met 3 assen (Mens/Proces/Techniek), gemiddelde score per as, totaalgemiddelde.
7. **Totaaloverzicht** — Dashboard met alle platformen naast elkaar: radardiagrammen en een samenvattende tabel met scores. Platformen zonder meting worden getoond als "nog niet ingevuld".
8. **Jaarlijkse vergelijking** — Overlay van radardiagrammen per platform (bijv. 2026 vs. 2027). Vergelijking is alleen mogelijk voor platformen en vragen die in beide jaren voorkomen. Bij afwijkingen toont de app een waarschuwing.

## Visualisatie

### Radardiagram (spindiagram)

- Per platform een radardiagram met **3 assen**: Mens, Proces, Techniek (driehoek-vormig)
- Elke as toont het **gemiddelde van de vragen** op die as (niet de individuele vragen)
- Schaal 0-5, scores als gevuld vlak
- Bij jaarlijkse vergelijking: meerdere vlakken over elkaar met verschillende kleuren en labels
- Gebaseerd op de schets op het whiteboard (IST -> SOLL)
- Aanvullend: per as een **detailweergave** (balkdiagram of tabel) met de 5 individuele vraagscores

### Overzichtstabel

| Platform | Mens | Proces | Techniek | Gemiddeld |
|----------|------|--------|----------|-----------|
| Belastingen | 3.2 | 2.8 | 4.0 | 3.3 |
| Burgerzaken | ... | ... | ... | ... |
| **Totaal** | **...** | **...** | **...** | **...** |

Het **Totaal** is het rekenkundig gemiddelde van de platformgemiddelden. Alleen platformen met status "definitief" tellen mee. Platformen zonder meting worden uitgesloten (niet als 0 geteld).

### Dashboard

- Alle platformdiagrammen naast elkaar in een grid
- Totaaldiagram met gemiddelde over alle platformen
- Kleurcodering: rood (1-2), oranje (2-3), geel (3-4), groen (4-5)

## Dataopslag

- **Geen server, geen database** — volledig client-side
- Metingen worden opgeslagen als JSON in localStorage
- **Export**: meting exporteren als JSON-bestand (download)
- **Import**: JSON-bestand importeren om platformmetingen samen te voegen. Validatie bij import: JSON-schema check, scores 1-5, bekende platform/vraag-ID's. Ongeldige bestanden worden geweigerd met een duidelijke foutmelding.
- **localStorage-waarschuwing**: de app toont een melding dat localStorage vluchtig is en dat export als backup wordt aanbevolen.
- **PDF-export**: niet in scope (printfunctie van de browser volstaat)

### Datastructuur

```json
{
  "metingen": [
    {
      "id": "m-2026-a1b2c3",
      "jaar": 2026,
      "aangemaakt": "2026-06-15T10:30:00Z",
      "platformen": {
        "belastingen": {
          "invuller": "Jan de Vries",
          "status": "definitief",
          "laatstGewijzigd": "2026-06-18T14:00:00Z",
          "techniek": {
            "common-ground": { "score": 3, "toelichting": "API-first is deels doorgevoerd" },
            "ai-integratie": { "score": 2, "toelichting": "" },
            "cloud-saas": { "score": 4, "toelichting": "" },
            "open-standaarden": { "score": 3, "toelichting": "" },
            "digitale-weerbaarheid": { "score": 4, "toelichting": "" }
          },
          "mens": { "...": "idem structuur" },
          "proces": { "...": "idem structuur" }
        },
        "burgerzaken": { "...": "idem structuur" }
      }
    }
  ]
}
```

Toelichting bij de datastructuur:
- **id**: uniek ID per meting (gegenereerd als `m-{jaar}-{random}`). Eén meting per jaar.
- **status** per platform: `"concept"` (nog in bewerking) of `"definitief"` (afgerond).
- **invuller**: naam van het bestuurslid (vrij tekstveld, verplicht bij afronden).
- Bij import wordt gematcht op `jaar`. Meerdere metingen voor hetzelfde jaar zijn niet toegestaan; platformdata wordt samengevoegd in de bestaande meting.

## Huisstijl & kleuren

De applicatie gebruikt de PinkRoccade Local Government huisstijlkleuren:

| Kleur | Hex | Gebruik |
|-------|-----|---------|
| PinkRoccade Roze | `#E2007A` | Primaire accentkleur: knoppen, actieve elementen, links |
| PinkRoccade Donkerroze | `#B80164` | Hover-states op primaire knoppen |
| Donkerblauw (Navy) | `#000041` | Header, titels, primaire tekst |
| Secundair blauw | `#3786D2` | Secundaire links, informatieve elementen |
| Cyaan accent | `#40CEE2` | Highlights, badges |
| Lichtgrijs achtergrond | `#F0F0F2` | Pagina-achtergrond |
| Wit | `#FFFFFF` | Kaarten, formuliervelden |
| Middengrijs | `#A4A6B1` | Subtekst, placeholders |

### Scorekleur-indicatie (WCAG-conform)

| Score | Kleur | Hex | Contrastverhouding op wit |
|-------|-------|-----|--------------------------|
| 1-2 (laag) | Donkerrood | `#B91C1C` | 5.7:1 (AA) |
| 3 (midden) | Donkeroranje | `#C2410C` | 4.6:1 (AA) |
| 4-5 (hoog) | Donkergroen | `#15803D` | 4.5:1 (AA) |

## Digitale toegankelijkheid (WCAG 2.2 AA)

De applicatie voldoet aan WCAG 2.2 niveau AA:

- **Contrast**: alle tekst heeft minimaal 4.5:1 contrastverhouding (normaal tekst) of 3:1 (groot tekst) ten opzichte van de achtergrond
- **Toetsenbordbediening**: alle interactieve elementen zijn bereikbaar en bedienbaar via toetsenbord (Tab, Enter, Spatie, pijltjestoetsen)
- **Focus-indicatie**: zichtbare focusring op alle interactieve elementen (`:focus-visible`)
- **Formulieren**: alle invoervelden hebben een zichtbaar `<label>`, foutmeldingen zijn gekoppeld via `aria-describedby`
- **Schermlezer**: semantische HTML (heading-hierarchie, landmarks, `<nav>`, `<main>`), radardiagrammen hebben een tekstueel alternatief (de scoretabel)
- **Kleurgebruik**: informatie wordt nooit alleen door kleur overgebracht; scores tonen altijd ook de numerieke waarde
- **Schaling**: layout werkt correct bij 200% zoom
- **Reduced motion**: animaties respecteren `prefers-reduced-motion`

## Technische aanpak

- **Single-page applicatie**: één HTML-bestand met inline CSS en JS, of een kleine set bestanden (index.html, style.css, app.js)
- **Geen framework**: vanilla HTML/CSS/JS — geen build-stap, geen dependencies behalve Chart.js via CDN. Dit is een bewuste uitzondering op de TypeScript-standaard: het betreft een standalone intern instrument, geen onderdeel van een gelaagde applicatie.
- **Chart.js**: versie 4.x via CDN met SRI-hash voor integriteit. Bewezen bibliotheek met goede radar-chart support.
- **Responsive design**: mobile-first, bruikbaar op telefoon, tablet en laptop. Breakpoints: 480px (telefoon), 768px (tablet), 1024px (desktop).
- **Hosting**: kan lokaal geopend worden als bestand, of op een eenvoudige webserver/GitHub Pages

## Configuratie (uitbreidbaarheid)

Platformen en vragen worden gedefinieerd in een configuratie-object bovenaan de JavaScript-code:

```javascript
const CONFIG = {
  platformen: [
    { id: "belastingen", naam: "Belastingen" },
    { id: "burgerzaken", naam: "Burgerzaken" },
    { id: "sociaal-domein", naam: "Sociaal Domein" },
    { id: "informatievoorziening", naam: "Informatievoorziening" }
  ],
  assen: [
    {
      id: "techniek",
      naam: "Techniek",
      vragen: [
        { id: "common-ground", tekst: "De producten voldoen aan de Common Ground-principes..." },
        ...
      ]
    },
    ...
  ],
  schaal: [
    { waarde: 1, label: "Afwezig", beschrijving: "Er is niets van zichtbaar" },
    ...
  ]
};
```

Dit maakt het eenvoudig om later platformen of vragen toe te voegen zonder de applicatiecode aan te passen.

## Buiten scope

- Gebruikersbeheer / authenticatie
- Server-side opslag / database
- PDF-rapportgeneratie (browser-print volstaat)
- E-mail notificaties
- Multi-language support (alleen Nederlands)

## Bronnen

De vragen zijn opgesteld op basis van:

- PinkRoccade Local Government productstrategie (pinkroccadelocalgovernment.nl)
- VNG Common Ground transitieprogramma
- Nederlandse Digitaliseringsstrategie (NDS) — 6 prioriteiten
- Gebruikersvereniging PinkRoccade LG (gvprlg.nl)
