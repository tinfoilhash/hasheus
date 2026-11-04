import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/error'
import '@/components/base/spinner'
import HFile from '@/services/file'
import { css, html, LitElement, nothing, type PropertyDeclarations } from 'lit'

class HStart extends LitElement {
  static override properties = {
    _error: { state: true },
    _isDispatchingFile: { state: true },
  } satisfies PropertyDeclarations

  declare private _error: unknown
  declare private _isDispatchingFile: boolean

  constructor() {
    super()

    this._isDispatchingFile = false
  }

  override connectedCallback() {
    super.connectedCallback()

    window.addEventListener('dragenter', this.#preventDefault)
    window.addEventListener('dragover', this.#preventDefault)
    window.addEventListener('drop', this.#dispatchFileFromDrop)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()

    window.removeEventListener('dragenter', this.#preventDefault)
    window.removeEventListener('dragover', this.#preventDefault)
    window.removeEventListener('drop', this.#dispatchFileFromDrop)
  }

  #preventDefault = (event: Event) => {
    event.preventDefault()
  }

  async #dispatchFile(file: File) {
    // large files can take a while to hash, so another file dropped in the
    // meantime is ignored rather than hashed alongside it.
    if (this._isDispatchingFile) {
      return
    }

    this._isDispatchingFile = true

    try {
      this.dispatchEvent(
        new CustomEvent<HFile>('h-file', {
          detail: await HFile.build(file),
          bubbles: true,
          composed: true,
        }),
      )
    } catch (error) {
      this._error = error
    } finally {
      this._isDispatchingFile = false
    }
  }

  #dispatchFileFromDrop = (event: DragEvent) => {
    event.preventDefault()

    const file = event.dataTransfer?.files[0]

    if (file) {
      void this.#dispatchFile(file)
    }
  }

  #dispatchFileFromInput = (event: Event & { currentTarget: HTMLInputElement }) => {
    const file = event.currentTarget.files?.[0]

    if (file) {
      void this.#dispatchFile(file)
    }
  }

  override render() {
    return html`
      ${this._error ? html`<h-error .error=${this._error}></h-error>` : nothing}
      <h2>verify the integrity of a file with the largest decentralized web of trust</h2>
      <h3>
        drop a file to start,
        <form>
          <label
            >click to browse<input
              data-testid="file-input"
              type="file"
              @change=${this.#dispatchFileFromInput} /></label
          >,
        </form>
        or
        <a href="https://github.com/tinfoilhash/hasheus-cli" target="_blank">use the cli</a>
        ${this._isDispatchingFile ? html`<h-spinner></h-spinner>` : nothing}
      </h3>
    `
  }

  static override styles = [
    cssNormalize,
    css`
      :host {
        display: block;
      }

      h-error {
        margin-bottom: 2rem;
      }

      /* in a monospace font, "verify the integrity of a file" is 30ch, so it's
     the first line. the extra 1ch is slack against rounding. */
      h2 {
        max-width: 31ch;
        margin: 0;
        margin-bottom: 2rem;
        font-size: 1.75rem;
        font-weight: inherit;
        line-height: 2.5rem;
      }

      h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: inherit;
        line-height: 2rem;
        color: var(--h-color-500);
      }

      h3 form {
        display: inline-block;
      }

      h3 form label,
      h3 a {
        padding-bottom: 0.25rem;
        cursor: pointer;
        border-bottom: 2px solid var(--h-color-700);
      }

      h3 a {
        color: inherit;
        text-decoration: none;
      }

      h3 h-spinner {
        color: var(--h-color-100);
      }

      h3 form label input[type='file'] {
        display: none;
      }
    `,
  ]
}

customElements.define('h-start', HStart)

declare global {
  interface HTMLElementTagNameMap {
    'h-start': HStart
  }

  interface HTMLElementEventMap {
    'h-file': CustomEvent<HFile>
  }
}

export default HStart
