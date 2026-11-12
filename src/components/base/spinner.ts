import cssNormalize from '@/components/base/css/css_normalize'
import { css, html, LitElement } from 'lit'

class HSpinner extends LitElement {
  // a dash turning in place says nothing to a screen reader, so it's hidden.
  override connectedCallback() {
    super.connectedCallback()

    this.setAttribute('aria-hidden', 'true')
  }

  override render() {
    return html`&mdash;`
  }

  static override styles = [
    cssNormalize,
    css`
      :host {
        display: inline-block;
        animation: spinner 1s steps(4) infinite;
      }

      @keyframes spinner {
        0% {
          transform: rotate(0deg);
        }

        100% {
          transform: rotate(180deg);
        }
      }
    `,
  ]
}

customElements.define('h-spinner', HSpinner)

declare global {
  interface HTMLElementTagNameMap {
    'h-spinner': HSpinner
  }
}

export default HSpinner
