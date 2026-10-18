import CurrentUser from '@/services/current_user'
import FollowListEvent from '@/services/follow_list_event'
import FollowListSubscriber from '@/services/follow_list_subscriber'
import UserEvent from '@/services/user_event'
import userSubscriberManager from '@/services/user_subscriber_manager'

class CurrentUserConnection extends EventTarget {
  static STORAGE_KEY = 'currentUser'
  static REFRESH_AFTER_MS = 1000 * 60 * 60

  static STATUSES = {
    UNINITIALIZED: 'UNINITIALIZED',
    DISCONNECTED: 'DISCONNECTED',
    PENDING: 'PENDING',
    CONNECTED: 'CONNECTED',
    ERROR: 'ERROR',
  }

  status = this.constructor.STATUSES.UNINITIALIZED
  currentUser = null
  error = null

  userEvent = null
  followListEvent = null
  connectionID = 0

  get isPending() {
    return this.status === this.constructor.STATUSES.PENDING
  }

  dispatchChange({ status, currentUser = null, error = null }) {
    this.status = status
    this.currentUser = currentUser
    this.error = error

    if (!this.currentUser) {
      this.userEvent = null
      this.followListEvent = null
    }

    this.dispatchEvent(
      new CustomEvent('change', {
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

    return this.dispatchCurrentUser()
  }

  dispatchCurrentUser() {
    const currentUser = new CurrentUser({
      userEvent: this.userEvent,
      followListEvent: this.followListEvent,
    })

    this.saveToStorage(currentUser)

    return this.dispatchChange({
      status: this.constructor.STATUSES.CONNECTED,
      currentUser,
    })
  }

  shouldRefresh(currentUser) {
    return (
      currentUser.requestedAt <= Date.now() - this.constructor.REFRESH_AFTER_MS
    )
  }

  loadFromStorage() {
    const serialized = window.localStorage.getItem(this.constructor.STORAGE_KEY)

    if (!serialized) {
      return null
    }

    // a stored user that can't be read (corrupted or from an older version) is
    // removed, since it would otherwise fail every connect until cleared.
    try {
      const parsed = JSON.parse(serialized)

      return new CurrentUser({
        ...parsed,
        userEvent: new UserEvent(parsed.userEvent),
        followListEvent:
          parsed.followListEvent && new FollowListEvent(parsed.followListEvent),
      })
    } catch (error) {
      console.error(error)
      this.removeFromStorage()

      return null
    }
  }

  saveToStorage(currentUser) {
    return window.localStorage.setItem(
      this.constructor.STORAGE_KEY,
      JSON.stringify(currentUser),
    )
  }

  removeFromStorage() {
    return window.localStorage.removeItem(this.constructor.STORAGE_KEY)
  }

  isCurrentConnection(connectionID) {
    return connectionID === this.connectionID
  }

  restoreCurrentUser({ pubkey }) {
    const currentUser = this.currentUser ?? this.loadFromStorage()

    if (!currentUser) {
      return null
    }

    if (pubkey && pubkey !== currentUser.pubkey) {
      return this.clearCurrentUser()
    }

    this.userEvent = currentUser.userEvent
    this.followListEvent = currentUser.followListEvent

    return this.dispatchChange({
      status: this.constructor.STATUSES.CONNECTED,
      currentUser,
    })
  }

  getNoPubkeyError({ canAskForPubkey }) {
    if (!window.nostr) {
      return new Error('unable to connect without nostr browser extension')
    }

    if (!canAskForPubkey) {
      return new Error('unable to connect without pubkey')
    }

    return null
  }

  async subscribeUserEvent(pubkey, connectionID) {
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

  async subscribeFollowListEvent(pubkey, connectionID) {
    return await new FollowListSubscriber({
      pubkey,
      onChange: (followListEvent) => {
        if (!this.isCurrentConnection(connectionID)) {
          return
        }

        this.followListEvent = followListEvent
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
  } = {}) {
    const connectionID = ++this.connectionID

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
            status: this.constructor.STATUSES.DISCONNECTED,
          })
        }

        if (noPubkeyError) {
          throw noPubkeyError
        }

        this.dispatchChange({ status: this.constructor.STATUSES.PENDING })

        pubkey = await window.nostr.getPublicKey()

        if (!this.isCurrentConnection(connectionID)) {
          return this.currentUser
        }
      }

      if (!restoredUser && !this.isPending) {
        this.dispatchChange({ status: this.constructor.STATUSES.PENDING })
      }

      await Promise.all([
        this.subscribeUserEvent(pubkey, connectionID),
        this.subscribeFollowListEvent(pubkey, connectionID),
      ])

      if (!this.isCurrentConnection(connectionID)) {
        return this.currentUser
      }

      if (!this.userEvent) {
        throw new Error('unable to find your profile')
      }

      // a user who hasn't followed anyone yet has no follow list.
      if (!this.followListEvent) {
        return this.dispatchCurrentUser()
      }

      return this.currentUser
    } catch (error) {
      if (!this.isCurrentConnection(connectionID)) {
        return this.currentUser
      }

      return this.dispatchChange({
        status: this.constructor.STATUSES.ERROR,
        error,
      })
    }
  }

  clearCurrentUser() {
    this.removeFromStorage()

    return this.dispatchChange({
      status: this.constructor.STATUSES.DISCONNECTED,
    })
  }

  disconnect() {
    this.connectionID++

    return this.clearCurrentUser()
  }
}

export default new CurrentUserConnection()
