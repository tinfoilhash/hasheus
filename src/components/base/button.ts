import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/spinner'
import { css, html, LitElement, nothing, type PropertyDeclarations } from 'lit'

class HButton extends LitElement {
  static override properties = {
    pending: { type: Boolean },
    secondary: { type: Boolean, reflect: true },
  } satisfies PropertyDeclarations

  declare pending?: boolean
  // outlined instead of filled, for the quieter of two actions.
  declare secondary?: boolean

  override render() {
    return html`
      <slot></slot>
      ${this.pending ? html`<div class="pending"><h-spinner></h-spinner></div>` : nothing}
    `
  }

  // a page's own normalize styles beat ::slotted, so the type is marked
  // important to keep every button looking the same.
  static override styles = [
    cssNormalize,
    css`
      :host {
        position: relative;
        display: inline-block;
        max-width: 100%;
      }

      /* a long label, like a long profile name, truncates instead of widening
         the page. its accessible name stays whole. */
      ::slotted(:is(button, a)) {
        display: inline-block;
        max-width: 100%;
        padding: 0.75rem 1.25rem;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: var(--h-font-mono) !important;
        font-size: 1rem !important;
        font-weight: 700;
        line-height: 1.5rem !important;
        color: var(--h-color-900);
        white-space: nowrap;
        text-decoration: none;
        cursor: pointer;
        background: var(--h-color-terracotta);
        border: 1px solid var(--h-color-terracotta);
      }

      ::slotted(:is(button:enabled, a):is(:hover, :focus-visible)) {
        background: var(--h-color-100);
        border-color: var(--h-color-100);
      }

      :host([secondary]) ::slotted(:is(button, a)) {
        font-weight: 400;
        color: var(--h-color-200);
        background: none;
        border-color: var(--h-color-500);
      }

      :host([secondary]) ::slotted(:is(button:enabled, a):is(:hover, :focus-visible)) {
        color: var(--h-color-900);
        background: var(--h-color-100);
        border-color: var(--h-color-100);
      }

      /* disabled and pending come last, so neither a hover nor the secondary
         look can show through them. */
      :host ::slotted(button:disabled) {
        color: var(--h-color-500);
        cursor: auto;
        background: none;
        border-color: var(--h-color-700);
      }

      :host([pending]) ::slotted(:is(button, a)) {
        color: transparent;
      }

      .pending {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--h-font-mono);
        color: var(--h-color-300);
      }
    `,
  ]
}

customElements.define('h-button', HButton)

declare global {
  interface HTMLElementTagNameMap {
    'h-button': HButton
  }
}

export default HButton
