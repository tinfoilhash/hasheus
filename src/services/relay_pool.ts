import { SimplePool } from 'nostr-tools/pool'

export default new SimplePool()

export const FILE_RELAY_URLS = import.meta.env.VITE_FILE_RELAY_URLS?.split(',') ?? []
export const USER_RELAY_URLS = import.meta.env.VITE_USER_RELAY_URLS?.split(',') ?? []
