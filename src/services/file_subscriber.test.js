import FileEvent from '@/services/file_event'
import FileSubscriber from '@/services/file_subscriber'
import relayPool from '@/services/relay_pool'
import userSubscriberManager from '@/services/user_subscriber_manager'
import {
  buildRawFileEvent,
  buildUserEvent,
  DEFAULT_HASH,
} from '@/test/event_builders'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'

vi.mock('@/services/relay_pool', () => ({
  default: { subscribeManyEose: vi.fn() },
  FILE_RELAY_URLS: ['wss://file.example'],
}))

vi.mock('@/services/user_subscriber_manager', () => ({
  default: Object.assign(new EventTarget(), { getOrSubscribe: vi.fn() }),
}))

const HASH = DEFAULT_HASH
const EOSE_REASON = 'closed automatically on eose'

// replays raw events to the subscription, then closes it with the reasons.
function respondWith(rawEvents, reasons) {
  relayPool.subscribeManyEose.mockImplementation(
    (_, __, { onevent, onclose }) => {
      queueMicrotask(() => {
        rawEvents.forEach(onevent)
        onclose(reasons)
      })
    },
  )
}

describe('FileSubscriber', () => {
  beforeEach(() => {
    relayPool.subscribeManyEose.mockReset()
    userSubscriberManager.getOrSubscribe.mockReset().mockReturnValue(null)
  })

  it('subscribes to file events for the hash', async () => {
    respondWith([], [{ url: 'wss://file.example', reason: EOSE_REASON }])

    await new FileSubscriber({ hash: HASH }).subscribe()

    expect(relayPool.subscribeManyEose).toHaveBeenCalledWith(
      ['wss://file.example'],
      { kinds: [FileEvent.KIND], '#x': [HASH] },
      expect.any(Object),
    )
  })

  it('resolves with the events sorted oldest first', async () => {
    respondWith(
      [
        buildRawFileEvent({ pubkey: 'b'.repeat(64), createdAt: 2 }),
        buildRawFileEvent({ pubkey: 'a'.repeat(64), createdAt: 1 }),
      ],
      [{ url: 'wss://file.example', reason: EOSE_REASON }],
    )

    const events = await new FileSubscriber({ hash: HASH }).subscribe()

    expect(events.map((event) => event.createdAt)).toEqual([1, 2])
  })

  it("skips an event it can't read", async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())

    respondWith(
      [
        { ...buildRawFileEvent({ createdAt: 1 }), tags: null },
        buildRawFileEvent({ createdAt: 2 }),
      ],
      [{ url: 'wss://file.example', reason: EOSE_REASON }],
    )

    const events = await new FileSubscriber({ hash: HASH }).subscribe()

    expect(events.map((event) => event.createdAt)).toEqual([2])
    expect(consoleError).toHaveBeenCalledOnce()
  })

  it('resolves when any relay reached eose', async () => {
    respondWith(
      [],
      [
        { url: 'wss://down.example', reason: 'connection failed' },
        { url: 'wss://file.example', reason: EOSE_REASON },
      ],
    )

    await expect(
      new FileSubscriber({ hash: HASH }).subscribe(),
    ).resolves.toEqual([])
  })

  it('rejects when no relay reached eose', async () => {
    respondWith(
      [],
      [{ url: 'wss://file.example', reason: 'connection failed' }],
    )

    await expect(
      new FileSubscriber({ hash: HASH }).subscribe(),
    ).rejects.toThrow('unable to connect to verify server')
  })

  it('fills in profiles as they arrive', async () => {
    const pubkey = 'a'.repeat(64)
    const onChange = vi.fn()

    respondWith(
      [buildRawFileEvent({ pubkey, createdAt: 1 })],
      [{ url: 'wss://file.example', reason: EOSE_REASON }],
    )

    await new FileSubscriber({ hash: HASH, onChange }).subscribe()

    userSubscriberManager.dispatchEvent(
      new CustomEvent('change', {
        detail: buildUserEvent({ pubkey, name: 'alice' }),
      }),
    )

    expect(onChange.mock.lastCall[0][0].userDisplayName).toBe('alice')
  })

  it('stops listening for profiles once closed', async () => {
    const pubkey = 'a'.repeat(64)
    const onChange = vi.fn()

    respondWith(
      [buildRawFileEvent({ pubkey, createdAt: 1 })],
      [{ url: 'wss://file.example', reason: EOSE_REASON }],
    )

    const subscriber = new FileSubscriber({ hash: HASH, onChange })

    await subscriber.subscribe()
    subscriber.close()
    onChange.mockClear()

    userSubscriberManager.dispatchEvent(
      new CustomEvent('change', {
        detail: buildUserEvent({ pubkey, name: 'alice' }),
      }),
    )

    // checking the events, not just onChange, catches a listener left behind.
    expect(subscriber.events[0].userEvent).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })
})
