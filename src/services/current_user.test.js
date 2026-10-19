import { buildCurrentUser } from '@/test/event_builders'
import { describe, expect, it } from 'vitest'

const PUBKEYS = {
  me: 'a'.repeat(64),
  followed: 'b'.repeat(64),
  stranger: 'c'.repeat(64),
}

describe('CurrentUser', () => {
  describe('hasTrusted', () => {
    it('trusts the current user', () => {
      expect(buildCurrentUser().hasTrusted(PUBKEYS.me)).toBe(true)
    })

    it('trusts followed pubkeys', () => {
      const currentUser = buildCurrentUser({ follows: [PUBKEYS.followed] })

      expect(currentUser.hasTrusted(PUBKEYS.followed)).toBe(true)
    })

    it("doesn't trust anyone else", () => {
      const currentUser = buildCurrentUser({ follows: [PUBKEYS.followed] })

      expect(currentUser.hasTrusted(PUBKEYS.stranger)).toBe(false)
    })

    it('trusts only the current user with an empty follow list', () => {
      const currentUser = buildCurrentUser({ follows: [] })

      expect(currentUser.hasTrusted(PUBKEYS.me)).toBe(true)
      expect(currentUser.hasTrusted(PUBKEYS.followed)).toBe(false)
    })

    it('trusts only the current user without a follow list', () => {
      const currentUser = buildCurrentUser({ hasFollowList: false })

      expect(currentUser.hasTrusted(PUBKEYS.me)).toBe(true)
      expect(currentUser.hasTrusted(PUBKEYS.followed)).toBe(false)
    })
  })
})
