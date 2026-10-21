import { css } from 'lit'

const cssVariables = css`
  :host {
    --thv-color-900: #17110e;
    --thv-color-800: #2d2622;
    --thv-color-700: #453e37;
    --thv-color-600: #60584f;
    --thv-color-500: #7a7167;
    --thv-color-400: #978d80;
    --thv-color-300: #b4aa9b;
    --thv-color-200: #d2c8b6;
    --thv-color-100: #f1e6d2;
    --thv-color-red: #b00020;
    /* leans amber so warnings don't blend in with the logo's terracotta. */
    --thv-color-orange: #8a5300;
    --thv-color-green: #1b5e20;
  }
`

export default cssVariables
