const HNavigable = (superClass) =>
  class HNavigableElement extends superClass {
    navigate(url, { replace = false, back = false } = {}) {
      this.dispatchEvent(
        new CustomEvent('h-navigate', {
          detail: { url, replace, back },
          bubbles: true,
          composed: true,
        }),
      )
    }
  }

export default HNavigable
