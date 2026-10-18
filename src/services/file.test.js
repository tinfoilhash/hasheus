import { createHash } from 'node:crypto'
import THVFile from '@/services/file'
import { describe, expect, it } from 'vitest'

// shrinks the thresholds so both hashing paths and their chunk boundaries can
// be tested with tiny files.
class SmallTHVFile extends THVFile {
  static WEB_CRYPTO_MAX_SIZE_BYTES = 16
  static HASH_CHUNK_SIZE_BYTES = 4
}

function buildBytes(size) {
  return Uint8Array.from({ length: size }, (_, index) => index % 251)
}

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

describe('THVFile', () => {
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

      expect(await SmallTHVFile.hash(new File([bytes], 'file'))).toBe(
        sha256Hex(bytes),
      )
    })

    it('hashes in chunks only above the web crypto limit', async () => {
      class SpyTHVFile extends SmallTHVFile {
        static chunkedSizes = []

        static async hashInChunks(file) {
          this.chunkedSizes.push(file.size)

          return await super.hashInChunks(file)
        }
      }

      await SpyTHVFile.hash(new File([buildBytes(16)], 'file'))
      await SpyTHVFile.hash(new File([buildBytes(17)], 'file'))

      expect(SpyTHVFile.chunkedSizes).toEqual([17])
    })

    it('matches the default thresholds on a real-sized file', async () => {
      const bytes = buildBytes(1024 * 1024)

      expect(await THVFile.hash(new File([bytes], 'file'))).toBe(
        sha256Hex(bytes),
      )
    })
  })

  describe('build', () => {
    it('wraps the file with its hash', async () => {
      const file = new File([buildBytes(3)], 'file.bin', {
        type: 'application/octet-stream',
      })

      const thvFile = await THVFile.build(file)

      expect(thvFile.hash).toBe(sha256Hex(buildBytes(3)))
      expect(thvFile.name).toBe('file.bin')
      expect(thvFile.type).toBe('application/octet-stream')
      expect(thvFile.size).toBe(3)
      expect(thvFile.hasBeenPublished).toBe(false)
    })
  })
})
