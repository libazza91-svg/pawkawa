import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/db/client.ts',
        'src/db/index.ts',
        'src/db/migrate.ts',
        'src/db/seed.ts',
        'src/routes/compare.ts',
        'src/**/*_2026*.ts',
        'src/**/*.bak.ts',
      ],
    },
  },
});
