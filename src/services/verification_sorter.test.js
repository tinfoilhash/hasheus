import CurrentUser from '@/services/current_user'
import FileEvent from '@/services/file_event'
import FollowListEvent from '@/services/follow_list_event'
import UserEvent from '@/services/user_event'
import verificationSorter from '@/services/verification_sorter'
import { describe, expect, it } from 'vitest'

const PUBKEYS = {
  me: 'a'.repeat(64),
  trustedA: 'b'.repeat(64),
  trustedB: 'c'.repeat(64),
  trustedC: 'd'.repeat(64),
  stranger: 'e'.repeat(64),
}

function buildFileEvent({ pubkey, createdAt, url, content = 'description' }) {
  return new FileEvent({
    id: `${pubkey}-${createdAt}`,
    pubkey,
    created_at: createdAt,
    kind: FileEvent.KIND,
    tags: [['x', 'f'.repeat(64)], ...(url ? [['url', url]] : [])],
    content,
    sig: '',
  })
}

function buildCurrentUser({ follows = [] } = {}) {
  return new CurrentUser({
    userEvent: new UserEvent({
      pubkey: PUBKEYS.me,
      created_at: 1,
      kind: UserEvent.KIND,
      tags: [],
      content: '{}',
    }),
    followListEvent: new FollowListEvent({
      pubkey: PUBKEYS.me,
      created_at: 1,
      kind: FollowListEvent.KIND,
      tags: follows.map((pubkey) => ['p', pubkey]),
      content: '',
    }),
  })
}

describe('verificationSorter', () => {
  it('returns no source when there are no events', () => {
    const { trustedEvents, untrustedEvents, source } = verificationSorter({
      events: [],
    })

    expect(trustedEvents).toEqual([])
    expect(untrustedEvents).toEqual([])
    expect(source).toEqual({
      event: undefined,
      isConfirmed: false,
      agreementCount: 0,
    })
  })

  it('keeps only the first event per pubkey', () => {
    const first = buildFileEvent({ pubkey: PUBKEYS.stranger, createdAt: 1 })
    const second = buildFileEvent({ pubkey: PUBKEYS.stranger, createdAt: 2 })

    const { untrustedEvents } = verificationSorter({ events: [first, second] })

    expect(untrustedEvents).toEqual([first])
  })

  it('treats everyone as untrusted without a current user', () => {
    const events = [
      buildFileEvent({ pubkey: PUBKEYS.trustedA, createdAt: 1 }),
      buildFileEvent({ pubkey: PUBKEYS.stranger, createdAt: 2 }),
    ]

    const { trustedEvents, untrustedEvents } = verificationSorter({ events })

    expect(trustedEvents).toEqual([])
    expect(untrustedEvents).toEqual(events)
  })

  it('splits events by whether the current user trusts their author', () => {
    const trusted = buildFileEvent({ pubkey: PUBKEYS.trustedA, createdAt: 1 })
    const own = buildFileEvent({ pubkey: PUBKEYS.me, createdAt: 2 })
    const untrusted = buildFileEvent({ pubkey: PUBKEYS.stranger, createdAt: 3 })

    const { trustedEvents, untrustedEvents } = verificationSorter({
      events: [trusted, own, untrusted],
      currentUser: buildCurrentUser({ follows: [PUBKEYS.trustedA] }),
    })

    expect(trustedEvents).toEqual([trusted, own])
    expect(untrustedEvents).toEqual([untrusted])
  })

  it('falls back to the earliest event, unconfirmed, without trusted verifiers', () => {
    const backdated = buildFileEvent({
      pubkey: PUBKEYS.stranger,
      createdAt: 1,
      url: 'https://evil.example/file',
    })
    const later = buildFileEvent({
      pubkey: PUBKEYS.trustedA,
      createdAt: 2,
      url: 'https://good.example/file',
    })

    const { source } = verificationSorter({ events: [backdated, later] })

    expect(source).toEqual({
      event: backdated,
      isConfirmed: false,
      agreementCount: 0,
    })
  })

  it('ignores a backdated untrusted event when a trusted verifier exists', () => {
    const backdated = buildFileEvent({
      pubkey: PUBKEYS.stranger,
      createdAt: 1,
      url: 'https://evil.example/file',
    })
    const trusted = buildFileEvent({
      pubkey: PUBKEYS.trustedA,
      createdAt: 2,
      url: 'https://good.example/file',
    })

    const { source } = verificationSorter({
      events: [backdated, trusted],
      currentUser: buildCurrentUser({ follows: [PUBKEYS.trustedA] }),
    })

    expect(source).toEqual({
      event: trusted,
      isConfirmed: true,
      agreementCount: 1,
    })
  })

  it('picks the url most trusted verifiers agree on', () => {
    const mirror = buildFileEvent({
      pubkey: PUBKEYS.trustedA,
      createdAt: 1,
      url: 'https://mirror.example/file',
    })
    const officialB = buildFileEvent({
      pubkey: PUBKEYS.trustedB,
      createdAt: 2,
      url: 'https://official.example/file',
    })
    const officialC = buildFileEvent({
      pubkey: PUBKEYS.trustedC,
      createdAt: 3,
      // a differently cased host is the same url, so it joins the same group.
      url: 'https://OFFICIAL.example/file',
    })

    const { source } = verificationSorter({
      events: [mirror, officialB, officialC],
      currentUser: buildCurrentUser({
        follows: [PUBKEYS.trustedA, PUBKEYS.trustedB, PUBKEYS.trustedC],
      }),
    })

    expect(source).toEqual({
      event: officialB,
      isConfirmed: true,
      agreementCount: 2,
    })
  })

  it('breaks ties in agreement by the earliest verifier', () => {
    const earlier = buildFileEvent({
      pubkey: PUBKEYS.trustedA,
      createdAt: 1,
      url: 'https://a.example/file',
    })
    const later = buildFileEvent({
      pubkey: PUBKEYS.trustedB,
      createdAt: 2,
      url: 'https://b.example/file',
    })

    const { source } = verificationSorter({
      events: [earlier, later],
      currentUser: buildCurrentUser({
        follows: [PUBKEYS.trustedA, PUBKEYS.trustedB],
      }),
    })

    expect(source.event).toBe(earlier)
  })

  it("doesn't let trusted events without a url outvote one with a url", () => {
    const withoutURL = [PUBKEYS.trustedA, PUBKEYS.trustedB].map(
      (pubkey, index) => buildFileEvent({ pubkey, createdAt: index + 1 }),
    )
    const withURL = buildFileEvent({
      pubkey: PUBKEYS.trustedC,
      createdAt: 3,
      url: 'https://real.example/file',
    })

    const { source } = verificationSorter({
      events: [...withoutURL, withURL],
      currentUser: buildCurrentUser({
        follows: [PUBKEYS.trustedA, PUBKEYS.trustedB, PUBKEYS.trustedC],
      }),
    })

    expect(source).toEqual({
      event: withURL,
      isConfirmed: true,
      agreementCount: 1,
    })
  })

  it('falls back to the earliest trusted event when none have a url', () => {
    const earliest = buildFileEvent({ pubkey: PUBKEYS.trustedA, createdAt: 1 })
    const later = buildFileEvent({ pubkey: PUBKEYS.trustedB, createdAt: 2 })

    const { source } = verificationSorter({
      events: [earliest, later],
      currentUser: buildCurrentUser({
        follows: [PUBKEYS.trustedA, PUBKEYS.trustedB],
      }),
    })

    expect(source).toEqual({
      event: earliest,
      isConfirmed: true,
      agreementCount: 0,
    })
  })
})
