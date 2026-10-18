import UserEvent from '@/services/user_event'
import { describe, expect, it } from 'vitest'

function buildUserEvent(content) {
  return new UserEvent({
    id: '1'.repeat(64),
    pubkey: 'a'.repeat(64),
    created_at: 1,
    kind: UserEvent.KIND,
    tags: [],
    content,
    sig: '',
  })
}

describe('UserEvent', () => {
  describe('content', () => {
    it('parses a json object', () => {
      expect(buildUserEvent('{"name":"alice"}').content).toEqual({
        name: 'alice',
      })
    })

    it.each(['null', '42', '"just a string"', 'true'])(
      'treats %s as an empty profile',
      (content) => {
        expect(buildUserEvent(content).content).toEqual({})
      },
    )

    it("throws on content that isn't json", () => {
      expect(() => buildUserEvent('{not json')).toThrow(SyntaxError)
    })
  })

  describe('displayName', () => {
    it('prefers display_name', () => {
      const event = buildUserEvent('{"display_name":"Alice","name":"alice"}')

      expect(event.displayName).toBe('Alice')
    })

    it('falls back to name when display_name is empty', () => {
      const event = buildUserEvent('{"display_name":"","name":"alice"}')

      expect(event.displayName).toBe('alice')
    })

    it('falls back to the truncated npub without a name', () => {
      const event = buildUserEvent('null')

      expect(event.displayName).toBe(event.pubkeyEncodedTruncated)
    })
  })

  it('exposes the picture', () => {
    const event = buildUserEvent('{"picture":"https://example.com/a.png"}')

    expect(event.picture).toBe('https://example.com/a.png')
  })
})
