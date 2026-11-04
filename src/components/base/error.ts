import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/status'
import { css, html, LitElement, type PropertyDeclarations } from 'lit'

class HError extends LitElement {
  static properties = {
    error: { attribute: false },
  } satisfies PropertyDeclarations

  declare error: unknown

  // anything can be thrown, so an error without a message is shown as is.
  get #message() {
    const { error } = this
    const hasMessage = typeof error === 'object' && error !== null && 'message' in error

    return String(hasMessage ? error.message : error)
  }

  render() {
    return html`
      <h-status color="red">
        <strong>an error occurred!</strong>
        ${this.#message.toLowerCase()}
      </h-status>
    `
  }

  static styles = [
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
