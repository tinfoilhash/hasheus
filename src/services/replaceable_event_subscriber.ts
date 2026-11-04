import type { Event as RawEvent } from 'nostr-tools/core'
import type NostrEvent from '@/services/nostr_event'
import relayPool, { USER_RELAY_URLS } from '@/services/relay_pool'

interface ReplaceableEventClass<TEvent> {
  KIND: number
  new (event: RawEvent): TEvent
}

// subscribes to an author's latest replaceable event (like a profile or follow
// list). subclasses set `EventClass` to the event to subscribe to.
abstract class ReplaceableEventSubscriber<TEvent extends NostrEvent<unknown>> {
  abstract readonly EventClass: ReplaceableEventClass<TEvent>

  pubkey: string
  onChange: ((event: TEvent) => void) | null = null
  event: TEvent | null = null
  promise: Promise<TEvent | null> | null = null

  constructor({
    pubkey,
    onChange = null,
  }: {
    pubkey: string
    onChange?: ((event: TEvent) => void) | null
  }) {
    this.pubkey = pubkey
    this.onChange = onChange
  }

  async subscribe() {
    const { EventClass } = this

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

              if (!this.event || replaceableEvent.createdAt > this.event.createdAt) {
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
