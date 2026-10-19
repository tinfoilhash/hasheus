import CurrentUser from '@/services/current_user'
import FileEvent from '@/services/file_event'
import FollowListEvent from '@/services/follow_list_event'
import UserEvent from '@/services/user_event'

// builds nostr events for tests. raw events are what relays send; the others
// are the app's event classes built from them. signatures aren't checked by
// these classes, so they're left empty.

const DEFAULT_PUBKEY = 'a'.repeat(64)
const DEFAULT_HASH = 'f'.repeat(64)

function buildRawEvent({
  kind,
  pubkey = DEFAULT_PUBKEY,
  createdAt = 1,
  tags = [],
  content = '',
}) {
  return {
    id: `${kind}-${pubkey}-${createdAt}`,
    pubkey,
    created_at: createdAt,
    kind,
    tags,
    content,
    sig: '',
  }
}

function buildRawUserEvent({
  pubkey,
  createdAt,
  name,
  content = JSON.stringify(name === undefined ? {} : { name }),
} = {}) {
  return buildRawEvent({ kind: UserEvent.KIND, pubkey, createdAt, content })
}

function buildUserEvent(options) {
  return new UserEvent(buildRawUserEvent(options))
}

function buildFollowListEvent({ pubkey, follows = [] } = {}) {
  return new FollowListEvent(
    buildRawEvent({
      kind: FollowListEvent.KIND,
      pubkey,
      tags: follows.map((followed) => ['p', followed]),
    }),
  )
}

function buildRawFileEvent({
  pubkey,
  createdAt,
  hash = DEFAULT_HASH,
  url,
  content = 'description',
} = {}) {
  return buildRawEvent({
    kind: FileEvent.KIND,
    pubkey,
    createdAt,
    tags: [['x', hash], ...(url === undefined ? [] : [['url', url]])],
    content,
  })
}

function buildFileEvent(options) {
  return new FileEvent(buildRawFileEvent(options))
}

function buildCurrentUser({
  pubkey = DEFAULT_PUBKEY,
  follows = [],
  hasFollowList = true,
} = {}) {
  return new CurrentUser({
    userEvent: buildUserEvent({ pubkey }),
    followListEvent: hasFollowList
      ? buildFollowListEvent({ pubkey, follows })
      : null,
  })
}

export {
  buildCurrentUser,
  buildFileEvent,
  buildFollowListEvent,
  buildRawFileEvent,
  buildRawUserEvent,
  buildUserEvent,
  DEFAULT_HASH,
  DEFAULT_PUBKEY,
}
