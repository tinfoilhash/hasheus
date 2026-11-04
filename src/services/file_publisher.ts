import type HFile from '@/services/file'
import FileEvent from '@/services/file_event'
import relayPool, { FILE_RELAY_URLS } from '@/services/relay_pool'

class FilePublisher {
  readonly file: HFile
  readonly description: string
  readonly url: string
  readonly pubkey: string

  constructor({
    file,
    description,
    url,
    pubkey,
  }: {
    file: HFile
    description: string
    url: string
    pubkey: string
  }) {
    this.file = file
    this.description = description
    this.url = url
    this.pubkey = pubkey
  }

  async publish() {
    if (!window.nostr) {
      throw new Error('unable to publish without nostr browser extension')
    }

    const event = await window.nostr.signEvent({
      kind: FileEvent.KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['x', this.file.hash],
        ['m', this.file.type],
        ['size', this.file.size.toString()],
        ['url', this.url],
      ],
      content: this.description,
    })

    // the extension signs with whichever account is active, which may not be
    // the connected one shown as the verifier.
    if (event.pubkey !== this.pubkey) {
      throw new Error(
        'your browser extension signed with a different account than the one connected',
      )
    }

    // the event only needs to reach one file relay, and if none accept it, the
    // first relay's error is more useful than a generic aggregate one.
    try {
      await Promise.any(relayPool.publish(FILE_RELAY_URLS, event))
    } catch (error) {
      throw error instanceof AggregateError ? (error.errors[0] ?? error) : error
    }

    const fileEvent = new FileEvent(event)

    this.file.publishedFileEvent = fileEvent

    return fileEvent
  }
}

export default FilePublisher
