import { configs as litConfigs } from 'eslint-plugin-lit'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  fmt: {
    // `vp config` rewrites the vite+ section of AGENTS.md unwrapped on every install.
    overrides: [{ files: ['AGENTS.md'], options: { proseWrap: 'preserve' } }],
    proseWrap: 'always',
    semi: false,
    singleQuote: true,
  },
  lint: {
    categories: {
      correctness: 'error',
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: ['eslint-plugin-lit', { name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: {
      ...litConfigs['flat/recommended'].rules,
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // `vp staged` in the pre-commit hook runs these one glob at a time, since
  // both fix `.ts` files.
  staged: {
    '*': 'vp check --fix',
    '*.ts': 'stylelint --fix',
  },
  test: {
    coverage: {
      include: ['src/lib/**/*.ts', 'src/services/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text', 'html'],
      reportOnFailure: true,
    },
  },
})
