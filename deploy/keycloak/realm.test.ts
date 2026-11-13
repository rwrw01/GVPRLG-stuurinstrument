import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

interface Execution {
  authenticator?: string;
  flowAlias?: string;
  authenticatorFlow?: boolean;
}

interface Flow {
  alias: string;
  authenticationExecutions: Execution[];
}

interface Client {
  clientId: string;
  secret?: string;
  redirectUris?: string[];
  webOrigins?: string[];
  attributes?: Record<string, string>;
  [key: string]: unknown;
}

interface Realm {
  users?: unknown[];
  clients: Client[];
  smtpServer?: Record<string, string>;
  browserFlow?: string;
  authenticationFlows: Flow[];
  [key: string]: unknown;
}

function leesRealm(bestand: string): Realm {
  return JSON.parse(readFileSync(join(import.meta.dirname, bestand), 'utf8')) as Realm;
}

const prod = leesRealm('realm-gvprlg.json');
const dev = leesRealm('realm-gvprlg.dev.json');

/**
 * Removes the parts of a realm that may legitimately differ between dev and prod.
 * @param realm - parsed realm export
 * @returns realm copy without users, smtpServer and per-client redirect/origin/secret settings
 */
function zonderToegestaneVerschillen(realm: Realm): Omit<Realm, 'users' | 'smtpServer'> {
  const { users: _users, smtpServer: _smtpServer, ...rest } = realm;
  const clients = realm.clients.map((client) => {
    const { redirectUris: _r, webOrigins: _w, secret: _s, attributes, ...clientRest } = client;
    if (!attributes) return clientRest;
    const { 'post.logout.redirect.uris': _p, ...attributesRest } = attributes;
    return { ...clientRest, attributes: attributesRest };
  });
  return { ...rest, clients };
}

/**
 * Collects all authenticator providers of a flow, including those in nested sub-flows.
 * @param realm - parsed realm export
 * @param alias - alias of the top-level flow
 * @returns list of authenticator provider ids
 */
function alleAuthenticators(realm: Realm, alias: string): string[] {
  const flow = realm.authenticationFlows.find((f) => f.alias === alias);
  if (!flow) return [];
  return flow.authenticationExecutions.flatMap((execution) => {
    if (execution.authenticatorFlow && execution.flowAlias) {
      return alleAuthenticators(realm, execution.flowAlias);
    }
    return execution.authenticator ? [execution.authenticator] : [];
  });
}

describe('realm-gvprlg', () => {
  it('productierealm bevat geen gebruikers of client-secrets', () => {
    expect(prod.users ?? []).toEqual([]);
    expect(prod.clients.find((c) => c.clientId === 'gvprlg-app')?.secret).toBeUndefined();
    expect(prod.smtpServer?.password).toBeUndefined();
  });
  it('dev wijkt alleen af op users, redirectUris, webOrigins, secret, smtpServer', () => {
    expect(zonderToegestaneVerschillen(dev)).toEqual(zonderToegestaneVerschillen(prod));
  });
  it('legt de afgesproken beveiligingswaarden vast', () => {
    expect(prod).toMatchObject({
      realm: 'gvprlg', registrationAllowed: false, resetPasswordAllowed: false,
      loginWithEmailAllowed: true, duplicateEmailsAllowed: false, verifyEmail: false,
      bruteForceProtected: true, permanentLockout: false,
      ssoSessionIdleTimeout: 1800, ssoSessionMaxLifespan: 28800,
      actionTokenGeneratedByAdminLifespan: 259200,
      otpPolicyType: 'totp', otpPolicyAlgorithm: 'HmacSHA1', otpPolicyDigits: 6,
      otpPolicyPeriod: 30, otpPolicyLookAheadWindow: 1,
      internationalizationEnabled: true, supportedLocales: ['nl'], defaultLocale: 'nl',
    });
    expect(prod.browserFlow).toBe('gvprlg-browser-otp');
    const app = prod.clients.find((c) => c.clientId === 'gvprlg-app');
    expect(app?.attributes?.['post.logout.redirect.uris']).toBe('https://spinnenweb.gvprlg.nl/');
  });
  it('browserflow heeft Username Form en OTP Form, geen wachtwoordstap', () => {
    const providers = alleAuthenticators(prod, 'gvprlg-browser-otp');
    expect(providers).toEqual(expect.arrayContaining(['auth-cookie', 'auth-username-form', 'auth-otp-form']));
    expect(providers).not.toContain('auth-username-password-form');
    expect(providers).not.toContain('auth-password-form');
  });
});
