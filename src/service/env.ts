import { readFileSync } from 'node:fs';

import { z } from 'zod';

/** Validated authentication configuration (secrets already read from their files). */
export interface AuthEnv {
  keycloakIssuer: string;
  keycloakClientId: string;
  keycloakClientSecret: string;
  nextauthUrl: string;
  nextauthSecret: string;
  bootstrapBeheerderEmail: string;
}

const verplicht = z.string({ error: 'is required' }).trim().min(1, 'is required');

const RuweAuthEnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  KEYCLOAK_ISSUER: verplicht.pipe(z.url({ error: 'must be a valid URL' })),
  KEYCLOAK_CLIENT_ID: verplicht,
  KEYCLOAK_CLIENT_SECRET_FILE: verplicht,
  NEXTAUTH_URL: verplicht.pipe(z.url({ error: 'must be a valid URL' })),
  NEXTAUTH_SECRET_FILE: verplicht,
  BOOTSTRAP_BEHEERDER_EMAIL: verplicht.toLowerCase().pipe(z.email({ error: 'must be a valid e-mail address' })),
});

type RuweAuthEnv = z.infer<typeof RuweAuthEnvSchema>;

/**
 * Builds an error message from Zod issues that names the variables, never their values.
 * @param fout - The Zod validation error.
 * @returns A single-line English message.
 */
function formatteerFout(fout: z.ZodError): string {
  const delen = fout.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`);
  return `Invalid auth configuration: ${delen.join('; ')}`;
}

/**
 * Reads a secret from a file and trims surrounding whitespace.
 * @param variabele - Name of the *_FILE variable (used in error messages).
 * @param pad - Path to the secret file.
 * @returns The trimmed secret.
 */
function leesSecretBestand(variabele: string, pad: string): string {
  let inhoud: string;
  try {
    inhoud = readFileSync(pad, 'utf8');
  } catch {
    throw new Error(`Invalid auth configuration: ${variabele} points to an unreadable file (${pad})`);
  }
  const secret = inhoud.trim();
  if (secret.length === 0) {
    throw new Error(`Invalid auth configuration: ${variabele} points to an empty file (${pad})`);
  }
  return secret;
}

/**
 * Enforces https for the issuer in production.
 * @param ruw - The parsed raw variables.
 */
function controleerProductie(ruw: RuweAuthEnv): void {
  if (ruw.NODE_ENV === 'production' && new URL(ruw.KEYCLOAK_ISSUER).protocol !== 'https:') {
    throw new Error('Invalid auth configuration: KEYCLOAK_ISSUER must use https:// in production');
  }
}

/**
 * Validates the auth environment variables and reads the secret files.
 * @param bron - Environment to read from (defaults to process.env).
 * @returns The validated auth configuration.
 * @throws Error naming the missing or invalid variable, never its value.
 */
export function leesAuthEnv(bron: NodeJS.ProcessEnv = process.env): AuthEnv {
  const resultaat = RuweAuthEnvSchema.safeParse(bron);
  if (!resultaat.success) {
    throw new Error(formatteerFout(resultaat.error));
  }
  const ruw = resultaat.data;
  controleerProductie(ruw);
  return {
    keycloakIssuer: ruw.KEYCLOAK_ISSUER,
    keycloakClientId: ruw.KEYCLOAK_CLIENT_ID,
    keycloakClientSecret: leesSecretBestand('KEYCLOAK_CLIENT_SECRET_FILE', ruw.KEYCLOAK_CLIENT_SECRET_FILE),
    nextauthUrl: ruw.NEXTAUTH_URL,
    nextauthSecret: leesSecretBestand('NEXTAUTH_SECRET_FILE', ruw.NEXTAUTH_SECRET_FILE),
    bootstrapBeheerderEmail: ruw.BOOTSTRAP_BEHEERDER_EMAIL,
  };
}

let gecacht: AuthEnv | undefined;

/**
 * Returns the auth configuration from process.env, validated once per process.
 * @returns The cached, validated auth configuration.
 */
export function authEnv(): AuthEnv {
  gecacht ??= leesAuthEnv(process.env);
  return gecacht;
}
