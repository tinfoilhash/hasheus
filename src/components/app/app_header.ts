import cssNormalize from '@/components/base/css/css_normalize'
import { css, html, LitElement } from 'lit'

class HAppHeader extends LitElement {
  static NAME = 'hasheus'

  static HELMET = [
    '        a        ',
    '       018       ',
    '       fe5       ',
    '    72eb8b00b    ',
    '  c72e95fd9c15c  ',
    ' 003501bf305b2fd ',
    ' 9e32hasheus23ff ',
    'ca018fe572eb8b00b',
    'c72     e     95f',
    'd9c15   c   00350',
    '1bf305b   2fd9e32',
    '23ffca0   18fe572',
    ' eb8b00   bc72e9 ',
    '  5fd9c   15c00  ',
    '    350   1bf    ',
  ]

  override render() {
    return html`
      <header>
        <a href="/">
          <h1 aria-label=${HAppHeader.NAME}>
            ${HAppHeader.HELMET.map((row) => html`<span class="row" aria-hidden="true">${this.#renderRow(row)}</span>`)}
          </h1>
        </a>
      </header>
    `
  }

  #renderRow(row: string) {
    const { NAME } = HAppHeader
    const [before = '', after] = row.split(NAME)
    if (after === undefined) return this.#renderDigits(row)

    return html`${this.#renderDigits(before)}<span class="name">${NAME}</span
      >${this.#renderDigits(after)}`
  }

  #renderDigits(text: string) {
    return text
      .split('')
      .map((char) => (char === ' ' ? char : html`<span class="digit-${char}">${char}</span>`))
  }

  static override styles = [
    cssNormalize,
    css`
      :host {
        display: block;
      }

      header {
        display: flex;
      }

      header a {
        text-decoration: none;
      }

      /* monospace wherever it's placed, so the helmet's rows line up. the line
         height and spacing scale with the size to keep its shape. */
      header a h1 {
        margin: 0;
        font-family: var(--h-font-mono);
        font-size: 0.5rem;
        font-weight: inherit;
        line-height: 1.25;
        letter-spacing: 0.25em;
      }

      .row {
        display: block;
        white-space: pre;
      }

      .name {
        color: var(--h-color-100);
      }

      /* each digit's shade comes from its value, 0 darkest to f brightest, so
         the hash shades itself. */
      .digit-0 {
        color: #b3552e;
      }

      .digit-1 {
        color: #b8572f;
      }

      .digit-2 {
        color: #bd5a31;
      }

      .digit-3 {
        color: #c35c32;
      }

      .digit-4 {
        color: #c85f33;
      }

      .digit-5 {
        color: #cc6237;
      }

      .digit-6 {
        color: #cd673c;
      }

      .digit-7 {
        color: #ce6b42;
      }

      .digit-8 {
        color: #d06f47;
      }

      .digit-9 {
        color: #d1734c;
      }

      .digit-a {
        color: #d37852;
      }

      .digit-b {
        color: #d47c57;
      }

      .digit-c {
        color: #d5805d;
      }

      .digit-d {
        color: #d78462;
      }

      .digit-e {
        color: #d88867;
      }

      .digit-f {
        color: #da8d6d;
      }

      /* full size once the page has a margin to hang it in. */
      @media (width >= 48rem) {
        header a h1 {
          font-size: 0.75rem;
        }
      }
    `,
  ]
}

customElements.define('h-app-header', HAppHeader)

declare global {
  interface HTMLElementTagNameMap {
    'h-app-header': HAppHeader
  }
}

export default HAppHeader
