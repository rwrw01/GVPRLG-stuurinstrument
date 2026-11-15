// Test-only helper: imported exclusively from *.test.ts files, never from production code.
// The questionnaire exactly as the former src/service/config.ts held it, which the migration
// `beheerbare_vragenlijst` puts into the catalogue (3 axes, 16 questions, 5 platforms with one
// business unit each, keyed by the old slugs).
import type { Vragenlijst } from '@/src/data/vragenlijstRepository';

type Inhoud = Omit<Vragenlijst, 'jaar' | 'vastgelegd'>;

/** The migrated catalogue as a list (no year). */
export const STANDAARD: Inhoud =
{
  "assen": [
    {
      "id": "techniek",
      "naam": "Techniek",
      "kleur": "#1F6FB8",
      "vragen": [
        {
          "id": "common-ground-standaarden",
          "asId": "techniek",
          "kort": "Common Ground",
          "tekst": "De producten voldoen aan Common Ground-principes en open standaarden (API-first, ZGW-API's, iConnect, scheiding data/logica)",
          "nds": "Open"
        },
        {
          "id": "cloud-data",
          "asId": "techniek",
          "kort": "Cloud & data",
          "tekst": "De producten zijn volwaardige SaaS-oplossingen met datagedreven werken: data via API's beschikbaar voor analyse en veilig deelbaar over overheidslagen",
          "nds": "Cloud"
        },
        {
          "id": "ai-integratie",
          "asId": "techniek",
          "kort": "AI",
          "tekst": "AI is concreet en bruikbaar onderdeel van de productportfolio (werkende functionaliteit, niet alleen visie) en hierover zijn risicoanalyses uitgevoerd en een AI-act assessment van beschikbaar",
          "nds": "AI"
        },
        {
          "id": "digitale-weerbaarheid",
          "asId": "techniek",
          "kort": "Digitale weerbaarheid",
          "tekst": "De producten voldoen aan actuele security-eisen (BIO, NIS2, pentesting) en verminderen leveranciersafhankelijkheid",
          "nds": "Digitale weerbaarheid en autonomie"
        }
      ]
    },
    {
      "id": "mens",
      "naam": "Mens",
      "kleur": "#15803D",
      "vragen": [
        {
          "id": "capaciteit-kennis",
          "asId": "mens",
          "kort": "Capaciteit & kennis",
          "tekst": "De personele capaciteit (aantal en kennisniveau) is op orde om producten te ondersteunen en door te ontwikkelen en heeft een meerjaars forecast"
        },
        {
          "id": "digitaal-vakmanschap",
          "asId": "mens",
          "kort": "Digitaal vakmanschap",
          "tekst": "PinkRoccade investeert aantoonbaar in kennisontwikkeling (nieuwe technologieën, AI, Common Ground) en ondersteunt gemeenten hierbij",
          "nds": "Digitaal vakmanschap"
        },
        {
          "id": "klantbetrokkenheid",
          "asId": "mens",
          "kort": "Klantbetrokkenheid",
          "tekst": "Gebruikers worden structureel betrokken bij doorontwikkeling (co-creatie, klankbordgroepen, roadmap-invloed) en de betrokkenheid wordt op kwaliteit en kwantiteit periodiek geëvalueerd"
        },
        {
          "id": "opleiding-continuiteit",
          "asId": "mens",
          "kort": "Opleiding & borging",
          "tekst": "Training, documentatie en support zijn op orde; kennisborging is geborgd en niet afhankelijk van individuen"
        }
      ]
    },
    {
      "id": "proces",
      "naam": "Proces",
      "kleur": "#C2410C",
      "vragen": [
        {
          "id": "dienstverlening-nps",
          "asId": "proces",
          "kort": "Dienstverlening & NPS",
          "tekst": "De dienstverlening is uniform tussen businessunits; NPS en klanttevredenheid worden structureel gemeten en vertaald naar verbeteracties en gepubliceerd"
        },
        {
          "id": "release-incident",
          "asId": "proces",
          "kort": "Releases & incidenten",
          "tekst": "Releases zijn voorspelbaar en goed gecommuniceerd; incidenten worden snel en transparant conform SLA afgehandeld"
        },
        {
          "id": "roadmap-transparantie",
          "asId": "proces",
          "kort": "Roadmap",
          "tekst": "De productroadmap is transparant, realistisch en sluit aan bij NDS-prioriteiten en gemeentelijke behoeften"
        },
        {
          "id": "burgers-ondernemers-centraal",
          "asId": "proces",
          "kort": "Burger centraal",
          "tekst": "De producten stellen gemeenten in staat burgers en ondernemers als één overheid te bedienen met geïntegreerde digitale dienstverlening",
          "nds": "Burgers en ondernemers centraal"
        },
        {
          "id": "prijsbeleid",
          "asId": "proces",
          "kort": "Prijsbeleid",
          "tekst": "Prijsbeleid (inclusief offertes) is uitlegbaar en marktconform en hanteert een voorspelbaar proces"
        },
        {
          "id": "lifecyclemanagement",
          "asId": "proces",
          "kort": "Lifecycle",
          "tekst": "Lifecyclemanagement volgt de afspraken van de uitvloeiingsregeling"
        },
        {
          "id": "partner-productontwikkeling",
          "asId": "proces",
          "kort": "Partner: product",
          "tekst": "PinkRoccade is een partner van betekenis: de productontwikkeling sluit voldoende aan bij de wensen en eisen die vanuit de markt (gemeenten) worden gesteld"
        },
        {
          "id": "partner-dienstverlening",
          "asId": "proces",
          "kort": "Partner: diensten",
          "tekst": "PinkRoccade is een partner van betekenis: de dienstverlening sluit voldoende aan bij de wensen en eisen die vanuit de markt (gemeenten) worden gesteld"
        }
      ]
    }
  ],
  "platformen": [
    {
      "id": "belastingen",
      "naam": "Belastingen",
      "businessUnitIds": [
        "belastingen"
      ]
    },
    {
      "id": "ro",
      "naam": "R&O",
      "businessUnitIds": [
        "ro"
      ]
    },
    {
      "id": "burgerzaken",
      "naam": "Burgerzaken",
      "businessUnitIds": [
        "burgerzaken"
      ]
    },
    {
      "id": "sociaal-domein",
      "naam": "Sociaal Domein",
      "businessUnitIds": [
        "sociaal-domein"
      ]
    },
    {
      "id": "informatievoorziening",
      "naam": "Informatievoorziening",
      "businessUnitIds": [
        "informatievoorziening"
      ]
    }
  ],
  "businessUnits": [
    {
      "id": "belastingen",
      "platformId": "belastingen",
      "naam": "Belastingen",
      "kleur": "#2a78d6"
    },
    {
      "id": "ro",
      "platformId": "ro",
      "naam": "R&O",
      "kleur": "#eb6834"
    },
    {
      "id": "burgerzaken",
      "platformId": "burgerzaken",
      "naam": "Burgerzaken",
      "kleur": "#1baf7a"
    },
    {
      "id": "sociaal-domein",
      "platformId": "sociaal-domein",
      "naam": "Sociaal Domein",
      "kleur": "#eda100"
    },
    {
      "id": "informatievoorziening",
      "platformId": "informatievoorziening",
      "naam": "Informatievoorziening",
      "kleur": "#e87ba4"
    }
  ]
}
;

/**
 * The migrated list for one year.
 * @param jaar - Year
 * @param vastgelegd - Whether the year is frozen
 * @returns the list
 */
export function standaardLijst(jaar = 2026, vastgelegd = false): Vragenlijst {
  return { jaar, vastgelegd, ...structuredClone(STANDAARD) };
}

/** Every question id of the migrated list, in spoke order. */
export const STANDAARD_VRAAG_IDS: string[] = STANDAARD.assen.flatMap((a) => a.vragen.map((v) => v.id));
