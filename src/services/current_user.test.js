import CurrentUser from '@/services/current_user'
import FollowListEvent from '@/services/follow_list_event'
import UserEvent from '@/services/user_event'
import { describe, expect, it } from 'vitest'

const PUBKEYS = {
  me: 'a'.repeat(64),
  followed: 'b'.repeat(64),
  stranger: 'c'.repeat(64),
}

function buildCurrentUser({ followListEvent }) {
  return new CurrentUser({
    userEvent: new UserEvent({
      pubkey: PUBKEYS.me,
      created_at: 1,
      kind: UserEvent.KIND,
      tags: [],
      content: '{}',
    }),
    followListEvent,
  })
}

const followListEvent = new FollowListEvent({
  pubkey: PUBKEYS.me,
  created_at: 1,
  kind: FollowListEvent.KIND,
  tags: [['p', PUBKEYS.followed, 'wss://relay.example']],
  content: '',
})

describe('CurrentUser', () => {
  describe('hasTrusted', () => {
    it('trusts the current user', () => {
      expect(buildCurrentUser({ followListEvent }).hasTrusted(PUBKEYS.me)).toBe(
        true,
      )
    })

    it('trusts followed pubkeys', () => {
      const currentUser = buildCurrentUser({ followListEvent })

      expect(currentUser.hasTrusted(PUBKEYS.followed)).toBe(true)
    })

    it("doesn't trust anyone else", () => {
      const currentUser = buildCurrentUser({ followListEvent })

      expect(currentUser.hasTrusted(PUBKEYS.stranger)).toBe(false)
    })

    it('trusts only the current user without a follow list', () => {
      const currentUser = buildCurrentUser({ followListEvent: null })

      expect(currentUser.hasTrusted(PUBKEYS.me)).toBe(true)
      expect(currentUser.hasTrusted(PUBKEYS.followed)).toBe(false)
    })
  })
})
