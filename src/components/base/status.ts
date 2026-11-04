import cssNormalize from '@/components/base/css/css_normalize'
import { css, html, LitElement, type PropertyDeclarations } from 'lit'

class HStatus extends LitElement {
  static properties = {
    color: { type: String },
  } satisfies PropertyDeclarations

  declare color?: string

  render() {
    return html`<slot></slot>`
  }

  static styles = [
    cssNormalize,
    css`
      :host {
        display: block;
        padding: 0.75rem;
        font-size: 1.25rem;
      }

      :host([color='red']) {
        background: var(--h-color-red);
      }

      :host([color='orange']) {
        background: var(--h-color-orange);
      }

      :host([color='green']) {
        background: var(--h-color-green);
      }

      ::slotted(a) {
        color: inherit;
        text-decoration: none;
        border-bottom: 2px solid var(--h-color-100);
      }

      ::slotted(strong) {
        font-weight: 600;
      }
    `,
  ]
}

customElements.define('h-status', HStatus)

declare global {
  interface HTMLElementTagNameMap {
    'h-status': HStatus
  }
}

export default HStatus
