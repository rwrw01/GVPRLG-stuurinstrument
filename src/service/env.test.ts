import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { leesAuthEnv } from './env';

const CLIENT_SECRET = 'client-secret-waarde';
const NEXTAUTH_SECRET = 'nextauth-secret-waarde';

let tmpDir: string;
let clientSecretPad: string;
let nextauthSecretPad: string;

function geldigeBron(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    KEYCLOAK_ISSUER: 'http://localhost:8081/realms/gvprlg',
    KEYCLOAK_CLIENT_ID: 'gvprlg-app',
    KEYCLOAK_CLIENT_SECRET_FILE: clientSecretPad,
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXTAUTH_SECRET_FILE: nextauthSecretPad,
    BOOTSTRAP_BEHEERDER_EMAIL: 'beheerder@test.local',
    ...overrides,
  } as NodeJS.ProcessEnv;
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'gvprlg-env-'));
  clientSecretPad = join(tmpDir, 'keycloak_client_secret');
  nextauthSecretPad = join(tmpDir, 'nextauth_secret');
  writeFileSync(clientSecretPad, `${CLIENT_SECRET}\n`);
  writeFileSync(nextauthSecretPad, `${NEXTAUTH_SECRET}\n`);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('leesAuthEnv', () => {
  it('leest secrets uit *_FILE-bestanden', () => {
    const env = leesAuthEnv(geldigeBron());
    expect(env).toEqual({
      keycloakIssuer: 'http://localhost:8081/realms/gvprlg',
      keycloakClientId: 'gvprlg-app',
      keycloakClientSecret: CLIENT_SECRET,
      nextauthUrl: 'http://localhost:3000',
      nextauthSecret: NEXTAUTH_SECRET,
      bootstrapBeheerderEmail: 'beheerder@test.local',
    });
  });

  it('faalt met de naam van een ontbrekende variabele', () => {
    expect(() => leesAuthEnv(geldigeBron({ KEYCLOAK_ISSUER: undefined }))).toThrow(/KEYCLOAK_ISSUER/);
  });

  it('weigert een issuer die geen URL is', () => {
    expect(() => leesAuthEnv(geldigeBron({ KEYCLOAK_ISSUER: 'geen-url' }))).toThrow(/KEYCLOAK_ISSUER/);
  });

  it('weigert http-issuer in productie', () => {
    const http = geldigeBron({ NODE_ENV: 'production', KEYCLOAK_ISSUER: 'http://auth.example.nl/realms/gvprlg' });
    expect(() => leesAuthEnv(http)).toThrow(/KEYCLOAK_ISSUER/);

    const https = geldigeBron({ NODE_ENV: 'production', KEYCLOAK_ISSUER: 'https://auth.example.nl/realms/gvprlg' });
    expect(leesAuthEnv(https).keycloakIssuer).toBe('https://auth.example.nl/realms/gvprlg');
  });

  it('normaliseert BOOTSTRAP_BEHEERDER_EMAIL naar lowercase zonder spaties', () => {
    const env = leesAuthEnv(geldigeBron({ BOOTSTRAP_BEHEERDER_EMAIL: '  Beheerder@Test.LOCAL ' }));
    expect(env.bootstrapBeheerderEmail).toBe('beheerder@test.local');
  });

  it('noemt nooit de secretwaarde in de foutmelding', () => {
    writeFileSync(nextauthSecretPad, '   \n');
    expect(() => leesAuthEnv(geldigeBron())).toThrow(/NEXTAUTH_SECRET_FILE/);
    try {
      leesAuthEnv(geldigeBron());
    } catch (fout) {
      const melding = (fout as Error).message;
      expect(melding).toContain(nextauthSecretPad);
      expect(melding).not.toContain(CLIENT_SECRET);
      expect(melding).not.toContain(NEXTAUTH_SECRET);
    }
  });
});
