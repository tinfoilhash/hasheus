import { expect, randomHash, test, type User } from './fixtures.ts'

// 2009-01-03, long before anyone else could have verified the file.
const BACKDATED_AT = 1_230_940_800
const EVIL_URL = 'https://evil.example/file.iso'
const GOOD_URL = 'https://good.example/file.iso'

test.describe('a file with a backdated verification', () => {
  let hash: string
  let viewer: User

  test.beforeEach(async ({ relay }) => {
    hash = randomHash()

    // distinct times, so "earliest" doesn't depend on the order the relay
    // returns events published in the same second.
    const minutesAgo = (minutes: number) => Math.floor(Date.now() / 1000) - 60 * minutes

    const attacker = await relay.createUser({ name: 'attacker' })
    const alice = await relay.createUser({ name: 'alice' })
    const bob = await relay.createUser({ name: 'bob' })
    const mirror = await relay.createUser({ name: 'mirror' })

    viewer = await relay.createUser({
      name: 'viewer',
      follows: [alice, bob, mirror],
    })

    await relay.publishVerification(attacker, {
      hash,
      url: EVIL_URL,
      createdAt: BACKDATED_AT,
      description: 'official download',
    })
    await relay.publishVerification(alice, {
      hash,
      url: GOOD_URL,
      createdAt: minutesAgo(3),
      description: 'from alice',
    })
    await relay.publishVerification(bob, {
      hash,
      url: GOOD_URL,
      createdAt: minutesAgo(1),
    })
    await relay.publishVerification(mirror, {
      hash,
      url: 'https://mirror.example/file.iso',
      createdAt: minutesAgo(2),
    })
  })

  test('is labeled unknown for visitors who aren’t connected', async ({ page }) => {
    await page.goto(`/${hash}`)

    await expect(page.getByTestId('unknown-status')).toContainText(
      'connect to see if anyone you follow has verified this file',
    )
    await expect(page.getByTestId('description')).toHaveText('official download')
    await expect(page.getByTestId('url')).toContainText(EVIL_URL)
    await expect(page.getByTestId('unknown-tag')).toHaveCount(2)
    await expect(page.getByTestId('trusted-tag')).toHaveCount(0)
  })

  test('is replaced by the url trusted verifiers agree on once connected', async ({
    page,
    installExtension,
  }) => {
    await installExtension(viewer)
    await page.goto(`/${hash}`)
    await page.getByTestId('connect-button').click()

    await expect(page.getByTestId('url')).toContainText(GOOD_URL)
    await expect(page.getByTestId('agreement-tag')).toHaveText('+1 trusted')
    await expect(page.getByTestId('description')).toHaveText('from alice')
    await expect(page.getByTestId('source')).toContainText('alice')
    await expect(page.getByTestId('unknown-status')).toHaveCount(0)
    await expect(page.getByTestId('unknown-tag')).toHaveCount(0)
    await expect(page.getByTestId('trusted-tag')).toHaveCount(1)
    await expect(page.getByTestId('trusted-verifiers').locator('h-user-picture')).toHaveCount(3)
    await expect(page.getByTestId('trusted-status')).toHaveText(
      '3 people you follow verified this file',
    )
  })
})

test('warns when no one you follow has verified the file', async ({
  page,
  relay,
  installExtension,
}) => {
  const hash = randomHash()
  const stranger = await relay.createUser({ name: 'stranger' })

  await relay.publishVerification(stranger, { hash, url: GOOD_URL })
  await installExtension(await relay.createUser({ name: 'viewer' }))
  await page.goto(`/${hash}`)
  await page.getByTestId('connect-button').click()

  await expect(page.getByTestId('unknown-status')).toContainText(
    'no one you follow has verified this file',
  )
})

test('doesn’t link a url that isn’t http(s)', async ({ page, relay }) => {
  const hash = randomHash()

  await relay.publishVerification(await relay.createUser(), {
    hash,
    url: 'javascript:alert(document.domain)',
  })
  await page.goto(`/${hash}`)

  await expect(page.getByTestId('source')).not.toBeEmpty()
  await expect(page.getByTestId('url').locator('a')).toHaveCount(0)
})
