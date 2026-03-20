// js/config.js
export const CONFIG = {
  platformen: [
    { id: 'belastingen', naam: 'Belastingen' },
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
        { id: 'common-ground', tekst: 'De producten voldoen aan de Common Ground-principes (API-first, componentenarchitectuur, scheiding data/logica)' },
        { id: 'ai-integratie', tekst: 'AI is concreet en bruikbaar onderdeel van de productportfolio (niet alleen visie, maar werkende functionaliteit)', nds: 'AI' },
        { id: 'cloud-saas', tekst: 'De producten worden aangeboden als volwaardige SaaS-oplossing met moderne cloud-architectuur', nds: 'Cloud' },
        { id: 'open-standaarden', tekst: 'De producten ondersteunen open standaarden (ZGW-API\'s, iConnect) en zijn eenvoudig te koppelen met derden' },
        { id: 'digitale-weerbaarheid', tekst: 'De producten voldoen aan actuele security-eisen (BIO, pentesting, responsible disclosure, NIS2-voorbereiding) en verminderen afhankelijkheid van een beperkt aantal leveranciers', nds: 'Digitale weerbaarheid en autonomie' },
        { id: 'datagedreven-werken', tekst: 'De producten ondersteunen verantwoord datagebruik: data is beschikbaar via API\'s, bruikbaar voor analyse en rapportage, en kan veilig gedeeld worden over overheidslagen heen', nds: 'Datagedreven werken' },
      ],
    },
    {
      id: 'mens',
      naam: 'Mens',
      kleur: '#15803D',
      vragen: [
        { id: 'capaciteit-kennis', tekst: 'De personele capaciteit in aantal en kennisniveau bij PinkRoccade is op orde om de producten te ondersteunen en door te ontwikkelen' },
        { id: 'digitaal-vakmanschap', tekst: 'PinkRoccade investeert aantoonbaar in kennisontwikkeling van eigen medewerkers (nieuwe technologieën, AI, Common Ground) en ondersteunt gemeenten bij het versterken van digitale vaardigheden', nds: 'Digitaal vakmanschap' },
        { id: 'klantbetrokkenheid', tekst: 'Gebruikers worden structureel betrokken bij doorontwikkeling (co-creatie, klankbordgroepen, roadmap-invloed)' },
        { id: 'opleiding-ondersteuning', tekst: 'De kwaliteit van training, documentatie en support voor eindgebruikers bij gemeenten is op orde' },
        { id: 'continuiteit-personeel', tekst: 'Er is stabiliteit in sleutelposities; kennisborging is niet afhankelijk van individuele medewerkers' },
      ],
    },
    {
      id: 'proces',
      naam: 'Proces',
      kleur: '#C2410C',
      vragen: [
        { id: 'uniformiteit-dienstverlening', tekst: 'Er is uniformering in de dienstverlening tussen de businessunits naar de klanten toe' },
        { id: 'nps-klanttevredenheid', tekst: 'De NPS-score en klanttevredenheid worden structureel gemeten, gedeeld en vertaald naar verbeteracties' },
        { id: 'releasemanagement', tekst: 'Releases zijn voorspelbaar, goed gecommuniceerd en veroorzaken minimale verstoringen' },
        { id: 'roadmap-transparantie', tekst: 'De productroadmap is transparant, realistisch en sluit aan bij de NDS-prioriteiten en gemeentelijke behoeften' },
        { id: 'incidentafhandeling', tekst: 'Incidenten en storingen worden snel, transparant en volgens afgesproken SLA\'s afgehandeld' },
        { id: 'burgers-ondernemers-centraal', tekst: 'De producten stellen gemeenten in staat om burgers en ondernemers als één overheid te bedienen: geïntegreerde digitale dienstverlening, eenvoudige toegang en inzicht in lopende zaken', nds: 'Burgers en ondernemers centraal' },
      ],
    },
  ],
  ndsThemas: [
    { id: 'Cloud', kleur: '#3786D2' },
    { id: 'AI', kleur: '#E2007A' },
    { id: 'Datagedreven werken', kleur: '#40CEE2' },
    { id: 'Burgers en ondernemers centraal', kleur: '#15803D' },
    { id: 'Digitale weerbaarheid en autonomie', kleur: '#000041' },
    { id: 'Digitaal vakmanschap', kleur: '#C2410C' },
  ],
  schaal: [
    { waarde: 1, label: 'Afwezig', beschrijving: 'Er is niets van zichtbaar' },
    { waarde: 2, label: 'Initieel', beschrijving: 'Ad hoc, niet structureel' },
    { waarde: 3, label: 'Herhaalbaar', beschrijving: 'Er is een aanpak maar niet consistent' },
    { waarde: 4, label: 'Gedefinieerd', beschrijving: 'Structureel ingericht en meetbaar' },
    { waarde: 5, label: 'Best practice', beschrijving: 'Voorbeeldstellend, continu verbeterend' },
  ],
};

// Helper: collect all NDS-tagged questions across axes
export function getNdsVragen() {
  const result = [];
  for (const as of CONFIG.assen) {
    for (const vraag of as.vragen) {
      if (vraag.nds) {
        result.push({ ...vraag, asId: as.id, asNaam: as.naam });
      }
    }
  }
  return result;
}
