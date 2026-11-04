import { Router } from '@lit-labs/router'

interface NavigateOptions {
  replace?: boolean
  back?: boolean
}

class HRouter extends Router {
  navigate(path: string, { replace = false, back = false }: NavigateOptions = {}) {
    if (back && this.#isPreviousEntry(path)) {
      window.history.back()
      return
    }

    if (replace) {
      window.history.replaceState({}, '', path)
    } else {
      window.history.pushState({}, '', path)
    }

    void this.goto(path)
  }

  // only an entry in this document counts, so going back never leaves the app.
  // without the navigation api (older browsers), this falls back to navigating.
  #isPreviousEntry(path: string) {
    const { navigation } = window

    if (!navigation?.currentEntry) {
      return false
    }

    const previousEntry = navigation.entries()[navigation.currentEntry.index - 1]

    if (!previousEntry?.sameDocument || !previousEntry.url) {
      return false
    }

    return new URL(previousEntry.url).pathname === path
  }
}

export type { NavigateOptions }

export default HRouter
