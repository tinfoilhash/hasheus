import { css } from 'lit'

// the layout every page shares: a headline beside the logo, text at a
// readable measure, and fields as rows. tablets and wider hang the logo and
// each label in a margin, so the columns line up from page to page.
const cssPage = css`
  :host {
    display: block;
    font-family: var(--h-font-prose);
    font-size: 1rem;
    line-height: 1.625rem;
    color: var(--h-color-200);
  }

  .head {
    padding-block: 0 2.5rem;
  }

  .head h-app-header {
    margin-bottom: 2rem;
  }

  h2 {
    margin: 0;
    font-family: var(--h-font-mono);
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 2rem;
    color: var(--h-color-100);
    letter-spacing: -0.02em;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }

  .body {
    max-width: 40rem;
  }

  p,
  ol,
  ul,
  dl {
    margin: 0;
  }

  .body > * + * {
    margin-top: 1rem;
  }

  /* scoped to text, so a link styled as a button keeps its own look. */
  :is(p, li, dd) a {
    color: var(--h-color-100);
    text-decoration-color: var(--h-color-600);
    text-underline-offset: 0.2em;
  }

  :is(p, li, dd) a:hover {
    text-decoration-color: var(--h-color-terracotta);
  }

  .field {
    padding-block: 1rem;
    border-top: 1px solid var(--h-color-800);
  }

  dt {
    margin-bottom: 0.5rem;
    font-family: var(--h-font-mono);
    font-size: 0.875rem;
    line-height: 1.375rem;
    color: var(--h-color-400);
  }

  dd {
    min-width: 0;
    margin: 0;
    color: var(--h-color-100);
    overflow-wrap: anywhere;
  }

  @media (width >= 40rem) {
    h2 {
      font-size: 2.5rem;
      line-height: 3rem;
    }
  }

  @media (width >= 48rem) {
    .margined {
      display: grid;
      grid-template-columns: 11rem minmax(0, 1fr);
      column-gap: 2.5rem;
    }

    .head {
      padding-block: 2rem 3rem;
    }

    .head h-app-header,
    dt {
      margin: 0;
    }

    dt {
      padding-top: 0.125rem;
    }
  }
`

export default cssPage
