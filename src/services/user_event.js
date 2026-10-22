import NostrEvent from '@/services/nostr_event'

// a profile's fields are untrusted too, so a name that isn't a string is
// ignored instead of breaking rendering when it's trimmed.
function trimName(name) {
  return typeof name === 'string' ? name.trim() : ''
}

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
      trimName(this.content.display_name) ||
      trimName(this.content.name) ||
      this.pubkeyEncodedTruncated
    )
  }

  get picture() {
    return this.content.picture
  }
}

export default UserEvent
