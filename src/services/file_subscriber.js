import FileEvent from '@/services/file_event'
import relayPool, { FILE_RELAY_URLS } from '@/services/relay_pool'
import userSubscriberManager from '@/services/user_subscriber_manager'

class FileSubscriber {
  hash
  onChange = null
  events = []

  constructor({ hash, onChange = null }) {
    this.hash = hash
    this.onChange = onChange

    this.setUserEventFromManager = this.setUserEventFromManager.bind(this)
  }

  setUserEventFromManager({ detail: userEvent }) {
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
    userSubscriberManager.removeEventListener(
      'change',
      this.setUserEventFromManager,
    )

    this.onChange = null
  }

  async subscribe() {
    userSubscriberManager.addEventListener(
      'change',
      this.setUserEventFromManager,
    )

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

              fileEvent.userEvent = userSubscriberManager.getOrSubscribe(
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
          onclose: async () => {
            try {
              if (relayPool.listConnectionStatus().size === 0) {
                reject(new Error('unable to connect to verify server'))
              } else {
                resolve(this.events)
              }
            } catch (error) {
              console.error(error)
            }
          },
        },
      )
    })
  }
}

export default FileSubscriber
