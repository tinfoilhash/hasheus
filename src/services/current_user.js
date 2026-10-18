class CurrentUser {
  userEvent
  followListEvent
  requestedAt

  constructor({ userEvent, followListEvent, requestedAt = Date.now() }) {
    this.userEvent = userEvent
    this.followListEvent = followListEvent
    this.requestedAt = requestedAt
  }

  get pubkey() {
    return this.userEvent.pubkey
  }

  hasTrusted(pubkey) {
    return (
      this.pubkey === pubkey || Boolean(this.followListEvent?.includes(pubkey))
    )
  }
}

export default CurrentUser
