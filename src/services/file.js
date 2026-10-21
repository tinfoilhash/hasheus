import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

class HFile {
  static WEB_CRYPTO_MAX_SIZE_BYTES = 1024 * 1024 * 512
  static HASH_CHUNK_SIZE_BYTES = 1024 * 1024 * 8

  file
  hash
  publishedFileEvent = null

  constructor({ file, hash }) {
    this.file = file
    this.hash = hash
  }

  static async build(file) {
    return new this({
      file,
      hash: await this.hash(file),
    })
  }

  // web crypto is about 4x faster, but it can only hash a whole file loaded into
  // memory, which fails for large files, so those are hashed in chunks instead.
  static async hash(file) {
    if (file.size <= this.WEB_CRYPTO_MAX_SIZE_BYTES) {
      return await this.hashWithWebCrypto(file)
    }

    return await this.hashInChunks(file)
  }

  static async hashWithWebCrypto(file) {
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      await file.arrayBuffer(),
    )

    return bytesToHex(new Uint8Array(hashBuffer))
  }

  static async hashInChunks(file) {
    const hasher = sha256.create()

    for (
      let offset = 0;
      offset < file.size;
      offset += this.HASH_CHUNK_SIZE_BYTES
    ) {
      const chunk = file.slice(offset, offset + this.HASH_CHUNK_SIZE_BYTES)

      hasher.update(new Uint8Array(await chunk.arrayBuffer()))
    }

    return bytesToHex(hasher.digest())
  }

  get name() {
    return this.file.name
  }

  get type() {
    return this.file.type
  }

  get size() {
    return this.file.size
  }

  get hasBeenPublished() {
    return Boolean(this.publishedFileEvent)
  }
}

export default HFile
