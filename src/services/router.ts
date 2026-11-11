import { Router } from '@lit-labs/router'

interface NavigateOptions {
  replace?: boolean
  back?: boolean
}

class HRouter extends Router {
  // the first route is the page loading, so like back and forward, it keeps the
  // browser's own scroll position.
  #isRestoringHistory = true

  override hostConnected() {
    // added before the router's own listener, so it's marked before it goes.
    window.addEventListener('popstate', this.#markHistoryRestore)

    super.hostConnected()
  }

  override hostDisconnected() {
    super.hostDisconnected()

    window.removeEventListener('popstate', this.#markHistoryRestore)
  }

  #markHistoryRestore = () => {
    this.#isRestoringHistory = true
  }

  // a new page starts at the top, rather than wherever the last one was
  // scrolled to, like dropping a file low on the start page.
  override async goto(pathname: string) {
    const isRestoringHistory = this.#isRestoringHistory

    this.#isRestoringHistory = false
    await super.goto(pathname)

    if (!isRestoringHistory) {
      window.scrollTo(0, 0)
    }
  }

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
