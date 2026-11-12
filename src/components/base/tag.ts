import cssNormalize from '@/components/base/css/css_normalize'
import { css, html, LitElement, type PropertyDeclarations } from 'lit'

// a glyph as well as a color, so a tag doesn't depend on color alone. unknown
// is a question, not a warning: the signer isn't bad, just unknown.
class HTag extends LitElement {
  static override properties = {
    kind: { type: String },
  } satisfies PropertyDeclarations

  declare kind: 'trusted' | 'unknown'

  override render() {
    return html`<slot></slot>`
  }

  // sized like an inline command, so the two read as one kind of thing.
  static override styles = [
    cssNormalize,
    css`
      :host {
        padding: 0 0.375rem;
        font-family: var(--h-font-mono);
        font-size: 0.875rem;
        font-weight: 700;
        /* set, so a tag is the same height inline or as a flex item. */
        line-height: 1rem;
        color: var(--h-color-900);
        white-space: nowrap;
      }

      :host::before {
        margin-right: 0.375rem;
      }

      :host([kind='trusted']) {
        background: var(--h-color-lime);
      }

      :host([kind='trusted'])::before {
        content: '✓' / '';
      }

      :host([kind='unknown']) {
        background: var(--h-color-yellow);
      }

      :host([kind='unknown'])::before {
        content: '?' / '';
      }
    `,
  ]
}

customElements.define('h-tag', HTag)

declare global {
  interface HTMLElementTagNameMap {
    'h-tag': HTag
  }
}

export default HTag
