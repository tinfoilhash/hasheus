import type FollowListEvent from '@/services/follow_list_event'
import type UserEvent from '@/services/user_event'
import type userSubscriberManager from '@/services/user_subscriber_manager'
import { buildFollowListEvent, buildUserEvent } from '@/test/event_builders'
import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vite-plus/test'

interface Relays {
  userEvent: UserEvent | null
  followListEvent: FollowListEvent | null
  gate: Promise<void>
}

// what the mocked relays return, and a gate that holds them until released.
const { relays, subscribe } = vi.hoisted(() => {
  const relays: Relays = {
    userEvent: null,
    followListEvent: null,
    gate: Promise.resolve(),
  }

  const subscribe = vi.fn<typeof userSubscriberManager.subscribe>(async ({ onChange }) => {
    await relays.gate

    if (relays.userEvent) {
      onChange?.(relays.userEvent)
    }

    return relays.userEvent
  })

  return { relays, subscribe }
})

vi.mock('@/services/user_subscriber_manager', () => ({
  default: { subscribe },
}))

vi.mock('@/services/follow_list_subscriber', () => ({
  default: class {
    onChange

    constructor({ onChange }: { onChange?: (event: FollowListEvent) => void }) {
      this.onChange = onChange
    }

    async subscribe() {
      await relays.gate

      if (relays.followListEvent) {
        this.onChange?.(relays.followListEvent)
      }

      return relays.followListEvent
    }
  },
}))

const PUBKEYS = {
  me: 'a'.repeat(64),
  other: 'b'.repeat(64),
  followed: 'c'.repeat(64),
}

function createStorage() {
  const items = new Map<string, string>()

  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, String(value)),
    removeItem: (key: string) => items.delete(key),
  }
}

// the connection is a singleton, so each test gets a fresh copy.
async function importConnection() {
  vi.resetModules()

  return (await import('@/services/current_user_connection')).default
}

describe('CurrentUserConnection', () => {
  let storage: ReturnType<typeof createStorage>
  let nostr: { getPublicKey: () => Promise<string> }

  function readStoredUser() {
    return JSON.parse(storage.getItem('currentUser') ?? 'null')
  }

  beforeEach(() => {
    storage = createStorage()
    nostr = { getPublicKey: async () => PUBKEYS.me }
    relays.userEvent = buildUserEvent({ pubkey: PUBKEYS.me, name: 'me' })
    relays.followListEvent = buildFollowListEvent({
      pubkey: PUBKEYS.me,
      follows: [PUBKEYS.followed],
    })
    relays.gate = Promise.resolve()

    vi.stubGlobal('window', {
      localStorage: storage,
      nostr,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('connect', () => {
    it('connects through the extension and saves the user', async () => {
      const connection = await importConnection()

      const currentUser = await connection.connect({ canAskForPubkey: true })

      expect(connection.status).toBe('CONNECTED')
      expect(currentUser?.userEvent.displayName).toBe('me')
      expect(currentUser?.hasTrusted(PUBKEYS.followed)).toBe(true)
      expect(storage.getItem('currentUser')).not.toBeNull()
    })

    it('connects without a follow list', async () => {
      relays.followListEvent = null

      const connection = await importConnection()

      const currentUser = await connection.connect({ canAskForPubkey: true })

      expect(connection.status).toBe('CONNECTED')
      expect(currentUser?.hasTrusted(PUBKEYS.me)).toBe(true)
      expect(currentUser?.hasTrusted(PUBKEYS.followed)).toBe(false)
    })

    it('errors without a profile', async () => {
      relays.userEvent = null

      const connection = await importConnection()

      await connection.connect({ canAskForPubkey: true })

      expect(connection.status).toBe('ERROR')
      expect(connection.error).toHaveProperty('message', 'unable to find your profile')
    })

    it('errors without a nostr extension', async () => {
      window.nostr = undefined

      const connection = await importConnection()

      await connection.connect({ canAskForPubkey: true })

      expect(connection.error).toHaveProperty(
        'message',
        'unable to connect without nostr browser extension',
      )
    })

    it('stays disconnected without an error when told to ignore it', async () => {
      window.nostr = undefined

      const connection = await importConnection()

      await connection.connect({ ignoreNoPubkeyError: true })

      expect(connection.status).toBe('DISCONNECTED')
      expect(connection.error).toBeNull()
    })

    it('restores a stored user without asking the relays', async () => {
      await (await importConnection()).connect({ canAskForPubkey: true })

      const restoredConnection = await importConnection()

      subscribe.mockClear()

      const currentUser = await restoredConnection.connect()

      expect(currentUser?.userEvent.displayName).toBe('me')
      expect(subscribe).not.toHaveBeenCalled()
    })

    it("removes a stored user that can't be read", async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      onTestFinished(() => consoleError.mockRestore())
      storage.setItem('currentUser', '{not json')

      const connection = await importConnection()

      await connection.connect({ ignoreNoPubkeyError: true })

      expect(connection.status).toBe('DISCONNECTED')
      expect(connection.error).toBeNull()
      expect(storage.getItem('currentUser')).toBeNull()
    })

    it('switches users when connecting with a different pubkey', async () => {
      const connection = await importConnection()

      await connection.connect({ canAskForPubkey: true })

      relays.userEvent = buildUserEvent({
        pubkey: PUBKEYS.other,
        name: 'other',
      })
      relays.followListEvent = buildFollowListEvent({
        pubkey: PUBKEYS.other,
        follows: [PUBKEYS.followed],
      })

      const currentUser = await connection.connect({ pubkey: PUBKEYS.other })

      expect(currentUser?.pubkey).toBe(PUBKEYS.other)
    })

    it('refreshes a stored user older than an hour', async () => {
      await (await importConnection()).connect({ canAskForPubkey: true })

      storage.setItem('currentUser', JSON.stringify({ ...readStoredUser(), requestedAt: 0 }))
      relays.userEvent = buildUserEvent({
        pubkey: PUBKEYS.me,
        name: 'me, renamed',
      })

      const restoredConnection = await importConnection()
      const currentUser = await restoredConnection.connect()

      expect(currentUser?.userEvent.displayName).toBe('me, renamed')
      expect(readStoredUser().requestedAt).toBeGreaterThan(0)
    })

    it('drops a stored follow list the relays no longer return', async () => {
      await (await importConnection()).connect({ canAskForPubkey: true })

      storage.setItem('currentUser', JSON.stringify({ ...readStoredUser(), requestedAt: 0 }))
      relays.followListEvent = null

      const restoredConnection = await importConnection()
      const currentUser = await restoredConnection.connect()

      expect(currentUser?.hasTrusted(PUBKEYS.followed)).toBe(false)
      expect(readStoredUser().followListEvent).toBeNull()
      expect(readStoredUser().requestedAt).toBeGreaterThan(0)
    })

    it('keeps a stored follow list newer than the one the relays return', async () => {
      relays.followListEvent = buildFollowListEvent({
        pubkey: PUBKEYS.me,
        createdAt: 2,
        follows: [PUBKEYS.followed],
      })

      await (await importConnection()).connect({ canAskForPubkey: true })

      storage.setItem('currentUser', JSON.stringify({ ...readStoredUser(), requestedAt: 0 }))
      relays.followListEvent = buildFollowListEvent({
        pubkey: PUBKEYS.me,
        createdAt: 1,
        follows: [PUBKEYS.other],
      })

      const restoredConnection = await importConnection()
      const currentUser = await restoredConnection.connect()

      expect(currentUser?.hasTrusted(PUBKEYS.followed)).toBe(true)
      expect(currentUser?.hasTrusted(PUBKEYS.other)).toBe(false)
      expect(readStoredUser().requestedAt).toBeGreaterThan(0)
    })

    it('replaces a stored user when connecting with a different pubkey', async () => {
      await (await importConnection()).connect({ canAskForPubkey: true })

      relays.userEvent = buildUserEvent({
        pubkey: PUBKEYS.other,
        name: 'other',
      })
      relays.followListEvent = buildFollowListEvent({
        pubkey: PUBKEYS.other,
        follows: [PUBKEYS.followed],
      })

      const restoredConnection = await importConnection()
      const currentUser = await restoredConnection.connect({
        pubkey: PUBKEYS.other,
      })

      expect(currentUser?.pubkey).toBe(PUBKEYS.other)
      expect(readStoredUser().userEvent.pubkey).toBe(PUBKEYS.other)
    })
  })

  describe('disconnect', () => {
    it('clears the user and storage', async () => {
      const connection = await importConnection()

      await connection.connect({ canAskForPubkey: true })
      connection.disconnect()

      expect(connection.status).toBe('DISCONNECTED')
      expect(connection.currentUser).toBeNull()
      expect(storage.getItem('currentUser')).toBeNull()
    })

    it('ignores a refresh that finishes after disconnecting', async () => {
      const connection = await importConnection()

      const currentUser = await connection.connect({ canAskForPubkey: true })
      assert(currentUser)
      currentUser.requestedAt = 0

      let releaseRelays = () => {}
      relays.gate = new Promise((resolve) => (releaseRelays = resolve))

      const refresh = connection.connect()

      connection.disconnect()
      releaseRelays()
      await refresh

      expect(connection.status).toBe('DISCONNECTED')
      expect(connection.currentUser).toBeNull()
      expect(connection.error).toBeNull()
      expect(storage.getItem('currentUser')).toBeNull()
    })

    it('ignores a pubkey the extension returns after disconnecting', async () => {
      let returnPubkey = () => {}
      nostr.getPublicKey = () =>
        new Promise((resolve) => (returnPubkey = () => resolve(PUBKEYS.me)))

      const connection = await importConnection()

      subscribe.mockClear()

      const connecting = connection.connect({ canAskForPubkey: true })

      expect(connection.status).toBe('PENDING')

      connection.disconnect()
      returnPubkey()
      await connecting

      expect(connection.status).toBe('DISCONNECTED')
      expect(subscribe).not.toHaveBeenCalled()
    })

    it('ignores an extension error that arrives after disconnecting', async () => {
      let rejectPubkey: (reason: unknown) => void = () => {}
      nostr.getPublicKey = () => new Promise((_, reject) => (rejectPubkey = reject))

      const connection = await importConnection()
      const connecting = connection.connect({ canAskForPubkey: true })

      connection.disconnect()
      rejectPubkey(new Error('user rejected'))
      await connecting

      expect(connection.status).toBe('DISCONNECTED')
      expect(connection.error).toBeNull()
    })
  })
})
