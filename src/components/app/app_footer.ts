import cssNormalize from '@/components/base/css/css_normalize'
import { css, html, LitElement } from 'lit'

class HAppFooter extends LitElement {
  override render() {
    return html`
      <footer>
        by <a href="https://tinfoilhash.com" target="_blank">tinfoil hash</a> ·
        <a href="https://github.com/tinfoilhash/hasheus" target="_blank">code</a> ·
        <a href="https://github.com/tinfoilhash/hasheus-cli" target="_blank">cli</a> ·
        <a href="https://github.com/tinfoilhash/hasheus-from-gpg" target="_blank">from gpg</a>
      </footer>
    `
  }

  static override styles = [
    cssNormalize,
    css`
      :host {
        display: block;
      }

      footer {
        padding-top: 1.5rem;
        font-family: var(--h-font-prose);
        font-size: 0.875rem;
        line-height: 1.375rem;
        color: var(--h-color-400);
        border-top: 1px solid var(--h-color-800);
      }

      a {
        color: var(--h-color-300);
        text-decoration-color: var(--h-color-600);
        text-underline-offset: 0.2em;
      }

      a:hover {
        text-decoration-color: var(--h-color-terracotta);
      }
    `,
  ]
}

customElements.define('h-app-footer', HAppFooter)

declare global {
  interface HTMLElementTagNameMap {
    'h-app-footer': HAppFooter
  }
}

export default HAppFooter
