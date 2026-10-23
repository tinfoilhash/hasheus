import { expect, randomHash, test } from './fixtures.js'

test('a verification with an empty description shows the empty value', async ({
  page,
  relay,
}) => {
  const hash = randomHash()

  await relay.publishVerification(await relay.createUser({ name: 'alice' }), {
    hash,
    url: 'https://example.com/a.iso',
    description: '',
  })

  await page.goto(`/${hash}`)
  await expect(page.getByTestId('source')).toContainText('alice')
  await expect(page.getByTestId('description')).toHaveText('—')
})

test('a verification with a bidi override in its description shows it without the override', async ({
  page,
  relay,
}) => {
  const hash = randomHash()

  await relay.publishVerification(await relay.createUser({ name: 'alice' }), {
    hash,
    url: 'https://example.com/a.iso',
    description: 'file\u202eosi.exe',
  })

  await page.goto(`/${hash}`)
  await expect(page.getByTestId('description')).toHaveText('fileosi.exe')
})

test("switching straight to another file's page shows only that file's verifications", async ({
  page,
  relay,
}) => {
  const verifiedHash = randomHash()
  const unverifiedHash = randomHash()

  await relay.publishVerification(await relay.createUser({ name: 'alice' }), {
    hash: verifiedHash,
    url: 'https://example.com/a.iso',
    description: 'file a',
  })

  await page.goto(`/${verifiedHash}`)
  await expect(page.getByTestId('description')).toHaveText('file a')

  // a browser back or forward between two verify pages reuses the page, so
  // simulate one rather than loading the second page fresh.
  await page.evaluate((path) => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, `/${unverifiedHash}`)

  await expect(page.getByTestId('file-hash')).toHaveText(unverifiedHash)
  await expect(page.getByTestId('not-verified-status')).toBeVisible()
  await expect(page.getByTestId('description')).not.toContainText('file a')
  await expect(page.getByTestId('source')).not.toContainText('alice')
})
