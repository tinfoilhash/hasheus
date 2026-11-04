import { SimplePool } from 'nostr-tools/pool'

const FILE_RELAY_URLS = import.meta.env.VITE_FILE_RELAY_URLS?.split(',') ?? []
const USER_RELAY_URLS = import.meta.env.VITE_USER_RELAY_URLS?.split(',') ?? []

export { FILE_RELAY_URLS, USER_RELAY_URLS }

export default new SimplePool()
