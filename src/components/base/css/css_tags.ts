import { css } from 'lit'

// a glyph as well as a color, so the tags don't depend on color alone.
// unknown is a question, not a warning: the signer isn't bad, just unknown.
// they're sized like an inline command, so the two read as one kind of thing.
const cssTags = css`
  .trusted,
  .unknown {
    padding: 0 0.375rem;
    font-family: var(--h-font-mono);
    font-size: 0.875rem;
    font-weight: 700;
    /* set, so a tag is the same height inline or as a flex item. */
    line-height: 1rem;
    color: var(--h-color-900);
    white-space: nowrap;
  }

  .trusted {
    background: var(--h-color-lime);
  }

  .trusted::before {
    margin-right: 0.375rem;
    content: '✓' / '';
  }

  .unknown {
    background: var(--h-color-yellow);
  }

  .unknown::before {
    margin-right: 0.375rem;
    content: '?' / '';
  }
`

export default cssTags
