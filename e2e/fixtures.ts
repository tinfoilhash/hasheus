import { randomBytes } from 'node:crypto'
import { test as base, expect, type Page } from '@playwright/test'
import type { EventTemplate, VerifiedEvent } from 'nostr-tools/core'
import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure'
import { RELAY_URL } from './test_servers.ts'

interface User {
  secretKey: Uint8Array
  pubkey: string
  name?: string
}

// the hooks installExtension exposes to the page.
type TestWindow = typeof window & {
  __testGetPublicKey: () => Promise<string>
  __testSignEvent: (template: EventTemplate) => Promise<VerifiedEvent>
}

const now = () => Math.floor(Date.now() / 1000)

// publishes events straight to the test relay, the way other nostr clients
// would, so each test can set up exactly the verifications it needs.
function createRelay(pool: SimplePool) {
  async function publish(secretKey: Uint8Array, template: EventTemplate) {
    await Promise.all(pool.publish([RELAY_URL], finalizeEvent(template, secretKey)))
  }

  return {
    async createUser({ name, follows = [] }: { name?: string; follows?: User[] } = {}) {
      const secretKey = generateSecretKey()
      const user: User = { secretKey, pubkey: getPublicKey(secretKey), name }

      if (name) {
        await publish(secretKey, {
          kind: 0,
          created_at: now(),
          tags: [],
          content: JSON.stringify({ name }),
        })
      }

      if (follows.length) {
        await publish(secretKey, {
          kind: 3,
          created_at: now(),
          tags: follows.map(({ pubkey }) => ['p', pubkey]),
          content: '',
        })
      }

      return user
    },

    async publishVerification(
      user: User,
      {
        hash,
        url,
        createdAt = now(),
        description = 'a file',
      }: { hash: string; url: string; createdAt?: number; description?: string },
    ) {
      await publish(user.secretKey, {
        kind: 1063,
        created_at: createdAt,
        tags: [
          ['x', hash],
          ['m', 'application/octet-stream'],
          ['size', '1'],
          ['url', url],
        ],
        content: description,
      })
    },
  }
}

// stands in for a nostr browser extension, signing in node with the user's key.
async function installExtension(page: Page, user: User) {
  await page.exposeFunction('__testGetPublicKey', () => user.pubkey)
  await page.exposeFunction('__testSignEvent', (template: EventTemplate) =>
    finalizeEvent(template, user.secretKey),
  )
  await page.addInitScript(() => {
    const testWindow = window as TestWindow

    testWindow.nostr = {
      getPublicKey: () => testWindow.__testGetPublicKey(),
      signEvent: (template) => testWindow.__testSignEvent(template),
    }
  })
}

const test = base.extend<{
  relay: ReturnType<typeof createRelay>
  installExtension: (user: User) => Promise<void>
}>({
  // oxlint-disable-next-line no-empty-pattern -- playwright requires fixtures to destructure their dependencies.
  relay: async ({}, use) => {
    const pool = new SimplePool()

    await use(createRelay(pool))

    pool.destroy()
  },

  installExtension: async ({ page }, use) => {
    await use((user) => installExtension(page, user))
  },
})

function randomHash() {
  return randomBytes(32).toString('hex')
}

export type { User }

export { expect, randomHash, test }
