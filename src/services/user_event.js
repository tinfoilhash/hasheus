import bidiControlStripper from '@/services/bidi_control_stripper'
import NostrEvent from '@/services/nostr_event'

class UserEvent extends NostrEvent {
  static KIND = 0

  // anyone can publish a profile, so content that isn't an object (like
  // "null") is treated as an empty profile instead of breaking rendering.
  parseContent(content) {
    const parsed = JSON.parse(content)

    return parsed !== null && typeof parsed === 'object' ? parsed : {}
  }

  // a profile's fields are untrusted too, so a name that isn't a string is
  // ignored instead of breaking rendering when it's trimmed.
  get displayNameTrimmed() {
    const { display_name: displayName } = this.content

    return typeof displayName === 'string'
      ? bidiControlStripper(displayName).trim()
      : ''
  }

  get nameTrimmed() {
    const { name } = this.content

    return typeof name === 'string' ? bidiControlStripper(name).trim() : ''
  }

  get displayName() {
    return (
      this.displayNameTrimmed || this.nameTrimmed || this.pubkeyEncodedTruncated
    )
  }

  get picture() {
    return this.content.picture
  }
}

export default UserEvent
