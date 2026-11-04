import type { WindowNostr } from 'nostr-tools/nip07'

declare global {
  interface Window {
    // set by a nostr browser extension, when one is installed.
    nostr?: WindowNostr
  }

  interface ImportMetaEnv {
    readonly VITE_FILE_RELAY_URLS?: string
    readonly VITE_USER_RELAY_URLS?: string
  }
}
