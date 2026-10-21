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
    --h-color-red: #b00020;
    /* leans amber so warnings don't blend in with the logo's terracotta. */
    --h-color-orange: #8a5300;
    --h-color-green: #1b5e20;
  }
`

export default cssVariables
