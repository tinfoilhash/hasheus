import FileEvent from '@/services/file_event'
import relayPool, { FILE_RELAY_URLS } from '@/services/relay_pool'
import type UserEvent from '@/services/user_event'
import userSubscriberManager from '@/services/user_subscriber_manager'

type OnChange = (events: FileEvent[]) => void

class FileSubscriber {
  hash: string
  onChange: OnChange | null = null
  events: FileEvent[] = []

  constructor({ hash, onChange = null }: { hash: string; onChange?: OnChange | null }) {
    this.hash = hash
    this.onChange = onChange
  }

  setUserEventFromManager = ({ detail: userEvent }: CustomEvent<UserEvent>) => {
    this.events = this.events.map((fileEvent) => {
      if (fileEvent.pubkey === userEvent.pubkey) {
        fileEvent.userEvent = userEvent
      }

      return fileEvent
    })

    this.onChange?.(this.events)
  }

  // the relay subscription closes itself on eose, so only the profile listener
  // and change callback need to be stopped.
  close() {
    userSubscriberManager.removeEventListener('change', this.setUserEventFromManager)

    this.onChange = null
  }

  async subscribe() {
    userSubscriberManager.addEventListener('change', this.setUserEventFromManager)

    return await new Promise<FileEvent[]>((resolve, reject) => {
      relayPool.subscribeManyEose(
        FILE_RELAY_URLS,
        {
          kinds: [FileEvent.KIND],
          '#x': [this.hash],
        },
        {
          onevent: (event) => {
            try {
              const fileEvent = new FileEvent(event)

              fileEvent.userEvent = userSubscriberManager.getOrSubscribe(fileEvent.pubkey)

              this.events = [...this.events, fileEvent].sort((a, b) => a.createdAt - b.createdAt)

              this.onChange?.(this.events)
            } catch (error) {
              console.error(error)
            }
          },
          onclose: (reasons) => {
            // the pool is shared with user relays, so check this subscription's
            // close reasons instead of the pool's connection status.
            const hasReachedEose = reasons.some(
              ({ reason }) => reason === 'closed automatically on eose',
            )

            if (hasReachedEose) {
              resolve(this.events)
            } else {
              reject(new Error('unable to connect to hasheus server'))
            }
          },
        },
      )
    })
  }
}

export default FileSubscriber
