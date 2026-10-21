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

  static properties = {
    large: { type: Boolean },
  }

  render() {
    return html`
      <header>
        <a href="/">
          <h1 aria-label=${this.constructor.NAME}>
            ${this.constructor.HELMET.map((row) => html`<span class="row" aria-hidden="true">${this._renderRow(row)}</span>`)}
          </h1>
        </a>
      </header>
    `
  }

  _renderRow(row) {
    const { NAME } = this.constructor
    const [before, after] = row.split(NAME)
    if (after === undefined) return this._renderDigits(row)

    return html`${this._renderDigits(before)}<span class="name">${NAME}</span
      >${this._renderDigits(after)}`
  }

  _renderDigits(text) {
    return [...text].map((char) =>
      char === ' ' ? char : html`<span class="digit-${char}">${char}</span>`,
    )
  }

  static styles = [
    cssNormalize,
    css`
      :host {
        display: block;
      }

      header {
        display: flex;
        margin-bottom: 2rem;
      }

      header a {
        text-decoration: none;
      }

      /* 6px unless large, so the 15-row helmet doesn't push the page's content
         too far down. the line height and spacing scale to keep its shape. */
      header a h1 {
        margin: 0;
        font-size: 0.375rem;
        font-weight: inherit;
        line-height: 1.25;
        letter-spacing: 0.25em;
      }

      :host([large]) header a h1 {
        font-size: 1rem;
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

      @media (width >= 40rem) {
        header {
          margin-bottom: 4rem;
        }
      }
    `,
  ]
}

customElements.define('h-app-header', HAppHeader)

export default HAppHeader
