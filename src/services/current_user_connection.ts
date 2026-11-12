import type { Event as RawEvent } from 'nostr-tools/core'
import TypedEventTarget from '@/lib/typed_event_target'
import CurrentUser from '@/services/current_user'
import FollowListEvent from '@/services/follow_list_event'
import FollowListSubscriber from '@/services/follow_list_subscriber'
import UserEvent from '@/services/user_event'
import userSubscriberManager from '@/services/user_subscriber_manager'

type Status = (typeof CurrentUserConnection.STATUSES)[keyof typeof CurrentUserConnection.STATUSES]

interface ChangeDetail {
  status: Status
  currentUser: CurrentUser | null
  error: unknown
}

// what JSON.stringify makes of a CurrentUser, with its events as raw events.
interface StoredCurrentUser {
  userEvent: RawEvent
  followListEvent: RawEvent | null
  requestedAt: number
}

class CurrentUserConnection extends TypedEventTarget<{ change: CustomEvent<ChangeDetail> }> {
  static readonly STORAGE_KEY = 'currentUser'
  static readonly REFRESH_AFTER_MS = 1000 * 60 * 60

  static readonly STATUSES = {
    UNINITIALIZED: 'UNINITIALIZED',
    DISCONNECTED: 'DISCONNECTED',
    PENDING: 'PENDING',
    CONNECTED: 'CONNECTED',
    ERROR: 'ERROR',
  } as const

  status: Status = CurrentUserConnection.STATUSES.UNINITIALIZED
  currentUser: CurrentUser | null = null
  error: unknown = null

  userEvent: UserEvent | null = null
  followListEvent: FollowListEvent | null = null
  // when the follow list was last fetched, renewed only once a fetch finishes,
  // so a stored list isn't marked fresh by a profile that arrives first.
  requestedAt = 0
  connectionID = 0

  get isPending() {
    return this.status === CurrentUserConnection.STATUSES.PENDING
  }

  dispatchChange({
    status,
    currentUser = null,
    error = null,
  }: {
    status: Status
    currentUser?: CurrentUser | null
    error?: unknown
  }) {
    this.status = status
    this.currentUser = currentUser
    this.error = error

    if (!this.currentUser) {
      this.userEvent = null
      this.followListEvent = null
      this.requestedAt = 0
    }

    this.dispatchEvent(
      new CustomEvent<ChangeDetail>('change', {
        detail: {
          status,
          currentUser,
          error,
        },
      }),
    )

    return currentUser
  }

  dispatchCurrentUserIfReady() {
    if (!this.userEvent || !this.followListEvent) {
      return null
    }

    return this.dispatchCurrentUser(this.userEvent)
  }

  dispatchCurrentUser(userEvent: UserEvent) {
    const currentUser = new CurrentUser({
      userEvent,
      followListEvent: this.followListEvent,
      requestedAt: this.requestedAt,
    })

    this.saveToStorage(currentUser)

    return this.dispatchChange({
      status: CurrentUserConnection.STATUSES.CONNECTED,
      currentUser,
    })
  }

  shouldRefresh(currentUser: CurrentUser) {
    return currentUser.requestedAt <= Date.now() - CurrentUserConnection.REFRESH_AFTER_MS
  }

  loadFromStorage() {
    const serialized = window.localStorage.getItem(CurrentUserConnection.STORAGE_KEY)

    if (!serialized) {
      return null
    }

    // a stored user that can't be read (corrupted or from an older version) is
    // removed, since it would otherwise fail every connect until cleared.
    try {
      const parsed: StoredCurrentUser = JSON.parse(serialized)

      return new CurrentUser({
        ...parsed,
        userEvent: new UserEvent(parsed.userEvent),
        followListEvent: parsed.followListEvent && new FollowListEvent(parsed.followListEvent),
      })
    } catch (error) {
      console.error(error)
      this.removeFromStorage()

      return null
    }
  }

  saveToStorage(currentUser: CurrentUser) {
    return window.localStorage.setItem(
      CurrentUserConnection.STORAGE_KEY,
      JSON.stringify(currentUser),
    )
  }

  removeFromStorage() {
    return window.localStorage.removeItem(CurrentUserConnection.STORAGE_KEY)
  }

  isCurrentConnection(connectionID: number) {
    return connectionID === this.connectionID
  }

  restoreCurrentUser({ pubkey }: { pubkey: string | null }) {
    const currentUser = this.currentUser ?? this.loadFromStorage()

    if (!currentUser) {
      return null
    }

    if (pubkey && pubkey !== currentUser.pubkey) {
      return this.clearCurrentUser()
    }

    this.userEvent = currentUser.userEvent
    this.followListEvent = currentUser.followListEvent
    this.requestedAt = currentUser.requestedAt

    return this.dispatchChange({
      status: CurrentUserConnection.STATUSES.CONNECTED,
      currentUser,
    })
  }

  getNoPubkeyError({ canAskForPubkey }: { canAskForPubkey: boolean }) {
    if (!window.nostr) {
      return new Error('unable to connect without nostr browser extension')
    }

    if (!canAskForPubkey) {
      return new Error('unable to connect without pubkey')
    }

    return null
  }

  async subscribeUserEvent(pubkey: string, connectionID: number) {
    return await userSubscriberManager.subscribe({
      pubkey,
      onChange: (userEvent) => {
        if (!this.isCurrentConnection(connectionID)) {
          return
        }

        this.userEvent = userEvent
        this.dispatchCurrentUserIfReady()
      },
    })
  }

  async subscribeFollowListEvent(pubkey: string, connectionID: number) {
    return await new FollowListSubscriber({
      pubkey,
      onChange: (followListEvent) => {
        if (!this.isCurrentConnection(connectionID)) {
          return
        }

        // a relay can return an older list than the stored one, which may still
        // include a key that's since been unfollowed.
        if (!this.followListEvent || followListEvent.createdAt > this.followListEvent.createdAt) {
          this.followListEvent = followListEvent
        }

        this.dispatchCurrentUserIfReady()
      },
    }).subscribe()
  }

  // each connect gets an id, and disconnecting or connecting again changes the
  // current one, so results from an earlier connect that land late are ignored.
  async connect({
    pubkey = null,
    canAskForPubkey = false,
    ignoreNoPubkeyError = false,
  }: {
    pubkey?: string | null
    canAskForPubkey?: boolean
    ignoreNoPubkeyError?: boolean
  } = {}) {
    const connectionID = ++this.connectionID
    const requestedAt = Date.now()

    try {
      const restoredUser = this.restoreCurrentUser({ pubkey })

      if (restoredUser && !this.shouldRefresh(restoredUser)) {
        return restoredUser
      }

      pubkey = restoredUser?.pubkey ?? pubkey

      if (!pubkey) {
        const noPubkeyError = this.getNoPubkeyError({ canAskForPubkey })

        if (noPubkeyError && ignoreNoPubkeyError) {
          return this.dispatchChange({
            status: CurrentUserConnection.STATUSES.DISCONNECTED,
          })
        }

        if (noPubkeyError) {
          throw noPubkeyError
        }

        this.dispatchChange({ status: CurrentUserConnection.STATUSES.PENDING })

        // getNoPubkeyError returns an error without an extension.
        pubkey = await window.nostr!.getPublicKey()

        if (!this.isCurrentConnection(connectionID)) {
          return this.currentUser
        }
      }

      if (!restoredUser && !this.isPending) {
        this.dispatchChange({ status: CurrentUserConnection.STATUSES.PENDING })
      }

      const [, fetchedFollowListEvent] = await Promise.all([
        this.subscribeUserEvent(pubkey, connectionID),
        this.subscribeFollowListEvent(pubkey, connectionID),
      ])

      if (!this.isCurrentConnection(connectionID)) {
        return this.currentUser
      }

      if (!this.userEvent) {
        throw new Error('unable to find your profile')
      }

      // like the cli, a stored follow list is dropped when no relay returns one,
      // so withholding a newer list can't keep an unfollowed key trusted. a user
      // who hasn't followed anyone yet has no follow list either.
      if (!fetchedFollowListEvent) {
        this.followListEvent = null
      }

      this.requestedAt = requestedAt

      return this.dispatchCurrentUser(this.userEvent)
    } catch (error) {
      if (!this.isCurrentConnection(connectionID)) {
        return this.currentUser
      }

      return this.dispatchChange({
        status: CurrentUserConnection.STATUSES.ERROR,
        error,
      })
    }
  }

  clearCurrentUser() {
    this.removeFromStorage()

    return this.dispatchChange({
      status: CurrentUserConnection.STATUSES.DISCONNECTED,
    })
  }

  disconnect() {
    this.connectionID++

    return this.clearCurrentUser()
  }
}

export type { ChangeDetail }

export default new CurrentUserConnection()
