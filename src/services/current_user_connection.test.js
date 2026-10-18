import FollowListEvent from '@/services/follow_list_event'
import UserEvent from '@/services/user_event'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest'

// what the mocked relays return, and a gate that holds them until released.
const relays = vi.hoisted(() => ({
  userEvent: null,
  followListEvent: null,
  gate: Promise.resolve(),
}))

vi.mock('@/services/user_subscriber_manager', () => ({
  default: {
    subscribe: vi.fn(async ({ onChange }) => {
      await relays.gate

      if (relays.userEvent) {
        onChange?.(relays.userEvent)
      }

      return relays.userEvent
    }),
  },
}))

vi.mock('@/services/follow_list_subscriber', () => ({
  default: class {
    constructor({ onChange }) {
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

function buildUserEvent(pubkey, name) {
  return new UserEvent({
    id: `profile-${pubkey}`,
    pubkey,
    created_at: 1,
    kind: UserEvent.KIND,
    tags: [],
    content: JSON.stringify({ name }),
    sig: '',
  })
}

function buildFollowListEvent(pubkey) {
  return new FollowListEvent({
    id: `follows-${pubkey}`,
    pubkey,
    created_at: 1,
    kind: FollowListEvent.KIND,
    tags: [['p', PUBKEYS.followed]],
    content: '',
    sig: '',
  })
}

function createStorage() {
  const items = new Map()

  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  }
}

// the connection is a singleton, so each test gets a fresh copy.
async function importConnection() {
  vi.resetModules()

  return (await import('@/services/current_user_connection')).default
}

describe('CurrentUserConnection', () => {
  let storage

  beforeEach(() => {
    storage = createStorage()
    relays.userEvent = buildUserEvent(PUBKEYS.me, 'me')
    relays.followListEvent = buildFollowListEvent(PUBKEYS.me)
    relays.gate = Promise.resolve()

    vi.stubGlobal('window', {
      localStorage: storage,
      nostr: { getPublicKey: async () => PUBKEYS.me },
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
      expect(currentUser.userEvent.displayName).toBe('me')
      expect(currentUser.hasTrusted(PUBKEYS.followed)).toBe(true)
      expect(storage.getItem('currentUser')).not.toBeNull()
    })

    it('connects without a follow list', async () => {
      relays.followListEvent = null

      const connection = await importConnection()

      const currentUser = await connection.connect({ canAskForPubkey: true })

      expect(connection.status).toBe('CONNECTED')
      expect(currentUser.hasTrusted(PUBKEYS.me)).toBe(true)
      expect(currentUser.hasTrusted(PUBKEYS.followed)).toBe(false)
    })

    it('errors without a profile', async () => {
      relays.userEvent = null

      const connection = await importConnection()

      await connection.connect({ canAskForPubkey: true })

      expect(connection.status).toBe('ERROR')
      expect(connection.error.message).toBe('unable to find your profile')
    })

    it('errors without a nostr extension', async () => {
      window.nostr = undefined

      const connection = await importConnection()

      await connection.connect({ canAskForPubkey: true })

      expect(connection.error.message).toBe(
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
      const userSubscriberManager = (
        await import('@/services/user_subscriber_manager')
      ).default

      userSubscriberManager.subscribe.mockClear()

      const currentUser = await restoredConnection.connect()

      expect(currentUser.userEvent.displayName).toBe('me')
      expect(userSubscriberManager.subscribe).not.toHaveBeenCalled()
    })

    it("removes a stored user that can't be read", async () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
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

      relays.userEvent = buildUserEvent(PUBKEYS.other, 'other')
      relays.followListEvent = buildFollowListEvent(PUBKEYS.other)

      const currentUser = await connection.connect({ pubkey: PUBKEYS.other })

      expect(currentUser.pubkey).toBe(PUBKEYS.other)
    })

    it('refreshes a stored user older than an hour', async () => {
      await (await importConnection()).connect({ canAskForPubkey: true })

      const stored = JSON.parse(storage.getItem('currentUser'))
      storage.setItem(
        'currentUser',
        JSON.stringify({ ...stored, requestedAt: 0 }),
      )
      relays.userEvent = buildUserEvent(PUBKEYS.me, 'me, renamed')

      const restoredConnection = await importConnection()
      const currentUser = await restoredConnection.connect()

      expect(currentUser.userEvent.displayName).toBe('me, renamed')
      expect(
        JSON.parse(storage.getItem('currentUser')).requestedAt,
      ).toBeGreaterThan(0)
    })

    it('replaces a stored user when connecting with a different pubkey', async () => {
      await (await importConnection()).connect({ canAskForPubkey: true })

      relays.userEvent = buildUserEvent(PUBKEYS.other, 'other')
      relays.followListEvent = buildFollowListEvent(PUBKEYS.other)

      const restoredConnection = await importConnection()
      const currentUser = await restoredConnection.connect({
        pubkey: PUBKEYS.other,
      })

      expect(currentUser.pubkey).toBe(PUBKEYS.other)
      expect(JSON.parse(storage.getItem('currentUser')).userEvent.pubkey).toBe(
        PUBKEYS.other,
      )
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

      await connection.connect({ canAskForPubkey: true })
      connection.currentUser.requestedAt = 0

      let releaseRelays
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
  })
})
