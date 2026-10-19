import FollowListEvent from '@/services/follow_list_event'
import FollowListSubscriber from '@/services/follow_list_subscriber'
import relayPool from '@/services/relay_pool'
import UserEvent from '@/services/user_event'
import UserSubscriber from '@/services/user_subscriber'
import { buildRawUserEvent } from '@/test/event_builders'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'

vi.mock('@/services/relay_pool', () => ({
  default: { subscribeManyEose: vi.fn() },
  USER_RELAY_URLS: ['wss://user.example'],
}))

const PUBKEY = 'a'.repeat(64)

// replays raw events to the subscription, then closes it.
function respondWith(...rawEvents) {
  relayPool.subscribeManyEose.mockImplementation(
    (_, __, { onevent, onclose }) => {
      queueMicrotask(() => {
        rawEvents.forEach(onevent)
        onclose([])
      })
    },
  )
}

describe('ReplaceableEventSubscriber', () => {
  beforeEach(() => {
    relayPool.subscribeManyEose.mockReset()
  })

  it("subscribes to the subclass's event kind for the pubkey", async () => {
    respondWith()

    await new FollowListSubscriber({ pubkey: PUBKEY }).subscribe()

    expect(relayPool.subscribeManyEose).toHaveBeenCalledWith(
      ['wss://user.example'],
      { kinds: [FollowListEvent.KIND], authors: [PUBKEY] },
      expect.any(Object),
    )
  })

  it('resolves with the latest event, regardless of arrival order', async () => {
    respondWith(
      buildRawUserEvent({ createdAt: 2, content: '{"name":"new"}' }),
      buildRawUserEvent({ createdAt: 1, content: '{"name":"old"}' }),
    )

    const event = await new UserSubscriber({ pubkey: PUBKEY }).subscribe()

    expect(event).toBeInstanceOf(UserEvent)
    expect(event.displayName).toBe('new')
  })

  it('calls onChange only when a newer event arrives', async () => {
    const onChange = vi.fn()

    respondWith(
      buildRawUserEvent({ createdAt: 1, content: '{"name":"first"}' }),
      buildRawUserEvent({ createdAt: 3, content: '{"name":"newest"}' }),
      buildRawUserEvent({ createdAt: 2, content: '{"name":"older"}' }),
    )

    await new UserSubscriber({ pubkey: PUBKEY, onChange }).subscribe()

    expect(onChange.mock.calls.map(([event]) => event.displayName)).toEqual([
      'first',
      'newest',
    ])
  })

  it('resolves with null when no event exists', async () => {
    respondWith()

    expect(await new UserSubscriber({ pubkey: PUBKEY }).subscribe()).toBeNull()
  })

  it("skips an event it can't parse", async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())

    respondWith(
      buildRawUserEvent({ createdAt: 2, content: '{not json' }),
      buildRawUserEvent({ createdAt: 1, content: '{"name":"valid"}' }),
    )

    const event = await new UserSubscriber({ pubkey: PUBKEY }).subscribe()

    expect(event.displayName).toBe('valid')
    expect(consoleError).toHaveBeenCalledOnce()
  })

  it('subscribes to the relays only once', async () => {
    respondWith(buildRawUserEvent({ createdAt: 1 }))

    const subscriber = new UserSubscriber({ pubkey: PUBKEY })

    await Promise.all([subscriber.subscribe(), subscriber.subscribe()])

    expect(relayPool.subscribeManyEose).toHaveBeenCalledOnce()
  })
})
