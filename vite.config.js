import lit from 'eslint-plugin-lit'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  fmt: {
    proseWrap: 'always',
    semi: false,
    singleQuote: true,
  },
  // type-aware linting is off: this is plain js, so those rules only see
  // inferred types and flag false positives, like methods bound in constructors.
  lint: {
    categories: {
      correctness: 'error',
    },
    jsPlugins: ['eslint-plugin-lit', { name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: {
      ...lit.configs['flat/recommended'].rules,
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // `vp staged` in the pre-commit hook runs these one glob at a time, since
  // both fix `.js` files.
  staged: {
    '*': 'vp check --fix',
    '*.js': 'stylelint --fix',
  },
  test: {
    coverage: {
      include: ['src/lib/**/*.js', 'src/services/**/*.js'],
      exclude: ['src/**/*.test.js'],
      reporter: ['text', 'html'],
      reportOnFailure: true,
    },
  },
})
