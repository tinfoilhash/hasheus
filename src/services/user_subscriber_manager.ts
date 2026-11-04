import TypedEventTarget from '@/lib/typed_event_target'
import type UserEvent from '@/services/user_event'
import UserSubscriber from '@/services/user_subscriber'

type ChangeListener = (event: CustomEvent<UserEvent>) => void

class UserSubscriberManager extends TypedEventTarget<{ change: CustomEvent<UserEvent> }> {
  readonly subscribers = new Map<string, UserSubscriber>()

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
