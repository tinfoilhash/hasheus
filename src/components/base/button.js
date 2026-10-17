import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/spinner'
import { css, html, LitElement, nothing } from 'lit'

class THVButton extends LitElement {
  static properties = {
    pending: { type: Boolean },
  }

  render() {
    return html`
      <slot></slot>
      ${
        this.pending
          ? html`<div class="pending"><thv-spinner></thv-spinner></div>`
          : nothing
      }
    `
  }

  static styles = [
    cssNormalize,
    css`
      :host {
        position: relative;
        display: inline-block;
      }

      ::slotted(:is(button, a)) {
        display: inline-block;
        padding: 0.75rem 2rem;
        font-size: 1.25rem !important;
        line-height: inherit !important;
        color: inherit;
        text-decoration: none;
        cursor: pointer;
        background: var(--thv-color-700);
        border: none;
      }

      :host([pending]) ::slotted(:is(button, a)) {
        color: var(--thv-color-700);
      }

      ::slotted(:is(button, a):focus) {
        outline: none;
        background: var(--thv-color-600);
      }

      ::slotted(button:disabled) {
        color: var(--thv-color-600);
        cursor: auto;
      }

      .pending {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
      }
    `,
  ]
}

customElements.define('thv-button', THVButton)

export default THVButton
