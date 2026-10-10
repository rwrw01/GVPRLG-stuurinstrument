import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ['src/**/*.test.ts', 'app/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // Alle DB-rakende tests delen één lokale dev-Postgres zonder per-test isolatie
    // (afterEach-hooks doen deleteMany() op gedeelde tabellen). Parallelle testbestanden
    // race elkaar dan weg (FK- en unique-constraint-fouten). Voor dit fase A-doel
    // (lokale ontwikkeling) is sequentieel draaien de eenvoudigste correcte oplossing.
    fileParallelism: false,
  },
});
