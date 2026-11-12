import cssNormalize from '@/components/base/css/css_normalize'
import { css, html, LitElement, type PropertyDeclarations } from 'lit'

class HHash extends LitElement {
  static GROUP_PATTERN = /.{1,8}/g

  static override properties = {
    hash: { attribute: false },
  } satisfies PropertyDeclarations

  declare hash?: string

  // split into groups of eight, so it's easier to compare by eye, without
  // spaces, so it still copies and reads aloud as one hash.
  override render() {
    const hash = this.hash ?? ''
    const groups = hash.match(HHash.GROUP_PATTERN) ?? [hash]

    return html`${groups.map((group) => html`<span>${group}</span>`)}`
  }

  static override styles = [
    cssNormalize,
    css`
      :host {
        font-family: var(--h-font-mono);
        font-size: 0.875rem;
        line-height: 1.375rem;
      }

      /* inline blocks, so the hash can wrap between groups on narrow screens. */
      span {
        display: inline-block;
        margin-right: 0.375rem;
      }
    `,
  ]
}

customElements.define('h-hash', HHash)

declare global {
  interface HTMLElementTagNameMap {
    'h-hash': HHash
  }
}

export default HHash
