import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { npubEncode, nsecEncode } from 'nostr-tools/nip19'
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure'

const FILES_URL = new URL('files/', import.meta.url)
const SEED_URL = new URL('seed.jsonl', import.meta.url)
// fixed times, so an event's id only changes when its scenario does.
const START_AT = Date.UTC(2025, 0, 1) / 1000
const DAY_SECONDS = 60 * 60 * 24
// a day past the last date javascript can show (100 million days after 1970),
// so both the web app & the cli show the raw timestamp.
const FAR_FUTURE_AT = (100_000_000 + 1) * DAY_SECONDS

// each key comes from the user's name, so it's the same every time. they're
// public, so they must never be used anywhere real.
function createUser(name, profile) {
  const secretKey = createHash('sha256')
    .update(`hasheus dev user: ${name}`)
    .digest()

  return { name, secretKey, pubkey: getPublicKey(secretKey), profile }
}

const dev = createUser('dev', { name: 'dev' })
const alice = createUser('alice', { name: 'alice' })
const bob = createUser('bob', { name: 'bob' })
const carol = createUser('carol', { name: 'carol' })
const mallory = createUser('mallory', {
  display_name: '\u202emallory\u001b[31m',
  name: 'mallory',
})
// no profile or follow list, for publishing as someone new.
const newcomer = createUser('newcomer')

const USERS = [dev, alice, bob, carol, mallory, newcomer]
const FOLLOWS = new Map([[dev, [alice, bob, carol]]])

const VERIFICATIONS = [
  // alice & bob agree on the url.
  { file: 'trusted.txt', user: alice, day: 1 },
  { file: 'trusted.txt', user: bob, day: 2 },
  { file: 'yours.txt', user: dev, day: 3 },
  { file: 'yours.txt', user: mallory, createdAt: FAR_FUTURE_AT },
  { file: 'untrusted.txt', user: mallory, day: 4 },
  // bob & carol outnumber alice, so their url wins.
  { file: 'disagreed.txt', user: alice, day: 5 },
  {
    file: 'disagreed.txt',
    user: bob,
    day: 6,
    url: 'https://mirror.example.com/disagreed.txt',
  },
  {
    file: 'disagreed.txt',
    user: carol,
    day: 7,
    url: 'https://mirror.example.com/disagreed.txt',
  },
  // mallory backdates a different url before alice's.
  { file: 'backdated.txt', user: alice, day: 8 },
  {
    file: 'backdated.txt',
    user: mallory,
    day: -30,
    url: 'https://evil.example.com/backdated.txt',
  },
  // escape codes are only in mallory's display name, since nostr-tools escapes
  // them in an event's content when computing its id, unlike other libraries.
  {
    file: 'hostile.txt',
    user: alice,
    day: 9,
    url: 'https://example.com/\u202eosi.exe',
    description: 'hostile\r description\u202e',
  },
  { file: 'hostile.txt', user: bob, day: 10, url: 'javascript:alert(1)' },
]

function seed() {
  const signatures = readSignatures()
  const events = [
    ...USERS.filter((user) => user.profile).map(buildProfile),
    ...[...FOLLOWS].map(([user, follows]) => buildFollowList(user, follows)),
    ...VERIFICATIONS.map(buildVerification),
  ].map((event) => ({ ...event, sig: signatures.get(event.id) ?? event.sig }))

  writeFileSync(
    SEED_URL,
    events.map((event) => JSON.stringify(event)).join('\n') + '\n',
  )
  printUsers()
}

// signing is randomized, so an unchanged event keeps its earlier signature,
// and regenerating only changes the events whose scenarios did.
function readSignatures() {
  if (!existsSync(SEED_URL)) {
    return new Map()
  }

  return new Map(
    readFileSync(SEED_URL, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .map(({ id, sig }) => [id, sig]),
  )
}

function buildProfile(user) {
  return finalizeEvent(
    {
      kind: 0,
      created_at: START_AT,
      tags: [],
      content: JSON.stringify(user.profile),
    },
    user.secretKey,
  )
}

function buildFollowList(user, follows) {
  return finalizeEvent(
    {
      kind: 3,
      created_at: START_AT,
      tags: follows.map(({ pubkey }) => ['p', pubkey]),
      content: '',
    },
    user.secretKey,
  )
}

// the same tags the publish page uses, with the hash and size of the sample.
function buildVerification({
  file,
  user,
  day,
  createdAt = START_AT + DAY_SECONDS * day,
  url = `https://example.com/${file}`,
  description = file,
}) {
  const fileURL = new URL(file, FILES_URL)
  const hash = createHash('sha256').update(readFileSync(fileURL)).digest('hex')

  return finalizeEvent(
    {
      kind: 1063,
      created_at: createdAt,
      tags: [
        ['x', hash],
        ['m', 'text/plain'],
        ['size', String(statSync(fileURL).size)],
        ['url', url],
      ],
      content: description,
    },
    user.secretKey,
  )
}

function printUsers() {
  for (const user of USERS) {
    console.log(
      `${user.name}\t${npubEncode(user.pubkey)}\t${nsecEncode(user.secretKey)}`,
    )
  }
}

seed()
