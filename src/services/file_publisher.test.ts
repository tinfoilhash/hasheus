import type { EventTemplate } from 'nostr-tools/core'
import HFile from '@/services/file'
import FileEvent from '@/services/file_event'
import FilePublisher from '@/services/file_publisher'
import type relayPool from '@/services/relay_pool'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vite-plus/test'

const publish = vi.hoisted(() => vi.fn<typeof relayPool.publish>())

vi.mock('@/services/relay_pool', () => ({
  default: { publish },
  FILE_RELAY_URLS: ['wss://file-a.example', 'wss://file-b.example'],
}))

const PUBKEY = 'a'.repeat(64)
const HASH = 'f'.repeat(64)

function signAs(pubkey: string) {
  return async (template: EventTemplate) => ({
    ...template,
    id: '1'.repeat(64),
    pubkey,
    sig: '2'.repeat(128),
  })
}

function buildFile({ type = 'text/plain' } = {}) {
  return new HFile({ file: new File([new Uint8Array(1234)], 'file.txt', { type }), hash: HASH })
}

function buildPublisher(file: HFile) {
  return new FilePublisher({
    file,
    description: 'my file',
    url: 'https://example.com/file.txt',
    pubkey: PUBKEY,
  })
}

describe('FilePublisher', () => {
  let signEvent: Mock<ReturnType<typeof signAs>>

  beforeEach(() => {
    publish.mockReset().mockReturnValue([Promise.resolve('ok')])
    signEvent = vi.fn(signAs(PUBKEY))

    vi.stubGlobal('window', { nostr: { signEvent } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('signs a file event describing the file', async () => {
    await buildPublisher(buildFile()).publish()

    expect(signEvent).toHaveBeenCalledWith({
      kind: FileEvent.KIND,
      created_at: expect.any(Number),
      tags: [
        ['x', HASH],
        ['m', 'text/plain'],
        ['size', '1234'],
        ['url', 'https://example.com/file.txt'],
      ],
      content: 'my file',
    })
  })

  it("publishes a guessed mime type when the browser doesn't know it", async () => {
    const file = new HFile({ file: new File([], 'app.dmg'), hash: HASH })

    await buildPublisher(file).publish()

    expect(signEvent.mock.calls[0]?.[0].tags).toContainEqual(['m', 'application/x-apple-diskimage'])
  })

  it('publishes to the file relays and marks the file published', async () => {
    const file = buildFile()

    const fileEvent = await buildPublisher(file).publish()

    expect(publish).toHaveBeenCalledWith(
      ['wss://file-a.example', 'wss://file-b.example'],
      expect.objectContaining({ pubkey: PUBKEY }),
    )
    expect(fileEvent).toBeInstanceOf(FileEvent)
    expect(file.publishedFileEvent).toBe(fileEvent)
  })

  it('throws without publishing when the extension signs with another account', async () => {
    signEvent.mockImplementation(signAs('b'.repeat(64)))

    const file = buildFile()

    await expect(buildPublisher(file).publish()).rejects.toThrow(
      'your browser extension signed with a different account than the one connected',
    )
    expect(publish).not.toHaveBeenCalled()
    expect(file.publishedFileEvent).toBeNull()
  })

  it('succeeds when any relay accepts the event', async () => {
    publish.mockReturnValue([Promise.reject(new Error('connection failed')), Promise.resolve('ok')])

    const file = buildFile()

    await buildPublisher(file).publish()

    expect(file.publishedFileEvent).not.toBeNull()
  })

  it("rethrows the first relay's error when no relay accepts the event", async () => {
    publish.mockReturnValue([
      Promise.reject(new Error('connection failed')),
      Promise.reject(new Error('blocked: rate limited')),
    ])

    const file = buildFile()

    await expect(buildPublisher(file).publish()).rejects.toThrow('connection failed')
    expect(file.publishedFileEvent).toBeNull()
  })

  it('rethrows an error thrown while publishing', async () => {
    publish.mockImplementation(() => {
      throw new Error('Invalid URL: wss://')
    })

    await expect(buildPublisher(buildFile()).publish()).rejects.toThrow('Invalid URL: wss://')
  })
})
