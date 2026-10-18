import currentUserConnection from '@/services/current_user_connection'
import FileEvent from '@/services/file_event'
import relayPool, { FILE_RELAY_URLS } from '@/services/relay_pool'

class FilePublisher {
  file
  description
  url

  constructor({ file, description, url }) {
    this.file = file
    this.description = description
    this.url = url
  }

  async publish() {
    const event = await window.nostr.signEvent({
      kind: FileEvent.KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['x', this.file.hash],
        // browsers report an empty type for unknown files, but nip-94
        // requires a mime type.
        ['m', this.file.type || 'application/octet-stream'],
        ['size', this.file.size.toString()],
        ['url', this.url],
      ],
      content: this.description,
    })

    // the event only needs to reach one file relay, and if none accept it, the
    // first relay's error is more useful than a generic aggregate one.
    try {
      await Promise.any(relayPool.publish(FILE_RELAY_URLS, event))
    } catch (error) {
      throw error.errors?.[0] ?? error
    }

    const fileEvent = new FileEvent(event)

    this.file.publishedFileEvent = fileEvent

    currentUserConnection.connect({ pubkey: fileEvent.pubkey })

    return fileEvent
  }
}

export default FilePublisher
