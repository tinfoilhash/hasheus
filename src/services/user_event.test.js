import { buildUserEvent } from '@/test/event_builders'
import { describe, expect, it } from 'vitest'

describe('UserEvent', () => {
  describe('content', () => {
    it('parses a json object', () => {
      expect(buildUserEvent({ content: '{"name":"alice"}' }).content).toEqual({
        name: 'alice',
      })
    })

    it.each(['null', '42', '"just a string"', 'true'])(
      'treats %s as an empty profile',
      (content) => {
        expect(buildUserEvent({ content }).content).toEqual({})
      },
    )

    it("throws on content that isn't json", () => {
      expect(() => buildUserEvent({ content: '{not json' })).toThrow(
        SyntaxError,
      )
    })
  })

  describe('displayName', () => {
    it('prefers display_name', () => {
      const event = buildUserEvent({
        content: '{"display_name":"Alice","name":"alice"}',
      })

      expect(event.displayName).toBe('Alice')
    })

    it('falls back to name when display_name is empty', () => {
      const event = buildUserEvent({
        content: '{"display_name":"","name":"alice"}',
      })

      expect(event.displayName).toBe('alice')
    })

    it('falls back to the truncated npub without a name', () => {
      const event = buildUserEvent({ content: 'null' })

      expect(event.displayName).toBe(event.pubkeyEncodedTruncated)
    })

    it('falls back to the truncated npub when the names are only whitespace', () => {
      const event = buildUserEvent({
        content: '{"display_name":"  ","name":"\\t"}',
      })

      expect(event.displayName).toBe(event.pubkeyEncodedTruncated)
    })

    it('falls back to the truncated npub when the names are not strings', () => {
      const event = buildUserEvent({
        content: '{"display_name":42,"name":{"first":"alice"}}',
      })

      expect(event.displayName).toBe(event.pubkeyEncodedTruncated)
    })

    it('trims the name', () => {
      const event = buildUserEvent({ content: '{"name":" alice "}' })

      expect(event.displayName).toBe('alice')
    })

    it('removes bidi controls from the name', () => {
      const event = buildUserEvent({ content: '{"name":"file\\u202eosi.exe"}' })

      expect(event.displayName).toBe('fileosi.exe')
    })

    it('falls back to name when display_name is only bidi controls', () => {
      const event = buildUserEvent({
        content: '{"display_name":"\\u202e","name":"alice"}',
      })

      expect(event.displayName).toBe('alice')
    })

    it('falls back to the truncated npub when the names are only bidi controls and whitespace', () => {
      const event = buildUserEvent({
        content: '{"display_name":"\\u202e \\u2066","name":"\\u200f"}',
      })

      expect(event.displayName).toBe(event.pubkeyEncodedTruncated)
    })
  })

  it('exposes the picture', () => {
    const event = buildUserEvent({
      content: '{"picture":"https://example.com/a.png"}',
    })

    expect(event.picture).toBe('https://example.com/a.png')
  })
})
