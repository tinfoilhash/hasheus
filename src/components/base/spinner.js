import cssNormalize from '@/components/base/css/css_normalize'
import { css, html, LitElement } from 'lit'

class HSpinner extends LitElement {
  render() {
    return html`&mdash;`
  }

  static styles = [
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

export default HSpinner
