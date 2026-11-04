import NostrEvent from '@/services/nostr_event'

class FollowListEvent extends NostrEvent {
  static readonly KIND = 3

  readonly pubkeys = this.mapPubkeys()

  mapPubkeys() {
    const followTags = this.tags.get('p')

    if (!followTags) {
      return []
    }

    return followTags.flatMap(([pubkey]) => pubkey ?? [])
  }

  includes(pubkey: string) {
    return this.pubkeys.includes(pubkey)
  }
}

export default FollowListEvent
