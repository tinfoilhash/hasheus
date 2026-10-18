import UserSubscriber from '@/services/user_subscriber'

class UserSubscriberManager extends EventTarget {
  subscribers = new Map()

  has(pubkey) {
    return this.subscribers.has(pubkey)
  }

  get(pubkey) {
    return this.subscribers.get(pubkey)
  }

  getEvent(pubkey) {
    return this.get(pubkey)?.event
  }

  async subscribe({ pubkey, onChange = null }) {
    const listener = onChange
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
      if (this.has(pubkey)) {
        const subscriber = this.get(pubkey)

        if (subscriber.event) {
          onChange?.(subscriber.event)
        }

        return await subscriber.subscribe()
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

  getOrSubscribe(pubkey) {
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
