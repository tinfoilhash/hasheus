import { Router } from '@lit-labs/router'

class THVRouter extends Router {
  navigate(path, { replace = false, back = false } = {}) {
    if (back && this._isPreviousEntry(path)) {
      window.history.back()
      return
    }

    if (replace) {
      window.history.replaceState({}, '', path)
    } else {
      window.history.pushState({}, '', path)
    }

    this.goto(path)
  }

  // Only an entry in this document counts, so going back never leaves the app.
  // Without the Navigation API (older browsers), this falls back to navigating.
  _isPreviousEntry(path) {
    const { navigation } = window

    if (!navigation?.currentEntry) {
      return false
    }

    const previousEntry =
      navigation.entries()[navigation.currentEntry.index - 1]

    return (
      Boolean(previousEntry?.sameDocument) &&
      new URL(previousEntry.url).pathname === path
    )
  }
}

export default THVRouter
