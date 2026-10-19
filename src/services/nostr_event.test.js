import NostrEvent from '@/services/nostr_event'
import { describe, expect, it } from 'vitest'

const RAW_EVENT = {
  id: '1'.repeat(64),
  pubkey: 'a'.repeat(64),
  created_at: 1_700_000_000,
  kind: 1,
  tags: [
    ['p', 'b'.repeat(64)],
    ['p', 'c'.repeat(64), 'wss://relay.example'],
    ['url', 'https://example.com/file'],
  ],
  content: 'hello',
  sig: '2'.repeat(128),
}

describe('NostrEvent', () => {
  it('groups tags by name, keeping every value', () => {
    const event = new NostrEvent(RAW_EVENT)

    expect(event.tags.get('p')).toEqual([
      ['b'.repeat(64)],
      ['c'.repeat(64), 'wss://relay.example'],
    ])
  })

  it('gets the first value of the first tag with a name', () => {
    const event = new NostrEvent(RAW_EVENT)

    expect(event.getFirstTagValue('p')).toBe('b'.repeat(64))
    expect(event.getFirstTagValue('missing')).toBeUndefined()
  })

  it('converts created_at from seconds to a date', () => {
    const event = new NostrEvent(RAW_EVENT)

    expect(event.createdAtDate).toEqual(new Date(1_700_000_000 * 1000))
  })

  it('encodes the pubkey as an npub, and truncates it for display', () => {
    const event = new NostrEvent(RAW_EVENT)

    expect(event.pubkeyEncoded).toBe(
      'npub1424242424242424242424242424242424242424242424242424qamrcaj',
    )
    expect(event.pubkeyEncodedTruncated).toBe('npub1424…4qamrcaj')
  })

  it('serializes back to the raw event', () => {
    const event = new NostrEvent(RAW_EVENT)

    expect(JSON.parse(JSON.stringify(event))).toEqual(RAW_EVENT)
  })
})
