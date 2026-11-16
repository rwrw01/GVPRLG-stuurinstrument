import { describe, expect, it } from 'vitest';

import { naarAuditFilter } from './auditToegang';

describe('naarAuditFilter', () => {
  it('should turn one platformId into a single-item platformIds list and keep the other fields', () => {
    expect(naarAuditFilter({ jaar: 2026, platformId: 'ro', actor: 'x', actie: 'ingelogd', limiet: 50 })).toEqual({
      jaar: 2026,
      platformIds: ['ro'],
      actor: 'x',
      actie: 'ingelogd',
      limiet: 50,
    });
  });

  it('should leave platformIds undefined without a platformId, so every platform matches', () => {
    expect(naarAuditFilter({ limiet: 200 })).toEqual({ limiet: 200, platformIds: undefined });
  });
});
