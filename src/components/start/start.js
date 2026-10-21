import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/error'
import '@/components/base/spinner'
import THVFile from '@/services/file'
import { css, html, LitElement, nothing } from 'lit'

class THVStart extends LitElement {
  static properties = {
    _error: { state: true },
    _isDispatchingFile: { state: true },
  }

  constructor() {
    super()

    this._preventDefault = this._preventDefault.bind(this)
    this._dispatchFileFromDrop = this._dispatchFileFromDrop.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()

    window.addEventListener('dragenter', this._preventDefault)
    window.addEventListener('dragover', this._preventDefault)
    window.addEventListener('drop', this._dispatchFileFromDrop)
  }

  disconnectedCallback() {
    super.disconnectedCallback()

    window.removeEventListener('dragenter', this._preventDefault)
    window.removeEventListener('dragover', this._preventDefault)
    window.removeEventListener('drop', this._dispatchFileFromDrop)
  }

  _preventDefault(event) {
    event.preventDefault()
  }

  async _dispatchFile(file) {
    // large files can take a while to hash, so another file dropped in the
    // meantime is ignored rather than hashed alongside it.
    if (this._isDispatchingFile) {
      return
    }

    this._isDispatchingFile = true

    try {
      this.dispatchEvent(
        new CustomEvent('thv-file', {
          detail: await THVFile.build(file),
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

  _dispatchFileFromDrop(event) {
    event.preventDefault()

    if (event.dataTransfer.files.length) {
      this._dispatchFile(event.dataTransfer.files[0])
    }
  }

  _dispatchFileFromInput(event) {
    if (event.target.files.length) {
      this._dispatchFile(event.target.files[0])
    }
  }

  render() {
    return html`
      ${
        this._error
          ? html`<thv-error .error=${this._error}></thv-error>`
          : nothing
      }
      <h2>
        verify the integrity of a file with the largest decentralized web of
        trust
      </h2>
      <h3>
        drop a file to start or
        <form>
          <label
            >click to browse<input
              data-testid="file-input"
              type="file"
              @change=${this._dispatchFileFromInput}
          /></label>
        </form>
        ${this._isDispatchingFile ? html`<thv-spinner></thv-spinner>` : nothing}
      </h3>
    `
  }

  static styles = [
    cssNormalize,
    css`
      :host {
        display: block;
      }

      thv-error {
        margin-bottom: 2rem;
      }

      /* In a monospace font, 30ch fits exactly "verify the integrity of a file"
         on the first line. */
      h2 {
        max-width: 30ch;
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
        color: var(--thv-color-500);
      }

      h3 form {
        display: inline-block;
      }

      h3 form label {
        padding-bottom: 0.25rem;
        cursor: pointer;
        border-bottom: 2px solid var(--thv-color-700);
      }

      h3 thv-spinner {
        color: var(--thv-color-100);
      }

      h3 form label input[type='file'] {
        display: none;
      }
    `,
  ]
}

customElements.define('thv-start', THVStart)

export default THVStart
