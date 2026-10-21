import cssNormalize from '@/components/base/css/css_normalize'
import { css, html, LitElement } from 'lit'

class HStatus extends LitElement {
  static properties = {
    color: { type: String },
  }

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

export default HStatus
