import FileEvent from '@/services/file_event'
import relayPool, { FILE_RELAY_URLS } from '@/services/relay_pool'
import userSubscriberManager from '@/services/user_subscriber_manager'

class FileSubscriber {
  hash
  onChange = null
  events = []
  userSubscriberManager = this.connectUserSubscriberManager()

  constructor({ hash, onChange = null }) {
    this.hash = hash
    this.onChange = onChange
  }

  connectUserSubscriberManager() {
    userSubscriberManager.addEventListener(
      'change',
      ({ detail: userEvent }) => {
        this.events = this.events.map((fileEvent) => {
          if (fileEvent.pubkey === userEvent.pubkey) {
            fileEvent.userEvent = userEvent
          }

          return fileEvent
        })

        this.onChange?.(this.events)
      },
    )

    return userSubscriberManager
  }

  async subscribe() {
    return await new Promise((resolve, reject) => {
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

              fileEvent.userEvent = this.userSubscriberManager.getOrSubscribe(
                fileEvent.pubkey,
              )

              this.events = [...this.events, fileEvent].sort(
                (a, b) => a.createdAt - b.createdAt,
              )

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
              reject(new Error('unable to connect to verify server'))
            }
          },
        },
      )
    })
  }
}

export default FileSubscriber
