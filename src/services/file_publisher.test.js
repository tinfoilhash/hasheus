import currentUserConnection from '@/services/current_user_connection'
import FileEvent from '@/services/file_event'
import FilePublisher from '@/services/file_publisher'
import relayPool from '@/services/relay_pool'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/relay_pool', () => ({
  default: { publish: vi.fn() },
  FILE_RELAY_URLS: ['wss://file-a.example', 'wss://file-b.example'],
}))

vi.mock('@/services/current_user_connection', () => ({
  default: { connect: vi.fn() },
}))

const PUBKEY = 'a'.repeat(64)
const HASH = 'f'.repeat(64)

function buildFile({ type = 'text/plain' } = {}) {
  return { hash: HASH, type, size: 1234, publishedFileEvent: null }
}

function buildPublisher(file) {
  return new FilePublisher({
    file,
    description: 'my file',
    url: 'https://example.com/file.txt',
  })
}

describe('FilePublisher', () => {
  beforeEach(() => {
    relayPool.publish.mockReset().mockReturnValue([Promise.resolve('ok')])
    currentUserConnection.connect.mockReset()

    vi.stubGlobal('window', {
      nostr: {
        signEvent: vi.fn(async (template) => ({
          ...template,
          id: '1'.repeat(64),
          pubkey: PUBKEY,
          sig: '2'.repeat(128),
        })),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('signs a file event describing the file', async () => {
    await buildPublisher(buildFile()).publish()

    expect(window.nostr.signEvent).toHaveBeenCalledWith({
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

  it('falls back to a generic mime type when the browser reports none', async () => {
    await buildPublisher(buildFile({ type: '' })).publish()

    const [{ tags }] = window.nostr.signEvent.mock.calls[0]

    expect(tags).toContainEqual(['m', 'application/octet-stream'])
  })

  it('publishes to the file relays, marks the file published, and connects', async () => {
    const file = buildFile()

    const fileEvent = await buildPublisher(file).publish()

    expect(relayPool.publish).toHaveBeenCalledWith(
      ['wss://file-a.example', 'wss://file-b.example'],
      expect.objectContaining({ pubkey: PUBKEY }),
    )
    expect(fileEvent).toBeInstanceOf(FileEvent)
    expect(file.publishedFileEvent).toBe(fileEvent)
    expect(currentUserConnection.connect).toHaveBeenCalledWith({
      pubkey: PUBKEY,
    })
  })

  it('succeeds when any relay accepts the event', async () => {
    relayPool.publish.mockReturnValue([
      Promise.reject(new Error('connection failed')),
      Promise.resolve('ok'),
    ])

    const file = buildFile()

    await buildPublisher(file).publish()

    expect(file.publishedFileEvent).not.toBeNull()
  })

  it("rethrows the first relay's error when no relay accepts the event", async () => {
    relayPool.publish.mockReturnValue([
      Promise.reject(new Error('connection failed')),
      Promise.reject(new Error('blocked: rate limited')),
    ])

    const file = buildFile()

    await expect(buildPublisher(file).publish()).rejects.toThrow(
      'connection failed',
    )
    expect(file.publishedFileEvent).toBeNull()
    expect(currentUserConnection.connect).not.toHaveBeenCalled()
  })

  it('rethrows an error thrown while publishing', async () => {
    relayPool.publish.mockImplementation(() => {
      throw new Error('Invalid URL: wss://')
    })

    await expect(buildPublisher(buildFile()).publish()).rejects.toThrow(
      'Invalid URL: wss://',
    )
  })
})
