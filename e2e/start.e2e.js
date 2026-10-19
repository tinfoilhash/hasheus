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

// drops files on the page one after another, without waiting in between. each
// file is either text or a size filled with one byte value, built in the page.
async function dropFiles(page, files) {
  await page.evaluate((files) => {
    for (const [index, { text, size, fill }] of files.entries()) {
      const dataTransfer = new DataTransfer()
      const contents = text ?? new Uint8Array(size).fill(fill)

      dataTransfer.items.add(new File([contents], `file-${index}`))
      window.dispatchEvent(
        new DragEvent('drop', { dataTransfer, cancelable: true }),
      )
    }
  }, files)
}

test('dropping a file opens its verify page', async ({ page }) => {
  const text = `dropped ${Math.random()}`
  const hash = sha256Hex(Buffer.from(text))

  await page.goto('/')
  await dropFiles(page, [{ text }])

  await expect(page).toHaveURL(`/${hash}`)
  await expect(page.getByTestId('file-hash')).toHaveText(hash)
})

test('lets files be dragged onto the page', async ({ page }) => {
  await page.goto('/')

  // browsers only allow a drop where dragenter and dragover are canceled.
  const canceledTypes = await page.evaluate(() =>
    ['dragenter', 'dragover'].filter(
      (type) =>
        !window.dispatchEvent(
          new DragEvent(type, {
            dataTransfer: new DataTransfer(),
            cancelable: true,
          }),
        ),
    ),
  )

  expect(canceledTypes).toEqual(['dragenter', 'dragover'])
})

test('ignores a file dropped while another is hashing', async ({ page }) => {
  test.setTimeout(1000 * 60)

  // the second file is tiny, so if it were hashed too it would finish first
  // and its page would open instead.
  const large = { size: 1024 * 1024 * 64, fill: 7 }
  const largeHash = sha256Hex(Buffer.alloc(large.size, large.fill))
  const text = `small ${Math.random()}`

  await page.goto('/')
  await dropFiles(page, [large, { text }])

  await expect(page).toHaveURL(`/${largeHash}`, { timeout: 1000 * 30 })
  await expect(page.getByTestId('file-hash')).toHaveText(largeHash)
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
