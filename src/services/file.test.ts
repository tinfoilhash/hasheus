import { createHash } from 'node:crypto'
import HFile from '@/services/file'
import { describe, expect, it } from 'vite-plus/test'

// shrinks the thresholds so both hashing paths and their chunk boundaries can
// be tested with tiny files.
class SmallHFile extends HFile {
  static override readonly WEB_CRYPTO_MAX_SIZE_BYTES = 16
  static override readonly HASH_CHUNK_SIZE_BYTES = 4
}

function buildBytes(size: number) {
  return Uint8Array.from({ length: size }, (_, index) => index % 251)
}

function sha256Hex(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex')
}

describe('HFile', () => {
  describe('hash', () => {
    it.each([
      ['an empty file', 0],
      ['a file under the web crypto limit', 15],
      ['a file exactly at the web crypto limit', 16],
      ['a file just over the web crypto limit', 17],
      ['a file that fills its last chunk exactly', 20],
      ['a file with a partial last chunk', 23],
    ])('hashes %s', async (_, size) => {
      const bytes = buildBytes(size)

      expect(await SmallHFile.hash(new File([bytes], 'file'))).toBe(sha256Hex(bytes))
    })

    it('hashes in chunks only above the web crypto limit', async () => {
      class SpyHFile extends SmallHFile {
        static chunkedSizes: number[] = []

        static override async hashInChunks(file: File) {
          this.chunkedSizes.push(file.size)

          return await super.hashInChunks(file)
        }
      }

      await SpyHFile.hash(new File([buildBytes(16)], 'file'))
      await SpyHFile.hash(new File([buildBytes(17)], 'file'))

      expect(SpyHFile.chunkedSizes).toEqual([17])
    })

    it('matches the default thresholds on a real-sized file', async () => {
      const bytes = buildBytes(1024 * 1024)

      expect(await HFile.hash(new File([bytes], 'file'))).toBe(sha256Hex(bytes))
    })
  })

  describe('build', () => {
    it('wraps the file with its hash', async () => {
      const file = new File([buildBytes(3)], 'file.bin', {
        type: 'application/octet-stream',
      })

      const hFile = await HFile.build(file)

      expect(hFile.hash).toBe(sha256Hex(buildBytes(3)))
      expect(hFile.name).toBe('file.bin')
      expect(hFile.type).toBe('application/octet-stream')
      expect(hFile.size).toBe(3)
      expect(hFile.hasBeenPublished).toBe(false)
    })
  })

  describe('name', () => {
    it('removes bidi controls, so the extension reads as it is', () => {
      const hFile = new HFile({ file: new File([], 'file\u202eosi.exe'), hash: '' })

      expect(hFile.name).toBe('fileosi.exe')
    })
  })

  describe('type', () => {
    it("guesses from the extension when the browser doesn't know it", () => {
      const hFile = new HFile({ file: new File([], 'app.dmg'), hash: '' })

      expect(hFile.type).toBe('application/x-apple-diskimage')
    })

    it('guesses from the extension when the browser reports the generic type', () => {
      const file = new File([], 'app.dmg', { type: 'application/octet-stream' })

      expect(new HFile({ file, hash: '' }).type).toBe('application/x-apple-diskimage')
    })

    it('keeps a specific type the browser reports', () => {
      const file = new File([], 'notes.dmg', { type: 'text/plain' })

      expect(new HFile({ file, hash: '' }).type).toBe('text/plain')
    })
  })
})
