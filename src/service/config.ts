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
