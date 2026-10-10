import { config as loadEnv } from 'dotenv';

// Tests moeten op een eigen testdatabase draaien, nooit op de interactieve dev-database:
// elke test-file doet deleteMany() zonder where-clause in afterEach. .env.test (zie
// .env.test.example) wijst naar een apart "_test"-gesufixte database op dezelfde lokale
// Postgres. override:true zorgt dat dit voorrang krijgt op een eventueel al geladen .env.
loadEnv({ path: '.env.test', override: true });

if (!process.env.DATABASE_URL?.includes('_test')) {
  throw new Error(
    'DATABASE_URL wijst niet naar een testdatabase (verwacht "_test" in de naam). ' +
      'Kopieer .env.test.example naar .env.test en controleer de inhoud voordat je de testsuite draait — ' +
      'anders wist de testsuite de interactieve dev-database.',
  );
}
