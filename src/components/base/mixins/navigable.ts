import type { NavigateOptions } from '@/services/router'

interface NavigateDetail extends NavigateOptions {
  url: string
}

// typescript requires a mixin's constructor to take `any[]`.
// oxlint-disable-next-line typescript/no-explicit-any
type Constructor<T> = new (...args: any[]) => T

const HNavigable = <T extends Constructor<HTMLElement>>(superClass: T) =>
  class HNavigableElement extends superClass {
    navigate(url: string, { replace = false, back = false }: NavigateOptions = {}) {
      this.dispatchEvent(
        new CustomEvent<NavigateDetail>('h-navigate', {
          detail: { url, replace, back },
          bubbles: true,
          composed: true,
        }),
      )
    }
  }

declare global {
  interface HTMLElementEventMap {
    'h-navigate': CustomEvent<NavigateDetail>
  }
}

export default HNavigable
