import { npubEncode } from 'nostr-tools/nip19'

class NostrEvent {
  id
  pubkey
  createdAt
  kind
  tags
  tagsRaw
  content
  contentRaw
  sig

  constructor({ id, pubkey, created_at: createdAt, kind, tags, content, sig }) {
    this.id = id
    this.pubkey = pubkey
    this.createdAt = createdAt
    this.kind = kind
    this.tagsRaw = tags
    this.tags = this.parseTags(tags)
    this.contentRaw = content
    this.content = this.parseContent(content)
    this.sig = sig
  }

  parseTags(tags) {
    const map = new Map()

    for (const [name, ...rest] of tags) {
      if (map.has(name)) {
        map.set(name, [...map.get(name), rest])
      } else {
        map.set(name, [rest])
      }
    }

    return map
  }

  parseContent(content) {
    return content
  }

  get pubkeyEncoded() {
    return npubEncode(this.pubkey)
  }

  get pubkeyEncodedTruncated() {
    const { pubkeyEncoded } = this

    return pubkeyEncoded.slice(0, 8) + '…' + pubkeyEncoded.slice(-8)
  }

  get createdAtDate() {
    return new Date(this.createdAt * 1000)
  }

  // anyone can set created_at, so one too large for a date shows as the raw
  // unix timestamp instead of "Invalid Date".
  get createdAtLocaleString() {
    const { createdAtDate } = this

    if (Number.isNaN(createdAtDate.getTime())) {
      return String(this.createdAt)
    }

    return createdAtDate.toLocaleString()
  }

  getFirstTagValue(name) {
    return this.tags.get(name)?.[0]?.[0]
  }

  toJSON() {
    return {
      id: this.id,
      pubkey: this.pubkey,
      created_at: this.createdAt,
      kind: this.kind,
      tags: this.tagsRaw,
      content: this.contentRaw,
      sig: this.sig,
    }
  }
}

export default NostrEvent
