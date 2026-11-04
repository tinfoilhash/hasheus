import type FollowListEvent from '@/services/follow_list_event'
import type UserEvent from '@/services/user_event'

class CurrentUser {
  readonly userEvent: UserEvent
  readonly followListEvent: FollowListEvent | null
  requestedAt: number

  constructor({
    userEvent,
    followListEvent,
    requestedAt = Date.now(),
  }: {
    userEvent: UserEvent
    followListEvent: FollowListEvent | null
    requestedAt?: number
  }) {
    this.userEvent = userEvent
    this.followListEvent = followListEvent
    this.requestedAt = requestedAt
  }

  get pubkey() {
    return this.userEvent.pubkey
  }

  hasTrusted(pubkey: string) {
    return this.pubkey === pubkey || Boolean(this.followListEvent?.includes(pubkey))
  }
}

export default CurrentUser
