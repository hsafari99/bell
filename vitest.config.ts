import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/index.ts',
        '**/*.interface.ts',
        'vitest.config.ts',
        'src/models/api-responses.ts',
        'src/models/external-context.ts',
        'src/models/tax.ts',
        'src/api/index.ts',
        'src/providers/commerce-provider.interface.ts',
        'src/services/tax-calculators/tax-calculator.interface.ts',
      ]
    }
  }
});
