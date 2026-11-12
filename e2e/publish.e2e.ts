import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { npubEncode } from 'nostr-tools/nip19'
import type { Page } from '@playwright/test'
import { expect, test, type User } from './fixtures.ts'
import { RELAY_PORT } from './test_servers.ts'

async function chooseFile(page: Page, { name = 'file.txt', mimeType = 'text/plain' } = {}) {
  const contents = Buffer.from(`publish ${Math.random()}`)
  const hash = createHash('sha256').update(contents).digest('hex')

  await page.goto('/')
  await page.getByTestId('file-input').setInputFiles({
    name,
    mimeType,
    buffer: contents,
  })
  await expect(page).toHaveURL(`/${hash}`)

  return hash
}

async function openConnectedForm(page: Page) {
  const hash = await chooseFile(page)

  await page.getByTestId('add-verification-link').click()
  await page.getByTestId('verifier').getByTestId('connect-button').click()
  await expect(page.getByTestId('publish-button')).toBeEnabled()

  return hash
}

test.describe('publishing', () => {
  let publisher: User

  test.beforeEach(async ({ relay, installExtension }) => {
    publisher = await relay.createUser({ name: 'publisher' })
    await installExtension(publisher)
  })

  test('shows the verification as yours', async ({ page }) => {
    await openConnectedForm(page)
    await page.getByTestId('url-input').fill('https://example.com/file.txt')
    await page.getByTestId('publish-button').click()

    await expect(page.getByTestId('verified-status')).toBeVisible()
    await expect(page.getByTestId('url')).toContainText('https://example.com/file.txt')
    await expect(page.getByTestId('source')).toContainText('publisher')
    await expect(page.getByTestId('connect-button')).toHaveText('connected: publisher')
  })

  test("doesn't show the verification as yours once disconnected", async ({ page }) => {
    await openConnectedForm(page)
    await page.getByTestId('url-input').fill('https://example.com/file.txt')
    await page.getByTestId('publish-button').click()
    await expect(page.getByTestId('verified-status')).toBeVisible()

    await page.getByTestId('connect-button').click()

    await expect(page.getByTestId('connect-button')).toHaveText('connect')
    await expect(page.getByTestId('verified-status')).toHaveCount(0)
    await expect(page.getByTestId('unknown-status')).toBeVisible()
  })

  test('shows the mime type, guessed when the browser reports the generic one', async ({
    page,
  }) => {
    await chooseFile(page, {
      name: 'app.dmg',
      mimeType: 'application/octet-stream',
    })
    await page.getByTestId('add-verification-link').click()

    await expect(page.getByTestId('mime-type')).toHaveText('application/x-apple-diskimage')
  })

  test('only enables publishing once connected', async ({ page }) => {
    await chooseFile(page)
    await page.getByTestId('add-verification-link').click()

    await expect(page.getByTestId('publish-button')).toBeDisabled()

    await page.getByTestId('verifier').getByTestId('connect-button').click()

    const npub = npubEncode(publisher.pubkey)

    await expect(page.getByTestId('verifier')).toHaveText(
      `publisher (${npub.slice(0, 8)}…${npub.slice(-8)})`,
    )
    await expect(page.getByTestId('publish-button')).toBeEnabled()
  })

  test('back returns to the start page instead of the form', async ({ page }) => {
    const hash = await openConnectedForm(page)

    await page.getByTestId('url-input').fill('https://example.com/file.txt')
    await page.getByTestId('publish-button').click()
    await expect(page.getByTestId('verified-status')).toBeVisible()
    await expect(page).toHaveURL(`/${hash}`)

    await page.goBack()

    await expect(page).toHaveURL('/')
  })

  test('only accepts web urls', async ({ page }) => {
    await openConnectedForm(page)
    await page.getByTestId('url-input').fill('javascript:alert(1)')
    await page.getByTestId('publish-button').click()

    await expect(page).toHaveURL('/publish')
    await expect(page.getByTestId('url-input')).toBeFocused()
    await expect(page.getByTestId('url-input')).toHaveAccessibleDescription(
      'enter a url that starts with http:// or https://',
    )
  })

  test('asks for a url, until one is entered', async ({ page }) => {
    await openConnectedForm(page)
    await page.getByTestId('publish-button').click()

    await expect(page).toHaveURL('/publish')
    await expect(page.getByTestId('url-input')).toBeFocused()
    await expect(page.getByTestId('url-input')).toHaveAccessibleDescription(
      'add a url for the file',
    )

    await page.getByTestId('url-input').fill('https://example.com/file.txt')

    await expect(page.getByTestId('url-input')).toHaveAccessibleDescription(
      'where you got it, or where people can download it.',
    )
  })

  test('asks for a description once it has been cleared', async ({ page }) => {
    await openConnectedForm(page)
    await page.getByLabel('description').fill('')
    await page.getByLabel('description').blur()

    await expect(page.getByLabel('description')).toHaveAccessibleDescription('describe the file')
  })

  test('shows why the relay rejected the verification', async ({ page }) => {
    // passes everything through to the relay, except that it rejects
    // verifications the way a relay would.
    await page.routeWebSocket(new RegExp(`:${RELAY_PORT}`), (webSocket) => {
      const server = webSocket.connectToServer()

      webSocket.onMessage((message) => {
        const [type, event] = JSON.parse(String(message))

        if (type === 'EVENT' && event.kind === 1063) {
          webSocket.send(JSON.stringify(['OK', event.id, false, 'blocked: try again later']))
          return
        }

        server.send(message)
      })
    })

    await openConnectedForm(page)
    await page.getByTestId('url-input').fill('https://example.com/file.txt')
    await page.getByTestId('publish-button').click()

    await expect(page.getByTestId('publish-error')).toContainText('blocked: try again later')
    await expect(page).toHaveURL('/publish')
    await expect(page.getByTestId('publish-button')).toBeEnabled()
  })
})

test('opening the form without a file redirects to the start page', async ({ page }) => {
  await page.goto('/publish')

  await expect(page).toHaveURL('/')
  await expect(page.getByTestId('file-input')).toBeAttached()
})
