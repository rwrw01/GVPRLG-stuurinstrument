import { describe, expect, it } from 'vitest';

import { vereisLokaleDatabase } from './lokale-database';

describe('vereisLokaleDatabase', () => {
  it('should allow a database on localhost or 127.0.0.1', () => {
    expect(vereisLokaleDatabase('postgresql://u:p@127.0.0.1:5433/gvprlg')).toBe('127.0.0.1');
    expect(vereisLokaleDatabase('postgresql://u:p@localhost:5433/gvprlg')).toBe('localhost');
  });

  it('should refuse a remote host, naming it, unless E2E_ALLOW_DB names exactly that host', () => {
    expect(() => vereisLokaleDatabase('postgresql://u:p@db.example.nl:5432/gvprlg')).toThrow(/host "db\.example\.nl"/);
    expect(() => vereisLokaleDatabase('postgresql://u:p@db.example.nl:5432/gvprlg', 'other.host')).toThrow(/not a local database/);
    expect(vereisLokaleDatabase('postgresql://u:p@db.example.nl:5432/gvprlg', 'db.example.nl')).toBe('db.example.nl');
  });

  it('should refuse a missing or malformed URL', () => {
    expect(() => vereisLokaleDatabase(undefined)).toThrow(/not set/);
    expect(() => vereisLokaleDatabase('geen url')).toThrow(/not a valid URL/);
  });

  it('should allow the IPv6 loopback [::1]', () => {
    expect(vereisLokaleDatabase('postgresql://u:p@[::1]:5433/gvprlg')).toBe('[::1]');
  });

  it('should refuse a URL that moves the host into ?host= or ?hostaddr=, even with a local authority', () => {
    expect(() => vereisLokaleDatabase('postgresql://u:p@localhost:5433/gvprlg?host=db.example.nl')).toThrow(/\?host=/);
    expect(() => vereisLokaleDatabase('postgresql://u:p@127.0.0.1/gvprlg?hostaddr=10.0.0.5')).toThrow(/\?hostaddr=/);
    expect(() => vereisLokaleDatabase('postgresql://u:p@localhost/gvprlg?host=/var/run/postgresql')).toThrow(/\?host=/);
  });

  it('should never treat an empty host or an empty E2E_ALLOW_DB as a match', () => {
    expect(() => vereisLokaleDatabase('postgresql:///gvprlg')).toThrow(/no host/);
    expect(() => vereisLokaleDatabase('postgresql://u:p@db.example.nl/gvprlg', '')).toThrow(/not a local database/);
    expect(() => vereisLokaleDatabase('postgresql://u:p@db.example.nl/gvprlg', '   ')).toThrow(/not a local database/);
  });
});
