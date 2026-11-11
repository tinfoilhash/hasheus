import cssNormalize from '@/components/base/css/css_normalize'
import { css, html, LitElement, type PropertyDeclarations } from 'lit'

class HStatus extends LitElement {
  static override properties = {
    color: { type: String },
  } satisfies PropertyDeclarations

  // no color is neutral, for news that's neither good nor bad.
  declare color?: 'green' | 'yellow' | 'red'

  override render() {
    return html`<slot></slot>`
  }

  static override styles = [
    cssNormalize,
    css`
      :host {
        display: block;
        padding: 0.75rem 1rem;
        color: var(--h-color-200);
        border: 1px solid var(--h-color-600);
      }

      :host([color='green']) {
        color: var(--h-color-lime);
        background: color-mix(in srgb, var(--h-color-lime) 10%, transparent);
        border-color: var(--h-color-lime);
      }

      :host([color='yellow']) {
        color: var(--h-color-yellow);
        background: color-mix(in srgb, var(--h-color-yellow) 10%, transparent);
        border-color: var(--h-color-yellow);
      }

      :host([color='red']) {
        color: var(--h-color-red);
        background: color-mix(in srgb, var(--h-color-red) 10%, transparent);
        border-color: var(--h-color-red);
      }

      ::slotted(a) {
        color: inherit;
        text-underline-offset: 0.2em;
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
