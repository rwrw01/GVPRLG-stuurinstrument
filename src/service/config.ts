export interface Vraag {
  id: string;
  /** Short label for spoke labels in the spinnenweb (max 22 chars). */
  kort: string;
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
  /** Fixed line colour in the trend chart (palette checked for colour-vision deficiency). */
  kleur: string;
}

export interface SchaalNiveau {
  waarde: number;
  /** CMMI name of the level, shown after the Dutch name. */
  label: string;
  /** Dutch name of the level, shown first in the UI. */
  naam: string;
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
    { id: 'belastingen', naam: 'Belastingen', kleur: '#2a78d6' },
    { id: 'ro', naam: 'R&O', kleur: '#eb6834' },
    { id: 'burgerzaken', naam: 'Burgerzaken', kleur: '#1baf7a' },
    { id: 'sociaal-domein', naam: 'Sociaal Domein', kleur: '#eda100' },
    { id: 'informatievoorziening', naam: 'Informatievoorziening', kleur: '#e87ba4' },
  ],
  assen: [
    {
      id: 'techniek',
      naam: 'Techniek',
      kleur: '#1F6FB8', // darker than #3786D2 to reach WCAG AA contrast (5.2:1) as text colour
      vragen: [
        { id: 'common-ground-standaarden', kort: 'Common Ground', tekst: 'De producten voldoen aan Common Ground-principes en open standaarden (API-first, ZGW-API\'s, iConnect, scheiding data/logica)', nds: 'Open' },
        { id: 'cloud-data', kort: 'Cloud & data', tekst: 'De producten zijn volwaardige SaaS-oplossingen met datagedreven werken: data via API\'s beschikbaar voor analyse en veilig deelbaar over overheidslagen', nds: 'Cloud' },
        { id: 'ai-integratie', kort: 'AI', tekst: 'AI is concreet en bruikbaar onderdeel van de productportfolio (werkende functionaliteit, niet alleen visie) en hierover zijn risicoanalyses uitgevoerd en een AI-act assessment van beschikbaar', nds: 'AI' },
        { id: 'digitale-weerbaarheid', kort: 'Digitale weerbaarheid', tekst: 'De producten voldoen aan actuele security-eisen (BIO, NIS2, pentesting) en verminderen leveranciersafhankelijkheid', nds: 'Digitale weerbaarheid en autonomie' },
      ],
    },
    {
      id: 'mens',
      naam: 'Mens',
      kleur: '#15803D',
      vragen: [
        { id: 'capaciteit-kennis', kort: 'Capaciteit & kennis', tekst: 'De personele capaciteit (aantal en kennisniveau) is op orde om producten te ondersteunen en door te ontwikkelen en heeft een meerjaars forecast' },
        { id: 'digitaal-vakmanschap', kort: 'Digitaal vakmanschap', tekst: 'PinkRoccade investeert aantoonbaar in kennisontwikkeling (nieuwe technologieën, AI, Common Ground) en ondersteunt gemeenten hierbij', nds: 'Digitaal vakmanschap' },
        { id: 'klantbetrokkenheid', kort: 'Klantbetrokkenheid', tekst: 'Gebruikers worden structureel betrokken bij doorontwikkeling (co-creatie, klankbordgroepen, roadmap-invloed) en de betrokkenheid wordt op kwaliteit en kwantiteit periodiek geëvalueerd' },
        { id: 'opleiding-continuiteit', kort: 'Opleiding & borging', tekst: 'Training, documentatie en support zijn op orde; kennisborging is geborgd en niet afhankelijk van individuen' },
      ],
    },
    {
      id: 'proces',
      naam: 'Proces',
      kleur: '#C2410C',
      vragen: [
        { id: 'dienstverlening-nps', kort: 'Dienstverlening & NPS', tekst: 'De dienstverlening is uniform tussen businessunits; NPS en klanttevredenheid worden structureel gemeten en vertaald naar verbeteracties en gepubliceerd' },
        { id: 'release-incident', kort: 'Releases & incidenten', tekst: 'Releases zijn voorspelbaar en goed gecommuniceerd; incidenten worden snel en transparant conform SLA afgehandeld' },
        { id: 'roadmap-transparantie', kort: 'Roadmap', tekst: 'De productroadmap is transparant, realistisch en sluit aan bij NDS-prioriteiten en gemeentelijke behoeften' },
        { id: 'burgers-ondernemers-centraal', kort: 'Burger centraal', tekst: 'De producten stellen gemeenten in staat burgers en ondernemers als één overheid te bedienen met geïntegreerde digitale dienstverlening', nds: 'Burgers en ondernemers centraal' },
        { id: 'prijsbeleid', kort: 'Prijsbeleid', tekst: 'Prijsbeleid (inclusief offertes) is uitlegbaar en marktconform en hanteert een voorspelbaar proces' },
        { id: 'lifecyclemanagement', kort: 'Lifecycle', tekst: 'Lifecyclemanagement volgt de afspraken van de uitvloeiingsregeling' },
        { id: 'partner-productontwikkeling', kort: 'Partner: product', tekst: 'PinkRoccade is een partner van betekenis: de productontwikkeling sluit voldoende aan bij de wensen en eisen die vanuit de markt (gemeenten) worden gesteld' },
        { id: 'partner-dienstverlening', kort: 'Partner: diensten', tekst: 'PinkRoccade is een partner van betekenis: de dienstverlening sluit voldoende aan bij de wensen en eisen die vanuit de markt (gemeenten) worden gesteld' },
      ],
    },
  ],
  ndsThemas: [
    { id: 'Open', kleur: '#6366F1' },
    { id: 'Cloud', kleur: '#3786D2' },
    { id: 'AI', kleur: '#2c7fa0' },
    { id: 'Burgers en ondernemers centraal', kleur: '#15803D' },
    { id: 'Digitale weerbaarheid en autonomie', kleur: '#1c3f4f' },
    { id: 'Digitaal vakmanschap', kleur: '#C2410C' },
  ],
  schaal: [
    { waarde: 1, label: 'Initial', naam: 'Ad hoc', beschrijving: 'Ad-hoc, geen gestructureerde aanpak' },
    { waarde: 2, label: 'Managed', naam: 'Herhaalbaar', beschrijving: 'Herhaalbaar op projectniveau, nog niet organisatiebreed geborgd' },
    { waarde: 3, label: 'Defined', naam: 'Vastgelegd', beschrijving: 'Gestandaardiseerd en organisatiebreed vastgelegd' },
    { waarde: 4, label: 'Quantitatively Managed', naam: 'Gemeten', beschrijving: 'Gemeten en gestuurd op basis van data' },
    { waarde: 5, label: 'Optimizing', naam: 'Lerend', beschrijving: 'Continue verbetering ingebed in de organisatie' },
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
