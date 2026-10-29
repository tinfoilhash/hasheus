import bidiControlStripper from '@/lib/bidi_control_stripper'
import NostrEvent from '@/services/nostr_event'

class FileEvent extends NostrEvent {
  static KIND = 1063

  userEvent = null

  get userDisplayName() {
    return this.userEvent?.displayName ?? this.pubkeyEncodedTruncated
  }

  get descriptionTrimmed() {
    return bidiControlStripper(this.content).trim()
  }

  // anyone can publish this event, so only web urls are allowed to keep a
  // javascript: url from running script when the link is clicked. it's
  // normalized so a bidi control is percent-encoded rather than shown.
  get url() {
    const url = this.getFirstTagValue('url')

    if (!URL.canParse(url)) {
      return null
    }

    const { protocol, href } = new URL(url)

    return protocol === 'https:' || protocol === 'http:' ? href : null
  }
}

export default FileEvent
