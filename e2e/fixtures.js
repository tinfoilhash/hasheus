import { randomBytes } from 'node:crypto'
import { test as base, expect } from '@playwright/test'
import { SimplePool } from 'nostr-tools/pool'
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
} from 'nostr-tools/pure'
import { RELAY_URL } from './test_servers.js'

const now = () => Math.floor(Date.now() / 1000)

// publishes events straight to the test relay, the way other nostr clients
// would, so each test can set up exactly the verifications it needs.
function createRelay(pool) {
  async function publish(secretKey, template) {
    await Promise.all(
      pool.publish([RELAY_URL], finalizeEvent(template, secretKey)),
    )
  }

  return {
    async createUser({ name, follows = [] } = {}) {
      const secretKey = generateSecretKey()
      const user = { secretKey, pubkey: getPublicKey(secretKey), name }

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
      user,
      { hash, url, createdAt = now(), description = 'a file' },
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
async function installExtension(page, user) {
  await page.exposeFunction('__testGetPublicKey', () => user.pubkey)
  await page.exposeFunction('__testSignEvent', (template) =>
    finalizeEvent(template, user.secretKey),
  )
  await page.addInitScript(() => {
    window.nostr = {
      getPublicKey: () => window.__testGetPublicKey(),
      signEvent: (template) => window.__testSignEvent(template),
    }
  })
}

const test = base.extend({
  // eslint-disable-next-line no-empty-pattern -- playwright requires fixtures to destructure their dependencies.
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

export { expect, randomHash, test }
