import type { Event as RawEvent } from 'nostr-tools/core'
import { npubEncode } from 'nostr-tools/nip19'

class NostrEvent<TContent = string> {
  id: string
  pubkey: string
  createdAt: number
  kind: number
  tags: Map<string, string[][]>
  tagsRaw: string[][]
  content: TContent
  contentRaw: string
  sig: string

  constructor({ id, pubkey, created_at: createdAt, kind, tags, content, sig }: RawEvent) {
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

  // a tag without a name can't be looked up, so it's left out.
  parseTags(tags: string[][]) {
    const map = new Map<string, string[][]>()

    for (const [name, ...rest] of tags) {
      if (name !== undefined) {
        map.set(name, [...(map.get(name) ?? []), rest])
      }
    }

    return map
  }

  // subclasses whose content isn't a string override this.
  parseContent(content: string) {
    return content as TContent
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

  getFirstTagValue(name: string) {
    return this.tags.get(name)?.[0]?.[0]
  }

  toJSON(): RawEvent {
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
