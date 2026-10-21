import { expect, randomHash, test } from './fixtures.js'
import { RELAY_PORT } from './test_servers.js'

test('connects and disconnects', async ({ page, relay, installExtension }) => {
  const friend = await relay.createUser({ name: 'friend' })

  await installExtension(
    await relay.createUser({ name: 'carol', follows: [friend] }),
  )
  await page.goto(`/${randomHash()}`)

  await page.getByTestId('connect-button').click()
  await expect(page.getByTestId('connect-button')).toHaveText(
    'connected: carol',
  )

  await page.getByTestId('connect-button').click()
  await expect(page.getByTestId('connect-button')).toHaveText('connect')
})

test('connects someone who doesn’t follow anyone', async ({
  page,
  relay,
  installExtension,
}) => {
  await installExtension(await relay.createUser({ name: 'newcomer' }))
  await page.goto(`/${randomHash()}`)

  await page.getByTestId('connect-button').click()

  await expect(page.getByTestId('connect-button')).toHaveText(
    'connected: newcomer',
  )
  await expect(page.getByTestId('connect-error')).toHaveCount(0)
})

test('stays connected after a reload', async ({
  page,
  relay,
  installExtension,
}) => {
  await installExtension(await relay.createUser({ name: 'dave' }))
  await page.goto(`/${randomHash()}`)
  await page.getByTestId('connect-button').click()
  await expect(page.getByTestId('connect-button')).toHaveText('connected: dave')

  await page.reload()

  await expect(page.getByTestId('connect-button')).toHaveText('connected: dave')
})

test('shows an error when the hasheus relay is unreachable', async ({
  page,
}) => {
  await page.routeWebSocket(new RegExp(`:${RELAY_PORT}`), (webSocket) =>
    webSocket.close(),
  )
  await page.goto(`/${randomHash()}`)

  await expect(page.getByTestId('subscribe-error')).toContainText(
    'unable to connect to hasheus server',
  )
  await expect(page.getByTestId('not-verified-status')).toHaveCount(0)
})

test('explains that connecting needs a nostr extension', async ({ page }) => {
  await page.goto(`/${randomHash()}`)

  await page.getByTestId('connect-button').click()

  await expect(page.getByTestId('connect-error')).toContainText(
    'unable to connect without nostr browser extension',
  )
})
