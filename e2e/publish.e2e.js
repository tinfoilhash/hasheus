import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { expect, test } from './fixtures.js'
import { RELAY_PORT } from './test_servers.js'

async function chooseFile(page) {
  const contents = Buffer.from(`publish ${Math.random()}`)
  const hash = createHash('sha256').update(contents).digest('hex')

  await page.goto('/')
  await page.getByTestId('file-input').setInputFiles({
    name: 'file.txt',
    mimeType: 'text/plain',
    buffer: contents,
  })
  await expect(page).toHaveURL(`/${hash}`)

  return hash
}

test.describe('publishing', () => {
  test.beforeEach(async ({ relay, installExtension }) => {
    await installExtension(await relay.createUser({ name: 'publisher' }))
  })

  test('shows the verification as yours', async ({ page }) => {
    await chooseFile(page)
    await page.getByTestId('add-verification-link').click()
    await page.getByTestId('url-input').fill('https://example.com/file.txt')
    await page.getByTestId('publish-button').click()

    await expect(page.getByTestId('verified-status')).toBeVisible()
    await expect(page.getByTestId('url')).toContainText(
      'https://example.com/file.txt',
    )
    await expect(page.getByTestId('source')).toContainText('publisher')
    await expect(page.getByTestId('connect-button')).toHaveText(
      'connected: publisher',
    )
  })

  test('back returns to the start page instead of the form', async ({
    page,
  }) => {
    const hash = await chooseFile(page)

    await page.getByTestId('add-verification-link').click()
    await page.getByTestId('url-input').fill('https://example.com/file.txt')
    await page.getByTestId('publish-button').click()
    await expect(page.getByTestId('verified-status')).toBeVisible()
    await expect(page).toHaveURL(`/${hash}`)

    await page.goBack()

    await expect(page).toHaveURL('/')
  })

  test('only accepts web urls', async ({ page }) => {
    await chooseFile(page)
    await page.getByTestId('add-verification-link').click()
    await page.getByTestId('url-input').fill('javascript:alert(1)')
    await page.getByTestId('publish-button').click()

    await expect(page).toHaveURL('/publish')
    await expect(page.getByTestId('url-input')).toHaveJSProperty(
      'validity.valid',
      false,
    )
  })

  test('shows why the relay rejected the verification', async ({ page }) => {
    // passes everything through to the relay, except that it rejects
    // verifications the way a relay would.
    await page.routeWebSocket(new RegExp(`:${RELAY_PORT}`), (webSocket) => {
      const server = webSocket.connectToServer()

      webSocket.onMessage((message) => {
        const [type, event] = JSON.parse(message)

        if (type === 'EVENT' && event.kind === 1063) {
          webSocket.send(
            JSON.stringify(['OK', event.id, false, 'blocked: try again later']),
          )
          return
        }

        server.send(message)
      })
    })

    await chooseFile(page)
    await page.getByTestId('add-verification-link').click()
    await page.getByTestId('url-input').fill('https://example.com/file.txt')
    await page.getByTestId('publish-button').click()

    await expect(page.getByTestId('publish-error')).toContainText(
      'blocked: try again later',
    )
    await expect(page).toHaveURL('/publish')
    await expect(page.getByTestId('publish-button')).toBeEnabled()
  })
})

test('opening the form without a file redirects to the start page', async ({
  page,
}) => {
  await page.goto('/publish')

  await expect(page).toHaveURL('/')
  await expect(page.getByTestId('file-input')).toBeAttached()
})
