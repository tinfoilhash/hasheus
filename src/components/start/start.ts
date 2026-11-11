import '@/components/app/app_header'
import '@/components/base/command'
import '@/components/base/status'
import cssNormalize from '@/components/base/css/css_normalize'
import cssPage from '@/components/base/css/css_page'
import cssTags from '@/components/base/css/css_tags'
import bidiControlStripper from '@/lib/bidi_control_stripper'
import statusTextFormatter from '@/lib/status_text_formatter'
import HFile from '@/services/file'
import { css, html, LitElement, nothing, type PropertyDeclarations, type TemplateResult } from 'lit'

class HStart extends LitElement {
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
      void this.#showError(HStart.FOLDER_ERROR_MESSAGE)

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
      ${this.#renderHero()} ${this.#renderSection('the problem', this.#renderProblem())}
      ${this.#renderSection('how it works', this.#renderHowItWorks())}
      ${this.#renderSection("why it's different", this.#renderWhyDifferent())}
      ${this.#renderSection('what trusted means', this.#renderTrustedMeaning())}
      ${this.#renderSection('made it or checked it? verify it', this.#renderVerifyIt())}
      ${this.#renderSection('questions', this.#renderQuestions())}
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

  #renderHero() {
    return html`
      <section class="head margined">
        <h-app-header></h-app-header>
        <div class="body">
          <h2>is this the file you think it is?</h2>
          <p class="intro">
            a download, a photo, a video, a document someone sent you: don't take its source's word
            for it. see who has verified your exact file, and whether that includes people you
            follow. it's free and
            <a href="https://github.com/tinfoilhash/hasheus" target="_blank">open source</a>, with
            no trackers and no sign-up, and your file never leaves your computer.
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
          <p class="cli">
            or
            <a href="https://github.com/tinfoilhash/hasheus-cli" target="_blank">install the cli</a>
            and run ${this.#renderCommand('hasheus verify <file>')} in a terminal.
          </p>
        </div>
      </section>
    `
  }

  #renderSection(heading: string, content: TemplateResult) {
    return html`
      <section class="margined">
        <h3>${heading}</h3>
        <div class="body">${content}</div>
      </section>
    `
  }

  #renderCommand(command: string) {
    return html`<h-command .command=${command}></h-command>`
  }

  #renderTrusted(text = 'trusted') {
    return html`<span class="trusted">${text}</span>`
  }

  #renderUnknown() {
    return html`<span class="unknown">unknown</span>`
  }

  #renderProblem() {
    return html`
      <p>
        a hash is a fingerprint of a file: change one byte, and it changes. sources list one so you
        can check your copy against it. but whoever takes over the site or account sharing a file
        can swap the file and its hash together, and they'll still match. in 2016, attackers took
        over linux mint's site and
        <a href="https://blog.linuxmint.com/?p=2994" target="_blank"
          >pointed its downloads at a backdoored installer</a
        >, and they could edit the checksums beside it, too.
      </p>
      <p>
        hasheus checks signatures instead of the source's word. when a file's author has verified
        it, you'll find their signed word here, along with everyone else's verifications of it.
        verifications from people you follow are marked ${this.#renderTrusted()}.
      </p>
    `
  }

  #renderHowItWorks() {
    return html`
      <ol>
        <li>
          <strong>hash a file.</strong> drop it anywhere, or run
          ${this.#renderCommand('hasheus verify <file>')}. its sha-256 hash is worked out on your
          computer.
        </li>
        <li>
          <strong>see who has verified it.</strong> a verification is a signed note linking that
          hash to a description and a link to the file. the signature proves whose key published it,
          not whether or how they checked the file. hasheus is new, so your file may have none yet.
          if you can vouch for it, yours can be the first.
        </li>
        <li>
          <strong>see which verifiers you follow.</strong> hasheus is built on nostr, an open
          protocol where your identity is a key you hold, not an account a company owns. you follow
          people in any nostr app, and hasheus marks verifications from you and the people you
          follow as ${this.#renderTrusted()}. to see which are trusted, connect your nostr profile
          on a file's result page, or give the cli your public key (setup is below).
        </li>
      </ol>
      <p>
        say you follow an app's developer, who verifies each release. download an installer, from
        their site or a mirror, and their verification shows up ${this.#renderTrusted()}. two
        friends you follow verified it with the same link, so that link shows
        ${this.#renderTrusted('+2 trusted')}. check the description against the release you meant to
        get: you have the author's signed word about your exact file.
      </p>
    `
  }

  #renderWhyDifferent() {
    return html`
      <ul>
        <li>
          <strong>the author's word, without the hunt.</strong> when authors verify their own files,
          hasheus finds them by your file's hash: no signature files to download, no keys to import,
          no comparing hashes by hand.
          <a href="https://github.com/tinfoilhash/hasheus-cli/releases" target="_blank"
            >the cli's own releases</a
          >
          are verified this way.
        </li>
        <li>
          <strong>everyone else's, too.</strong> you also see everyone else who has verified the
          file, and which of them you follow, so you have more to go on, even when the author hasn't
          verified it.
        </li>
        <li>
          <strong>taking over a source doesn't take over keys.</strong> anyone can publish a
          verification, including someone pushing a fake file, but unless it's signed by you or
          someone you follow, it shows up as ${this.#renderUnknown()}.
        </li>
        <li>
          <strong>you choose whose word counts,</strong> by who you follow, not an app store or a
          certificate authority.
        </li>
      </ul>
    `
  }

  #renderTrustedMeaning() {
    return html`
      <p>
        your web of trust is you and the people you follow, including people you follow for memes.
        trust follows keys, so copying someone's name or picture doesn't count. a trusted
        verification is only as good as the person behind it.
      </p>
      <p>
        ${this.#renderUnknown()} means you haven't connected, or the verifier is outside your web of
        trust. it doesn't mean the file is bad. a trusted verification gives you a second source to
        judge, not proof the file is official, current, or safe, and hasheus isn't a virus scanner.
        if there are no verifications at all, the question is still open.
      </p>
    `
  }

  #renderVerifyIt() {
    return html`
      <p>
        if you made the file, verify it yourself, so people who follow you see it trusted, wherever
        they got it. if you've checked someone else's file, say against a copy you already trust,
        add your verification. people who follow you will see it trusted, too.
      </p>
      <p>
        connect and add yours on its result page, or run
        ${this.#renderCommand('hasheus publish <file> --url <url>')}. getting a file from the
        official site alone isn't enough: that's what attackers can take over. your verification is
        public and signed with your key, so only vouch for what you've checked.
      </p>
    `
  }

  #renderQuestions() {
    return html`
      ${this.#renderQuestion(
        'is my file uploaded?',
        html`
          no. its hash is computed on your computer, in your browser or the cli, and only the hash
          is sent to hasheus's relay, the server that stores verifications. profiles, and your
          follow list when you connect, are fetched from public nostr relays. if you publish a
          verification, its hash, description, url, size, and type are public.
        `,
      )}
      ${this.#renderQuestion(
        'how do i connect?',
        html`
          you don't need to connect to look up a file. connecting marks which verifications come
          from people you follow, and for that you'll need a nostr profile. if you're new, create
          one in a nostr app that lets you choose who to follow. in the browser, use that same
          identity in a signing extension such as
          <a href="https://github.com/fiatjaf/nos2x" target="_blank">nos2x</a>, then choose a file
          and click connect on its result page. these extensions mostly run on desktop browsers. in
          the cli, set ${this.#renderCommand('HASHEUS_PUBLIC_KEY')} to your public key, and
          ${this.#renderCommand('hasheus publish')} asks for your secret key when you add a
          verification. <a href="https://nostr.com" target="_blank">learn more</a>
        `,
      )}
      ${this.#renderQuestion(
        'does it work for photos and videos?',
        html`
          yes, for any file. but a hash covers the exact file, so a copy that's been resized,
          recompressed, or stripped of its metadata, as many sites do on upload, won't match the
          original.
        `,
      )}
      ${this.#renderQuestion(
        'which link does it show?',
        html`
          the one shared by the largest number of trusted verifiers: you and the people you follow.
          if there are no trusted verifications, it shows an unknown verifier's link, marked
          ${this.#renderUnknown()}.
        `,
      )}
      ${this.#renderQuestion(
        'can i share a result?',
        html`
          yes. every file gets its own page here, so copy its address to send someone the
          verifications without sending the file.
        `,
      )}
      ${this.#renderQuestion(
        'where are verifications stored?',
        html`
          on hasheus's relay by default. they're signed and in an open format, so any relay can
          store copies.
        `,
      )}
    `
  }

  #renderQuestion(question: string, answer: TemplateResult) {
    return html`
      <details>
        <summary>${question}</summary>
        <p>${answer}</p>
      </details>
    `
  }

  static override styles = [
    cssNormalize,
    cssPage,
    cssTags,
    css`
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

      section:not(.head) {
        padding-block: 2.5rem;
        border-top: 1px solid var(--h-color-800);
      }

      /* the footer brings its own space. */
      section:last-of-type {
        padding-bottom: 0;
      }

      h3 {
        margin: 0 0 1rem;
        font-family: var(--h-font-mono);
        font-size: 0.875rem;
        font-weight: inherit;
        line-height: 1.375rem;
        color: var(--h-color-400);
      }

      /* the alert region is always there for screen readers, so the error
         inside it brings the space, not the region. */
      .body > .alert {
        margin-top: 0;
      }

      .alert h-status {
        margin-top: 1rem;
      }

      strong {
        font-weight: 600;
        color: var(--h-color-100);
      }

      ol,
      ul {
        padding-left: 1.5rem;
      }

      li + li {
        margin-top: 0.75rem;
      }

      ol li::marker {
        font-family: var(--h-font-mono);
        color: var(--h-color-terracotta);
      }

      ul li::marker {
        color: var(--h-color-600);
      }

      .intro {
        color: var(--h-color-100);
      }

      .drop {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        margin-top: 1.5rem;
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

      .cli {
        font-size: 0.875rem;
        line-height: 1.375rem;
        color: var(--h-color-400);
      }

      .cli a {
        color: var(--h-color-300);
      }

      details + details {
        margin-top: 0.75rem;
      }

      summary {
        color: var(--h-color-100);
        cursor: pointer;
      }

      /* light enough to read as the question's open or closed state. */
      summary::marker {
        color: var(--h-color-500);
      }

      /* lines up with the question, past its marker. */
      details p {
        padding-left: 1.125rem;
        margin-top: 0.5rem;
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

      @media (width >= 48rem) {
        section:not(.head) {
          padding-block: 3rem;
        }

        h3 {
          padding-top: 0.125rem;
          margin: 0;
        }
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
