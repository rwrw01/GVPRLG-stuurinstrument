import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { config, proxy } from './proxy';

describe('proxy', () => {
  it('stuurt een pagina zonder cookie naar /inloggen met callbackUrl', () => {
    const response = proxy(new NextRequest('http://localhost:3000/metingen/2026?tab=2'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/inloggen?callbackUrl=%2Fmetingen%2F2026%3Ftab%3D2',
    );
  });

  it('geeft 401 problem+json op /api zonder cookie', async () => {
    const response = proxy(new NextRequest('http://localhost:3000/api/metingen'));

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
    expect(await response.json()).toEqual({
      type: 'about:blank',
      title: 'Niet ingelogd',
      status: 401,
      detail: 'Log in om deze gegevens te bekijken.',
    });
  });

  it('laat /api/healthz door', () => {
    expect(unstable_doesMiddlewareMatch({ config, url: '/api/healthz' })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: '/api/readyz' })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: '/api/auth/callback/keycloak' })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: '/inloggen/doorsturen' })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: '/geen-toegang' })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: '/api/metingen' })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: '/' })).toBe(true);
  });

  it('laat een request met sessiecookie door', () => {
    const request = new NextRequest('http://localhost:3000/api/metingen', {
      headers: { cookie: 'next-auth.session-token=abc' },
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});
