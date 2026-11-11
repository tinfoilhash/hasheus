import { css, unsafeCSS } from 'lit'
import modernNormalize from 'modern-normalize?inline'

// every shadow root includes this, so the focus ring is the same everywhere,
// in place of each browser's own.
const cssFocus = css`
  :focus-visible {
    outline: 2px solid var(--h-color-terracotta);
    outline-offset: 2px;
  }
`

export default [unsafeCSS(modernNormalize), cssFocus]
