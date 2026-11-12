import type { Event as RawEvent } from 'nostr-tools/core'
import CurrentUser from '@/services/current_user'
import FileEvent from '@/services/file_event'
import FollowListEvent from '@/services/follow_list_event'
import UserEvent from '@/services/user_event'

// builds nostr events for tests. raw events are what relays send; the others
// are the app's event classes built from them. signatures aren't checked by
// these classes, so they're left empty.

const DEFAULT_PUBKEY = 'a'.repeat(64)
const DEFAULT_HASH = 'f'.repeat(64)

interface RawEventOptions {
  pubkey?: string
  createdAt?: number
  content?: string
}

function buildRawEvent({
  kind,
  pubkey = DEFAULT_PUBKEY,
  createdAt = 1,
  tags = [],
  content = '',
}: RawEventOptions & { kind: number; tags?: string[][] }): RawEvent {
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

type UserEventOptions = RawEventOptions & { name?: string }

function buildRawUserEvent({
  pubkey,
  createdAt,
  name,
  content = JSON.stringify(name === undefined ? {} : { name }),
}: UserEventOptions = {}) {
  return buildRawEvent({ kind: UserEvent.KIND, pubkey, createdAt, content })
}

function buildUserEvent(options?: UserEventOptions) {
  return new UserEvent(buildRawUserEvent(options))
}

function buildFollowListEvent({
  pubkey,
  createdAt,
  follows = [],
}: Omit<RawEventOptions, 'content'> & { follows?: string[] } = {}) {
  return new FollowListEvent(
    buildRawEvent({
      kind: FollowListEvent.KIND,
      pubkey,
      createdAt,
      tags: follows.map((followed) => ['p', followed]),
    }),
  )
}

type FileEventOptions = RawEventOptions & { hash?: string; url?: string }

function buildRawFileEvent({
  pubkey,
  createdAt,
  hash = DEFAULT_HASH,
  url,
  content = 'description',
}: FileEventOptions = {}) {
  return buildRawEvent({
    kind: FileEvent.KIND,
    pubkey,
    createdAt,
    tags: [['x', hash], ...(url === undefined ? [] : [['url', url]])],
    content,
  })
}

function buildFileEvent(options?: FileEventOptions) {
  return new FileEvent(buildRawFileEvent(options))
}

function buildCurrentUser({
  pubkey = DEFAULT_PUBKEY,
  follows = [],
  hasFollowList = true,
}: { pubkey?: string; follows?: string[]; hasFollowList?: boolean } = {}) {
  return new CurrentUser({
    userEvent: buildUserEvent({ pubkey }),
    followListEvent: hasFollowList ? buildFollowListEvent({ pubkey, follows }) : null,
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
