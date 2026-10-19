import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    coverage: {
      include: ['src/services/**/*.js'],
      exclude: ['src/**/*.test.js'],
      reporter: ['text', 'html'],
      reportOnFailure: true,
    },
  },
})
