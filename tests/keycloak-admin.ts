// Test-only client for the DEV Keycloak admin API (realm gvprlg). Never import this from src/ or app/:
// the app itself has no admin access to Keycloak.

const KEYCLOAK_URL = process.env.E2E_KEYCLOAK_URL ?? 'http://127.0.0.1:8081';
const REALM = 'gvprlg';
// Documented dev-only admin credentials from docker-compose.dev.yml.
const DEV_ADMIN = { username: 'admin', password: 'devadmin' };

/** Base32 TOTP seed shared by all dev realm test users (see deploy/keycloak/realm-gvprlg.dev.json). */
export const DEV_TOTP_SEED = 'JBSWY3DPEHPK3PXP';

interface KeycloakGebruiker {
  id: string;
  username: string;
}

interface KeycloakCredential {
  id: string;
  type: string;
}

async function _adminToken(): Promise<string> {
  const response = await fetch(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'password', client_id: 'admin-cli', ...DEV_ADMIN }),
  });
  if (!response.ok) throw new Error(`Keycloak admin login failed: ${response.status}`);
  const json = (await response.json()) as { access_token: string };
  return json.access_token;
}

async function _admin(pad: string, init: RequestInit = {}): Promise<Response> {
  const token = await _adminToken();
  const response = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}${pad}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) throw new Error(`Keycloak admin ${init.method ?? 'GET'} ${pad} failed: ${response.status} ${await response.text()}`);
  return response;
}

async function _vindGebruiker(email: string): Promise<KeycloakGebruiker | null> {
  const response = await _admin(`/users?exact=true&username=${encodeURIComponent(email)}`);
  const lijst = (await response.json()) as KeycloakGebruiker[];
  return lijst[0] ?? null;
}

async function _vereisGebruiker(email: string): Promise<KeycloakGebruiker> {
  const gebruiker = await _vindGebruiker(email);
  if (!gebruiker) throw new Error(`Keycloak user ${email} not found in realm ${REALM}`);
  return gebruiker;
}

/**
 * Returns the Keycloak user id, which is the `sub` claim the app binds on first login.
 * @param email - Username of the user
 * @returns The Keycloak user id
 */
export async function keycloakId(email: string): Promise<string> {
  return (await _vereisGebruiker(email)).id;
}

/**
 * Creates a Keycloak user with the dev TOTP seed when it does not exist yet.
 * @param email - Username and e-mail of the user
 * @param naam - First and last name
 * @returns Promise that resolves once the user exists
 */
export async function zorgVoorGebruikerMetTotp(email: string, naam: { voornaam: string; achternaam: string }): Promise<void> {
  if (await _vindGebruiker(email)) return;
  await _admin('/users', {
    method: 'POST',
    body: JSON.stringify({
      username: email,
      email,
      firstName: naam.voornaam,
      lastName: naam.achternaam,
      enabled: true,
      emailVerified: true,
      credentials: [
        {
          type: 'otp',
          userLabel: 'Dev TOTP',
          secretData: JSON.stringify({ value: DEV_TOTP_SEED }),
          credentialData: JSON.stringify({ subType: 'totp', digits: 6, counter: 0, period: 30, algorithm: 'HmacSHA1', secretEncoding: 'BASE32' }),
        },
      ],
    }),
  });
}

/**
 * Puts a user back in the "invited, not yet enrolled" state: OTP credentials removed, sessions
 * ended and CONFIGURE_TOTP required.
 * @param email - Username of the user
 * @returns Promise that resolves once the user is reset
 */
export async function resetNaarTotpInstellen(email: string): Promise<void> {
  const { id } = await _vereisGebruiker(email);
  const credentials = (await (await _admin(`/users/${id}/credentials`)).json()) as KeycloakCredential[];
  for (const credential of credentials.filter((c) => c.type === 'otp')) {
    await _admin(`/users/${id}/credentials/${credential.id}`, { method: 'DELETE' });
  }
  await _admin(`/users/${id}/logout`, { method: 'POST' });
  // Send the full representation back: a partial PUT may clear user-profile attributes.
  const volledig = (await (await _admin(`/users/${id}`)).json()) as Record<string, unknown>;
  await _admin(`/users/${id}`, { method: 'PUT', body: JSON.stringify({ ...volledig, requiredActions: ['CONFIGURE_TOTP'] }) });
}

/**
 * Sends the "required actions" invitation e-mail (CONFIGURE_TOTP), as an admin would in the console
 * (no redirect URI, so Keycloak ends on its own confirmation page).
 * @param email - Username of the user
 * @returns Promise that resolves once Keycloak accepted the request
 */
export async function verstuurUitnodiging(email: string): Promise<void> {
  const { id } = await _vereisGebruiker(email);
  await _admin(`/users/${id}/execute-actions-email?lifespan=259200`, {
    method: 'PUT',
    body: JSON.stringify(['CONFIGURE_TOTP']),
  });
}
