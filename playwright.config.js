import { env } from 'node:process'
import { defineConfig, devices } from '@playwright/test'
import { APP_PORT, RELAY_PORT, RELAY_URL } from './e2e/test_servers.js'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.js',
  fullyParallel: true,
  forbidOnly: Boolean(env.CI),
  retries: env.CI ? 1 : 0,
  reporter: env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    testIdAttribute: 'data-cy',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      // nak waits for a piped stdin to close before starting, so it gets none.
      command: `nak serve --port ${RELAY_PORT} < /dev/null`,
      port: RELAY_PORT,
      stderr: 'ignore',
      reuseExistingServer: !env.CI,
    },
    {
      command: `npx vite --port ${APP_PORT} --strictPort`,
      port: APP_PORT,
      env: { VITE_FILE_RELAY_URLS: RELAY_URL, VITE_USER_RELAY_URLS: RELAY_URL },
      reuseExistingServer: !env.CI,
    },
  ],
})
