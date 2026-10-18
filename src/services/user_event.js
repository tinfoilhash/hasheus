import NostrEvent from '@/services/nostr_event'

class UserEvent extends NostrEvent {
  static KIND = 0

  // anyone can publish a profile, so content that isn't an object (like
  // "null") is treated as an empty profile instead of breaking rendering.
  parseContent(content) {
    const parsed = JSON.parse(content)

    return parsed !== null && typeof parsed === 'object' ? parsed : {}
  }

  get displayName() {
    return (
      this.content.display_name ||
      this.content.name ||
      this.pubkeyEncodedTruncated
    )
  }

  get picture() {
    return this.content.picture
  }
}

export default UserEvent
