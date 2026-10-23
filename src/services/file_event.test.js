import { buildFileEvent, buildUserEvent } from '@/test/event_builders'
import { describe, expect, it } from 'vitest'

describe('FileEvent', () => {
  describe('descriptionTrimmed', () => {
    it('trims the description', () => {
      expect(buildFileEvent({ content: ' a file ' }).descriptionTrimmed).toBe(
        'a file',
      )
    })

    it('is empty when the description is only whitespace', () => {
      expect(buildFileEvent({ content: ' \t\n' }).descriptionTrimmed).toBe('')
    })

    it('removes bidi controls from the description', () => {
      expect(
        buildFileEvent({ content: 'file\u202eosi.exe' }).descriptionTrimmed,
      ).toBe('fileosi.exe')
    })

    it('is empty when the description is only bidi controls and whitespace', () => {
      expect(
        buildFileEvent({ content: '\u202e \u2066' }).descriptionTrimmed,
      ).toBe('')
    })
  })

  describe('url', () => {
    it.each([
      'https://example.com/file.iso',
      'http://example.com/file.iso',
      'HTTPS://example.com/file.iso',
    ])('allows %s', (url) => {
      expect(buildFileEvent({ url }).url).toBe(url)
    })

    it.each([
      'javascript:alert(1)',
      ' java\tscript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'ftp://example.com/file.iso',
      '//evil.example/file.iso',
      'not a url',
      '',
    ])('rejects %j', (url) => {
      expect(buildFileEvent({ url }).url).toBeNull()
    })

    it('is null without a url tag', () => {
      expect(buildFileEvent().url).toBeNull()
    })
  })

  describe('userDisplayName', () => {
    it("uses the profile's display name", () => {
      const event = buildFileEvent()

      event.userEvent = buildUserEvent({ pubkey: event.pubkey, name: 'alice' })

      expect(event.userDisplayName).toBe('alice')
    })

    it('falls back to the truncated npub without a profile', () => {
      const event = buildFileEvent()

      expect(event.userDisplayName).toBe(event.pubkeyEncodedTruncated)
    })
  })
})
