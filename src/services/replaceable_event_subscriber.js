import relayPool, { USER_RELAY_URLS } from '@/services/relay_pool'

// subscribes to an author's latest replaceable event (like a profile or follow
// list). subclasses set `static EventClass` to the event to subscribe to.
class ReplaceableEventSubscriber {
  pubkey
  onChange = null
  event = null
  promise = null

  constructor({ pubkey, onChange = null }) {
    this.pubkey = pubkey
    this.onChange = onChange
  }

  async subscribe() {
    const { EventClass } = this.constructor

    this.promise ||= new Promise((resolve) => {
      relayPool.subscribeManyEose(
        USER_RELAY_URLS,
        {
          kinds: [EventClass.KIND],
          authors: [this.pubkey],
        },
        {
          onevent: (event) => {
            try {
              const replaceableEvent = new EventClass(event)

              if (
                !this.event ||
                replaceableEvent.createdAt > this.event.createdAt
              ) {
                this.event = replaceableEvent

                this.onChange?.(replaceableEvent)
              }
            } catch (error) {
              console.error(error)
            }
          },
          onclose: () => {
            resolve(this.event)
          },
        },
      )
    })

    return await this.promise
  }
}

export default ReplaceableEventSubscriber
