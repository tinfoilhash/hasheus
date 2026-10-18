import relayPool from '@/services/relay_pool'
import UserEvent from '@/services/user_event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/relay_pool', () => ({
  default: { subscribeManyEose: vi.fn() },
  USER_RELAY_URLS: ['wss://user.example'],
}))

const PUBKEYS = { alice: 'a'.repeat(64), bob: 'b'.repeat(64) }

function buildRawUserEvent(pubkey, name) {
  return {
    id: `profile-${pubkey}`,
    pubkey,
    created_at: 1,
    kind: UserEvent.KIND,
    tags: [],
    content: JSON.stringify({ name }),
    sig: '',
  }
}

// answers each subscription with the profile of the pubkey it asks for.
function respondWithProfiles(namesByPubkey) {
  relayPool.subscribeManyEose.mockImplementation(
    (_, { authors: [pubkey] }, { onevent, onclose }) => {
      queueMicrotask(() => {
        if (namesByPubkey[pubkey]) {
          onevent(buildRawUserEvent(pubkey, namesByPubkey[pubkey]))
        }

        onclose([])
      })
    },
  )
}

// the manager is a singleton, so each test gets a fresh copy.
async function importManager() {
  vi.resetModules()

  return (await import('@/services/user_subscriber_manager')).default
}

describe('UserSubscriberManager', () => {
  beforeEach(() => {
    relayPool.subscribeManyEose.mockReset()
    respondWithProfiles({ [PUBKEYS.alice]: 'alice', [PUBKEYS.bob]: 'bob' })
  })

  describe('subscribe', () => {
    it('resolves with the profile', async () => {
      const manager = await importManager()

      const userEvent = await manager.subscribe({ pubkey: PUBKEYS.alice })

      expect(userEvent.displayName).toBe('alice')
    })

    it('subscribes to the relays once per pubkey', async () => {
      const manager = await importManager()

      await manager.subscribe({ pubkey: PUBKEYS.alice })
      await manager.subscribe({ pubkey: PUBKEYS.alice })

      expect(relayPool.subscribeManyEose).toHaveBeenCalledOnce()
    })

    it('calls onChange right away with an already loaded profile', async () => {
      const manager = await importManager()
      const onChange = vi.fn()

      await manager.subscribe({ pubkey: PUBKEYS.alice })
      await manager.subscribe({ pubkey: PUBKEYS.alice, onChange })

      expect(onChange).toHaveBeenCalledOnce()
      expect(onChange.mock.calls[0][0].displayName).toBe('alice')
    })

    it('calls onChange only for its own pubkey', async () => {
      const manager = await importManager()
      const onChange = vi.fn()

      await Promise.all([
        manager.subscribe({ pubkey: PUBKEYS.alice, onChange }),
        manager.subscribe({ pubkey: PUBKEYS.bob }),
      ])

      expect(onChange.mock.calls.map(([event]) => event.displayName)).toEqual([
        'alice',
      ])
    })

    it('stops calling onChange once the subscription resolves', async () => {
      const manager = await importManager()
      const onChange = vi.fn()

      await manager.subscribe({ pubkey: PUBKEYS.alice, onChange })
      onChange.mockClear()

      manager.dispatchEvent(
        new CustomEvent('change', {
          detail: new UserEvent(buildRawUserEvent(PUBKEYS.alice, 'renamed')),
        }),
      )

      expect(onChange).not.toHaveBeenCalled()
    })

    it('tells every listener when a profile loads', async () => {
      const manager = await importManager()
      const listener = vi.fn()

      manager.addEventListener('change', listener)
      await manager.subscribe({ pubkey: PUBKEYS.alice })

      expect(listener.mock.calls[0][0].detail.displayName).toBe('alice')
    })
  })

  describe('getOrSubscribe', () => {
    it('returns null and starts loading an unknown profile', async () => {
      const manager = await importManager()

      expect(manager.getOrSubscribe(PUBKEYS.alice)).toBeNull()
      expect(relayPool.subscribeManyEose).toHaveBeenCalledOnce()
    })

    it('returns the profile once it has loaded', async () => {
      const manager = await importManager()

      await manager.subscribe({ pubkey: PUBKEYS.alice })

      expect(manager.getOrSubscribe(PUBKEYS.alice).displayName).toBe('alice')
    })

    it('returns null without subscribing again while a profile loads', async () => {
      const manager = await importManager()

      manager.getOrSubscribe(PUBKEYS.alice)

      expect(manager.getOrSubscribe(PUBKEYS.alice)).toBeNull()
      expect(relayPool.subscribeManyEose).toHaveBeenCalledOnce()
    })
  })
})
