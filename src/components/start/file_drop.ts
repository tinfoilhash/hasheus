import '@/components/base/status'
import cssNormalize from '@/components/base/css/css_normalize'
import bidiControlStripper from '@/lib/bidi_control_stripper'
import statusTextFormatter from '@/lib/status_text_formatter'
import HFile from '@/services/file'
import { css, html, LitElement, nothing, type PropertyDeclarations } from 'lit'

// takes a file chosen here or dropped anywhere on the page, hashes it, and
// sends it on as an h-file event.
class HFileDrop extends LitElement {
  static FOLDER_ERROR_MESSAGE = "that's a folder; choose a single file instead"

  static override properties = {
    _errorMessage: { state: true },
    _hashingFile: { state: true },
    _isDraggingFile: { state: true },
  } satisfies PropertyDeclarations

  declare private _errorMessage: string | null
  declare private _hashingFile: File | null
  declare private _isDraggingFile: boolean

  // drag events fire for every element crossed, so entries and exits are
  // counted to know when the file has left the window.
  #dragDepth = 0

  constructor() {
    super()

    this._errorMessage = null
    this._hashingFile = null
    this._isDraggingFile = false
  }

  override connectedCallback() {
    super.connectedCallback()

    window.addEventListener('dragenter', this.#showDropOverlay)
    window.addEventListener('dragleave', this.#hideDropOverlay)
    window.addEventListener('dragover', this.#preventDefault)
    window.addEventListener('drop', this.#dispatchFileFromDrop)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()

    window.removeEventListener('dragenter', this.#showDropOverlay)
    window.removeEventListener('dragleave', this.#hideDropOverlay)
    window.removeEventListener('dragover', this.#preventDefault)
    window.removeEventListener('drop', this.#dispatchFileFromDrop)
  }

  #preventDefault = (event: Event) => {
    event.preventDefault()
  }

  #showDropOverlay = (event: DragEvent) => {
    event.preventDefault()

    if (!event.dataTransfer?.types.includes('Files')) {
      return
    }

    this.#dragDepth++
    this._isDraggingFile = true
  }

  #hideDropOverlay = () => {
    this.#dragDepth = Math.max(0, this.#dragDepth - 1)
    this._isDraggingFile = this.#dragDepth > 0
  }

  async #dispatchFile(file: File) {
    // large files can take a while to hash, so another file dropped in the
    // meantime is ignored rather than hashed alongside it.
    if (this._hashingFile) {
      return
    }

    this._hashingFile = file
    this._errorMessage = null

    try {
      this.dispatchEvent(
        new CustomEvent<HFile>('h-file', {
          detail: await HFile.build(file),
          bubbles: true,
          composed: true,
        }),
      )
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)

      await this.#showError(`couldn't hash that file: ${statusTextFormatter(message)}`)
    } finally {
      this._hashingFile = null
    }
  }

  async #showError(message: string) {
    this._errorMessage = message

    // a file can be dropped anywhere on the page, so bring the error into view
    // wherever it was dropped.
    await this.updateComplete
    this.renderRoot.querySelector('.alert h-status')?.scrollIntoView({ block: 'center' })
  }

  #dispatchFileFromDrop = (event: DragEvent) => {
    event.preventDefault()

    this.#dragDepth = 0
    this._isDraggingFile = false

    // a dropped folder shows up as a file that can't be read, so it's caught
    // here with a clearer message.
    if (event.dataTransfer?.items[0]?.webkitGetAsEntry()?.isDirectory) {
      void this.#showError(HFileDrop.FOLDER_ERROR_MESSAGE)

      return
    }

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

  get #hashingFileName() {
    return this._hashingFile ? bidiControlStripper(this._hashingFile.name) : ''
  }

  override render() {
    return html`
      ${this.#renderOverlay()}
      <p class="visually-hidden" role="status">
        ${this._hashingFile ? `hashing ${this.#hashingFileName}…` : ''}
      </p>
      <form class="drop">
        <label
          >choose a file<input
            data-testid="file-input"
            type="file"
            @change=${this.#dispatchFileFromInput}
        /></label>
        <span class="drop-hint">or drop one anywhere</span>
      </form>
      <div class="alert" role="alert">
        ${this._errorMessage ? html`<h-status color="red">${this._errorMessage}</h-status>` : nothing}
      </div>
    `
  }

  // covers the page while a file is dragged over it, and while one hashes, so
  // the progress shows wherever on the page the file was dropped.
  #renderOverlay() {
    if (this._hashingFile) {
      return html`<div class="overlay" aria-hidden="true">
        <p>
          hashing <span class="file-name">${this.#hashingFileName}</span
          ><span class="dots">...</span>
        </p>
      </div>`
    }

    if (this._isDraggingFile) {
      return html`<div class="overlay dragging" aria-hidden="true">drop to verify</div>`
    }

    return nothing
  }

  static override styles = [
    cssNormalize,
    css`
      :host {
        display: block;
      }

      p {
        margin: 0;
      }

      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
      }

      .overlay {
        position: fixed;
        inset: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        font-family: var(--h-font-mono);
        font-size: 1.5rem;
        line-height: 2.25rem;
        color: var(--h-color-300);
        text-align: center;
        overflow-wrap: anywhere;
        background: var(--h-color-900);
      }

      .overlay .file-name {
        color: var(--h-color-100);
      }

      /* the dots tick in one at a time, like a command-line tool at work.
         they're clipped rather than added, so the centered text holds still. */
      .dots {
        display: inline-block;
        animation: dots 1.2s steps(4, jump-none) infinite;
      }

      @keyframes dots {
        from {
          clip-path: inset(0 100% 0 0);
        }

        to {
          clip-path: inset(0);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .dots {
          animation: none;
        }
      }

      /* dashed like a drop target, only while there's something to drop. */
      .overlay.dragging {
        color: var(--h-color-terracotta);
        outline: 2px dashed var(--h-color-terracotta);
        outline-offset: -1rem;
      }

      .drop {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
      }

      /* sized like every other button, since it's styled as one. */
      .drop label {
        flex: 1;
        padding: 0.75rem 1.25rem;
        font-family: var(--h-font-mono);
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.5rem;
        color: var(--h-color-900);
        text-align: center;
        cursor: pointer;
        background: var(--h-color-terracotta);
        border: 1px solid var(--h-color-terracotta);
      }

      .drop label:hover,
      .drop label:focus-within {
        background: var(--h-color-100);
        border-color: var(--h-color-100);
      }

      /* the input inside is the one focused, but it's hidden, so the label shows the ring. */
      .drop label:has(:focus-visible) {
        outline: 2px solid var(--h-color-terracotta);
        outline-offset: 2px;
      }

      /* hidden from sight, but not from the keyboard, so the label can still be
         focused and opened with a key press. */
      .drop input[type='file'] {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
      }

      /* most phones can't drop a file, so the hint waits for wider screens. */
      .drop-hint {
        display: none;
        font-size: 0.875rem;
        line-height: 1.375rem;
        color: var(--h-color-400);
      }

      /* the alert region is always there for screen readers, so the error
         inside it brings the space, not the region. */
      .alert h-status {
        margin-top: 1rem;
      }

      /* a box to drop into, once there's a hint to drop. */
      @media (width >= 40rem) {
        .overlay {
          font-size: 2rem;
          line-height: 3rem;
        }

        .drop {
          padding: 1rem;
          border: 1px solid var(--h-color-600);
        }

        .drop label {
          flex: none;
        }

        .drop-hint {
          display: inline;
        }
      }
    `,
  ]
}

customElements.define('h-file-drop', HFileDrop)

declare global {
  interface HTMLElementTagNameMap {
    'h-file-drop': HFileDrop
  }

  interface HTMLElementEventMap {
    'h-file': CustomEvent<HFile>
  }
}

export default HFileDrop
