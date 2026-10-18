import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdtemp, open, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { env } from 'node:process'
import { expect, test } from './fixtures.js'

function sha256Hex(...chunks) {
  const hash = createHash('sha256')

  chunks.forEach((chunk) => hash.update(chunk))

  return hash.digest('hex')
}

test('choosing a file opens its verify page', async ({ page }) => {
  const contents = Buffer.from(`hello ${Math.random()}`)
  const hash = sha256Hex(contents)

  await page.goto('/')
  await page.getByTestId('file-input').setInputFiles({
    name: 'hello.txt',
    mimeType: 'text/plain',
    buffer: contents,
  })

  await expect(page).toHaveURL(`/${hash}`)
  await expect(page.getByTestId('file-hash')).toHaveText(hash)
  await expect(page.getByTestId('not-verified-status')).toBeVisible()
})

test('hashes a file too large for web crypto', async ({ page }) => {
  test.skip(!env.E2E_LARGE_FILE, 'set E2E_LARGE_FILE=1 to run')
  test.setTimeout(1000 * 60 * 5)

  // just over the 512 mb web crypto limit, so it's hashed in chunks. it's
  // written outside test-results so ci never uploads it.
  const chunk = Buffer.alloc(1024 * 1024 * 8, 7)
  const CHUNK_COUNT = 65
  const directory = await mkdtemp(join(tmpdir(), 'verify-e2e-'))
  const path = join(directory, 'large.iso')

  try {
    const file = await open(path, 'w')

    for (let index = 0; index < CHUNK_COUNT; index++) {
      await file.write(chunk)
    }

    await file.close()

    const hash = sha256Hex(...Array(CHUNK_COUNT).fill(chunk))

    await page.goto('/')
    await page.getByTestId('file-input').setInputFiles(path)

    await expect(page).toHaveURL(`/${hash}`, { timeout: 1000 * 60 * 4 })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
