// @ts-check
import { test, expect } from '@playwright/test';

import { mailpitLaatsteBericht, mailpitLeeg } from './auth-helpers';
import { GEBRUIKERS } from './e2e-data';
import { koppelAuthenticator, schonePagina } from './fase-b-helpers';
import { resetNaarTotpInstellen, verstuurUitnodiging, zorgVoorGebruikerMetTotp } from './keycloak-admin';

// SPINNENWEB_URL of the dev Keycloak (docker-compose.dev.yml); production uses the theme default
// https://spinnenweb.gvprlg.nl from deploy/keycloak/themes/gvprlg/*/theme.properties.
const SPINNENWEB_URL = process.env.E2E_SPINNENWEB_URL ?? 'http://localhost:3000';
const ONDERWERP = 'Uitnodiging voor Spinnenweb van de GVPRLG';

test.describe.configure({ timeout: 120_000 });

test('uitnodigingsmail van Keycloak heeft de vastgestelde tekst en eindigt met een link naar Spinnenweb', async ({ browser, request }, testInfo) => {
  const { email, naam } = GEBRUIKERS.uitgenodigde;
  const [voornaam, ...achternaam] = naam.split(' ');
  await zorgVoorGebruikerMetTotp(email, { voornaam, achternaam: achternaam.join(' ') });
  await resetNaarTotpInstellen(email);
  await mailpitLeeg(request, email);

  // As the admin does in the console: "Credential reset" with "Configure OTP", no client or redirect.
  await verstuurUitnodiging(email);
  const bericht = await mailpitLaatsteBericht(request, email);
  expect(bericht.Subject).toBe(ONDERWERP);
  const tekst = bericht.Text.replace(/\r\n/g, '\n');
  const actielink = /https?:\/\/\S+\/login-actions\/action-token\S+/.exec(tekst)?.[0];
  expect(actielink).toBeTruthy();
  for (const zin of [
    'Geachte heer/mevrouw,',
    'U bent uitgenodigd voor Spinnenweb, de applicatie van de Gebruikersvereniging PinkRoccade Local Government (GVPRLG).',
    'Om de applicatie te gebruiken, registreert u eerst een authenticator-app op uw telefoon, bijvoorbeeld Microsoft Authenticator, Google Authenticator of FreeOTP. Dat gaat zo:',
    `1. Klik op de link Uitnodiging accepteren.\n${actielink}\n2. Scan de QR-code met uw authenticator-app.`,
    '3. Vul de code van zes cijfers uit de app in en kies Opslaan.',
    // verstuurUitnodiging asks for lifespan=259200 s.
    'De link is 3 dagen geldig.',
    `Daarna logt u in op ${SPINNENWEB_URL} met uw e-mailadres en de code uit uw authenticator-app.`,
    'Heeft u deze uitnodiging niet verwacht? Dan kunt u deze e-mail negeren. Er verandert dan niets.',
  ]) {
    expect(tekst).toContain(zin);
  }
  // HTML part: "Uitnodiging accepteren" is the link; Keycloak's sanitizer (kcSanitize) keeps the
  // numbered steps and adds rel="nofollow" to every link, as for its own templates.
  const html = bericht.HTML.replaceAll('&amp;', '&');
  expect(html).toContain(`<a href="${actielink}" rel="nofollow">Uitnodiging accepteren</a>`);
  expect(html).toContain('<li>Scan de QR-code met uw authenticator-app.</li>');
  expect(html).toContain(`<a href="${SPINNENWEB_URL}" rel="nofollow">${SPINNENWEB_URL}</a>`);
  expect(html).not.toContain('<script');

  const pagina = await schonePagina(browser);
  try {
    await koppelAuthenticator(pagina, email);
    // Keycloak's own confirmation ("Uw account is bijgewerkt.") has no link of its own here.
    await expect(pagina.locator('#kc-info-message')).toContainText('Uw account is bijgewerkt.');
    const naarSpinnenweb = pagina.getByRole('link', { name: 'Naar Spinnenweb' });
    await expect(naarSpinnenweb).toHaveAttribute('href', SPINNENWEB_URL);
    await expect(pagina.locator('#kc-info-message a')).toHaveCount(1);
    const schermafdruk = testInfo.outputPath('kc-info.png');
    await pagina.screenshot({ path: schermafdruk, fullPage: true });
    await testInfo.attach('kc-info', { path: schermafdruk, contentType: 'image/png' });
  } finally {
    await pagina.context().close();
  }
});
