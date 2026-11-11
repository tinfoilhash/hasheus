import { css } from 'lit'

const cssVariables = css`
  :host {
    --h-color-900: #17110e;
    --h-color-800: #2d2622;
    --h-color-700: #453e37;
    --h-color-600: #60584f;
    --h-color-500: #7a7167;
    --h-color-400: #978d80;
    --h-color-300: #b4aa9b;
    --h-color-200: #d2c8b6;
    --h-color-100: #f1e6d2;
    /* bright enough to read at a glance as text on the dark background, for
       the tags and statuses that are the whole point of a result. */
    --h-color-lime: #8fc46a;
    --h-color-yellow: #e6b84a;
    --h-color-red: #e8553f;
    /* the logo's terracotta, for the few things that should catch the eye. */
    --h-color-terracotta: #d06f47;
    /* readable as small text on the 800 background, where terracotta isn't. */
    --h-color-terracotta-light: #da7e58;
    --h-font-mono:
      ui-monospace, 'Cascadia Code', 'Source Code Pro', menlo, consolas, 'DejaVu Sans Mono',
      monospace;
    /* system fonts only, like the monospace, for long passages of reading. */
    --h-font-prose: system-ui, -apple-system, 'Segoe UI', roboto, 'Helvetica Neue', sans-serif;
    /* every page's 11rem margin, 2.5rem gap, and 40rem column of text, so
       the dividers end where the content does. */
    --h-page-width: 53.5rem;
  }
`

export default cssVariables
