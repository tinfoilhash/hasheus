import FileEvent from '@/services/file_event'
import UserEvent from '@/services/user_event'
import { describe, expect, it } from 'vitest'

function buildFileEvent({ url } = {}) {
  return new FileEvent({
    id: '1'.repeat(64),
    pubkey: 'a'.repeat(64),
    created_at: 1,
    kind: FileEvent.KIND,
    tags: [['x', 'f'.repeat(64)], ...(url === undefined ? [] : [['url', url]])],
    content: 'description',
    sig: '',
  })
}

describe('FileEvent', () => {
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

      event.userEvent = new UserEvent({
        pubkey: event.pubkey,
        created_at: 1,
        kind: UserEvent.KIND,
        tags: [],
        content: '{"name":"alice"}',
      })

      expect(event.userDisplayName).toBe('alice')
    })

    it('falls back to the truncated npub without a profile', () => {
      const event = buildFileEvent()

      expect(event.userDisplayName).toBe(event.pubkeyEncodedTruncated)
    })
  })
})
