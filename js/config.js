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
        { id: 'common-ground-standaarden', tekst: 'De producten voldoen aan Common Ground-principes en open standaarden (API-first, ZGW-API\'s, iConnect, scheiding data/logica)' },
        { id: 'cloud-data', tekst: 'De producten zijn volwaardige SaaS-oplossingen met datagedreven werken: data via API\'s beschikbaar voor analyse en veilig deelbaar over overheidslagen', nds: 'Cloud' },
        { id: 'ai-integratie', tekst: 'AI is concreet en bruikbaar onderdeel van de productportfolio (werkende functionaliteit, niet alleen visie)', nds: 'AI' },
        { id: 'digitale-weerbaarheid', tekst: 'De producten voldoen aan actuele security-eisen (BIO, NIS2, pentesting) en verminderen leveranciersafhankelijkheid', nds: 'Digitale weerbaarheid en autonomie' },
      ],
    },
    {
      id: 'mens',
      naam: 'Mens',
      kleur: '#15803D',
      vragen: [
        { id: 'capaciteit-kennis', tekst: 'De personele capaciteit (aantal en kennisniveau) is op orde om producten te ondersteunen en door te ontwikkelen' },
        { id: 'digitaal-vakmanschap', tekst: 'PinkRoccade investeert aantoonbaar in kennisontwikkeling (nieuwe technologieën, AI, Common Ground) en ondersteunt gemeenten hierbij', nds: 'Digitaal vakmanschap' },
        { id: 'klantbetrokkenheid', tekst: 'Gebruikers worden structureel betrokken bij doorontwikkeling (co-creatie, klankbordgroepen, roadmap-invloed)' },
        { id: 'opleiding-continuiteit', tekst: 'Training, documentatie en support zijn op orde; kennisborging is geborgd en niet afhankelijk van individuen' },
      ],
    },
    {
      id: 'proces',
      naam: 'Proces',
      kleur: '#C2410C',
      vragen: [
        { id: 'dienstverlening-nps', tekst: 'De dienstverlening is uniform tussen businessunits; NPS en klanttevredenheid worden structureel gemeten en vertaald naar verbeteracties' },
        { id: 'release-incident', tekst: 'Releases zijn voorspelbaar en goed gecommuniceerd; incidenten worden snel en transparant conform SLA afgehandeld' },
        { id: 'roadmap-transparantie', tekst: 'De productroadmap is transparant, realistisch en sluit aan bij NDS-prioriteiten en gemeentelijke behoeften' },
        { id: 'burgers-ondernemers-centraal', tekst: 'De producten stellen gemeenten in staat burgers en ondernemers als één overheid te bedienen met geïntegreerde digitale dienstverlening', nds: 'Burgers en ondernemers centraal' },
      ],
    },
  ],
  ndsThemas: [
    { id: 'Cloud', kleur: '#3786D2' },
    { id: 'AI', kleur: '#E2007A' },
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
