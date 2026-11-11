import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/status'
import statusTextFormatter from '@/lib/status_text_formatter'
import { css, html, LitElement, type PropertyDeclarations } from 'lit'

class HError extends LitElement {
  static override properties = {
    error: { attribute: false },
  } satisfies PropertyDeclarations

  declare error: unknown

  // an alert, so an error is announced the moment it appears.
  override connectedCallback() {
    super.connectedCallback()

    this.setAttribute('role', 'alert')
  }

  // anything can be thrown, so an error without a message is shown as is.
  get #message() {
    const { error } = this
    const hasMessage = typeof error === 'object' && error !== null && 'message' in error

    return String(hasMessage ? error.message : error)
  }

  override render() {
    return html`<h-status color="red">${statusTextFormatter(this.#message)}</h-status>`
  }

  static override styles = [
    cssNormalize,
    css`
      :host {
        display: block;
      }
    `,
  ]
}

customElements.define('h-error', HError)

declare global {
  interface HTMLElementTagNameMap {
    'h-error': HError
  }
}

export default HError
