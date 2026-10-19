import { afterEach, describe, expect, it, vi } from 'vitest'

// the relay urls are read when the module loads, so each test loads it fresh.
async function importRelayPool() {
  vi.resetModules()

  return await import('@/services/relay_pool')
}

describe('relay pool', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('splits the relay urls from the environment', async () => {
    vi.stubEnv('VITE_FILE_RELAY_URLS', 'wss://file.example')
    vi.stubEnv('VITE_USER_RELAY_URLS', 'wss://a.example,wss://b.example')

    const { FILE_RELAY_URLS, USER_RELAY_URLS } = await importRelayPool()

    expect(FILE_RELAY_URLS).toEqual(['wss://file.example'])
    expect(USER_RELAY_URLS).toEqual(['wss://a.example', 'wss://b.example'])
  })

  it('has no relays when the environment sets none', async () => {
    vi.stubEnv('VITE_FILE_RELAY_URLS', undefined)
    vi.stubEnv('VITE_USER_RELAY_URLS', undefined)

    const { FILE_RELAY_URLS, USER_RELAY_URLS } = await importRelayPool()

    expect(FILE_RELAY_URLS).toEqual([])
    expect(USER_RELAY_URLS).toEqual([])
  })
})
