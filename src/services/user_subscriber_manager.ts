import type UserEvent from '@/services/user_event'
import UserSubscriber from '@/services/user_subscriber'

type ChangeListener = (event: CustomEvent<UserEvent>) => void

// adds a typed `change` event to EventTarget's listeners, the way the dom types
// do for elements. the base class implements them, so nothing goes uninitialized.
// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
interface UserSubscriberManager {
  addEventListener(
    type: 'change',
    listener: ChangeListener,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(...args: Parameters<EventTarget['addEventListener']>): void
  removeEventListener(
    type: 'change',
    listener: ChangeListener,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(...args: Parameters<EventTarget['removeEventListener']>): void
}

class UserSubscriberManager extends EventTarget {
  subscribers = new Map<string, UserSubscriber>()

  has(pubkey: string) {
    return this.subscribers.has(pubkey)
  }

  get(pubkey: string) {
    return this.subscribers.get(pubkey)
  }

  getEvent(pubkey: string) {
    return this.get(pubkey)?.event ?? null
  }

  async subscribe({
    pubkey,
    onChange = null,
  }: {
    pubkey: string
    onChange?: ((userEvent: UserEvent) => void) | null
  }) {
    const listener: ChangeListener | null = onChange
      ? ({ detail: userEvent }) => {
          if (pubkey === userEvent.pubkey) {
            onChange(userEvent)
          }
        }
      : null

    if (listener) {
      this.addEventListener('change', listener)
    }

    try {
      const existingSubscriber = this.get(pubkey)

      if (existingSubscriber) {
        if (existingSubscriber.event) {
          onChange?.(existingSubscriber.event)
        }

        return await existingSubscriber.subscribe()
      }

      const subscriber = new UserSubscriber({
        pubkey,
        onChange: (userEvent) => {
          this.dispatchEvent(new CustomEvent('change', { detail: userEvent }))
        },
      })

      this.subscribers.set(pubkey, subscriber)

      return await subscriber.subscribe()
    } finally {
      if (listener) {
        this.removeEventListener('change', listener)
      }
    }
  }

  getOrSubscribe(pubkey: string) {
    if (this.has(pubkey)) {
      return this.getEvent(pubkey)
    }

    this.subscribe({ pubkey }).catch(() => {
      // ignore to allow this to be called synchronously.
    })

    return null
  }
}

export default new UserSubscriberManager()
