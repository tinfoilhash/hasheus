import cssNormalize from '@/components/base/css/css_normalize'
import { css, html, LitElement, type PropertyDeclarations } from 'lit'

class HCommand extends LitElement {
  // placeholders, like `<file>`, are dimmed.
  static PLACEHOLDER_PATTERN = /^<[^>]+>$/

  static override properties = {
    command: { attribute: false },
  } satisfies PropertyDeclarations

  declare command?: string

  override render() {
    // each word stays whole, so a long command wraps between its arguments.
    // a flag stays with its value, like `--url <url>`.
    const words = (this.command ?? '').split(/ (?!<)/)

    return html`<code
      >${words.map(
        (word, index) =>
          html`${index ? ' ' : ''}<span class="word"
              >${word
                .split(' ')
                .map((part, partIndex) =>
                  HCommand.PLACEHOLDER_PATTERN.test(part)
                    ? html`${partIndex ? ' ' : ''}<span class="placeholder">${part}</span>`
                    : html`${partIndex ? ' ' : ''}${part}`,
                )}</span
            >`,
      )}</code
    >`
  }

  static override styles = [
    cssNormalize,
    css`
      :host {
        display: inline;
      }

      /* one click selects the whole command, ready to copy. */
      code {
        padding: 0 0.375rem;
        font-family: var(--h-font-mono);
        font-size: 0.875rem;
        color: var(--h-color-terracotta-light);
        user-select: all;
        background: var(--h-color-800);
        box-decoration-break: clone;
      }

      .word {
        white-space: nowrap;
      }

      .placeholder {
        color: var(--h-color-400);
      }
    `,
  ]
}

customElements.define('h-command', HCommand)

declare global {
  interface HTMLElementTagNameMap {
    'h-command': HCommand
  }
}

export default HCommand
