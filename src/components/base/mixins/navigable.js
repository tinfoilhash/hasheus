const THVNavigable = (superClass) =>
  class THVNavigableElement extends superClass {
    navigate(url, { replace = false, back = false } = {}) {
      this.dispatchEvent(
        new CustomEvent('thv-navigate', {
          detail: { url, replace, back },
          bubbles: true,
          composed: true,
        }),
      )
    }
  }

export default THVNavigable
