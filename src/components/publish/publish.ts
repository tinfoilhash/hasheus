import '@/components/app/app_current_user'
import '@/components/app/app_header'
import '@/components/base/button'
import cssNormalize from '@/components/base/css/css_normalize'
import cssPage from '@/components/base/css/css_page'
import '@/components/base/error'
import '@/components/base/hash'
import HNavigable from '@/components/base/mixins/navigable'
import '@/components/base/status'
import type CurrentUser from '@/services/current_user'
import type HFile from '@/services/file'
import FilePublisher from '@/services/file_publisher'
import { Task, TaskStatus } from '@lit/task'
import { css, html, LitElement, nothing, type PropertyDeclarations, type TemplateResult } from 'lit'

class HPublish extends HNavigable(LitElement) {
  static VALIDATION_MESSAGES = {
    DESCRIPTION_MISSING: 'describe the file',
    URL_MISSING: 'add a url for the file',
    URL_INVALID: 'enter a url that starts with http:// or https://',
  }

  static override properties = {
    currentUser: { attribute: false },
    file: { attribute: false },
    _validationMessages: { state: true },
  } satisfies PropertyDeclarations

  declare currentUser?: CurrentUser | null
  // the route only renders this page once there's a file.
  declare file: HFile
  // keyed by input name, and only for inputs that have been checked.
  declare private _validationMessages: Record<string, string | undefined>

  constructor() {
    super()

    this._validationMessages = {}
  }

  #publishTask = this.#constructPublishTask()

  #constructPublishTask() {
    return new Task(this, {
      task: async ([form]: [HTMLFormElement]) => {
        if (!this.#canPublish || !this.currentUser) {
          return
        }

        const formData = new FormData(form)

        // both are text inputs, so their values are strings rather than files.
        const publisher = new FilePublisher({
          file: this.file,
          description: formData.get('description') as string,
          url: formData.get('url') as string,
          pubkey: this.currentUser.pubkey,
        })

        return await publisher.publish()
      },
      autoRun: false,
      onComplete: (fileEvent) => {
        if (fileEvent) {
          this.#returnToResult()
        }
      },
    })
  }

  get #canPublish() {
    return Boolean(window.nostr)
  }

  // going back avoids a duplicate history entry for the verify page.
  #returnToResult() {
    this.navigate(`/${this.file.hash}`, { replace: true, back: true })
  }

  // a modified click, like opening in a new tab, is left to the browser.
  #returnToResultFromLink = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    event.preventDefault()
    this.#returnToResult()
  }

  #validationMessageFor(input: HTMLInputElement) {
    const { VALIDATION_MESSAGES } = HPublish

    if (input.validity.valid) {
      return undefined
    }

    switch (input.name) {
      case 'description':
        return VALIDATION_MESSAGES.DESCRIPTION_MISSING
      case 'url':
        return input.validity.valueMissing
          ? VALIDATION_MESSAGES.URL_MISSING
          : VALIDATION_MESSAGES.URL_INVALID
      default:
        throw new TypeError(`no validation message for the "${input.name}" input`)
    }
  }

  #validateInputs(inputs: HTMLInputElement[]) {
    const validationMessages = { ...this._validationMessages }

    for (const input of inputs) {
      validationMessages[input.name] = this.#validationMessageFor(input)
    }

    this._validationMessages = validationMessages
  }

  // like :user-invalid, an input is first checked once it's been changed, so
  // tabbing past it doesn't flag it.
  #validateChangedInput = (event: Event) => {
    if (event.target instanceof HTMLInputElement) {
      this.#validateInputs([event.target])
    }
  }

  // once its message shows, an input is checked as you type, so the message
  // goes away as soon as it's fixed.
  #revalidateInput = (event: Event) => {
    if (event.target instanceof HTMLInputElement && this._validationMessages[event.target.name]) {
      this.#validateInputs([event.target])
    }
  }

  // the form opts out of the browser's own checks, so it shows its own
  // messages instead, and focuses the first input that needs fixing once its
  // message has rendered, so a screen reader reads the message, not the hint.
  #publish = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()

    const form = event.currentTarget
    const inputs = [...form.querySelectorAll('input')]

    this.#validateInputs(inputs)

    const invalidInput = inputs.find((input) => !input.validity.valid)

    if (invalidInput) {
      await this.updateComplete
      invalidInput.focus()
      return
    }

    void this.#publishTask.run([form])
  }

  // the npub stays next to the name, since anyone can copy a name.
  #renderVerifier() {
    if (!this.currentUser) {
      return html`<h-app-current-user></h-app-current-user>`
    }

    const { displayName, pubkeyEncodedTruncated } = this.currentUser.userEvent

    return displayName === pubkeyEncodedTruncated
      ? displayName
      : `${displayName} (${pubkeyEncodedTruncated})`
  }

  override render() {
    const isPending = this.#publishTask.status === TaskStatus.PENDING
    // stays disabled after publishing until the navigation to the verify page
    // lands, so the file can't be published twice.
    const isDisabled =
      !this.#canPublish || !this.currentUser || isPending || this.file.hasBeenPublished

    return html`
      <section class="head margined">
        <h-app-header></h-app-header>
        <div class="body">
          <h2>add your verification</h2>
          <p>
            your verification is public and signed with your key. people who follow you will see it
            trusted, wherever they get the file.
          </p>
          <p class="note">
            only vouch for what you've checked. getting it from the official site alone isn't
            enough.
          </p>
          ${
            !this.#canPublish
              ? html`
                  <h-status color="yellow">
                    publishing needs a browser extension that signs nostr events, such as
                    <a href="https://github.com/fiatjaf/nos2x" target="_blank">nos2x</a> ·
                    <a href="https://nostr.com" target="_blank">learn more</a>
                  </h-status>
                `
              : nothing
          }
        </div>
      </section>
      <form
        novalidate
        @submit=${this.#publish}
        @change=${this.#validateChangedInput}
        @input=${this.#revalidateInput}
      >
        <dl>
          ${this.#renderField(html`file hash`, html`<h-hash .hash=${this.file.hash}></h-hash>`)}
          ${this.#renderField(
            html`<label for="description">description</label>`,
            html`
              <input
                id="description"
                type="text"
                name="description"
                value=${this.file.name}
                required
                maxlength="1000"
                aria-describedby="description-hint"
                aria-invalid=${this.#isInvalid('description')}
              />
              ${this.#renderHint(
                'description',
                "what the file is, so people can check it's what they meant to get.",
              )}
            `,
          )}
          ${this.#renderField(
            html`<label for="url">url</label>`,
            html`
              <input
                id="url"
                data-testid="url-input"
                type="url"
                name="url"
                placeholder="https://"
                required
                pattern="https?://.+"
                maxlength="1000"
                aria-describedby="url-hint"
                aria-invalid=${this.#isInvalid('url')}
              />
              ${this.#renderHint('url', 'where you got it, or where people can download it.')}
            `,
          )}
          ${this.#renderField(html`type`, html`<span data-testid="mime-type">${this.file.type}</span>`)}
          ${this.#renderField(
            html`verifier`,
            html`<div data-testid="verifier">${this.#renderVerifier()}</div>`,
          )}
        </dl>
        <div class="submit margined">
          <div class="submit-body">
            <p>
              <h-button ?pending=${isPending}>
                <button data-testid="publish-button" type="submit" ?disabled=${isDisabled}>
                  publish
                </button>
              </h-button>
              ${
                // hidden while publishing, so leaving can't strand a publish
                // that's still signing or sending.
                isPending
                  ? nothing
                  : html`
                      <span>
                        or
                        <a href=${`/${this.file.hash}`} @click=${this.#returnToResultFromLink}
                          >back to the result</a
                        >
                      </span>
                    `
              }
            </p>
            ${this.#publishTask.render({
              error: (error) =>
                html`<h-error data-testid="publish-error" .error=${error}></h-error>`,
            })}
          </div>
        </div>
      </form>
    `
  }

  #isInvalid(name: string) {
    return this._validationMessages[name] ? 'true' : 'false'
  }

  // a validation message takes the hint's place, so the input stays described
  // by the same element.
  #renderHint(name: string, hint: string) {
    const validationMessage = this._validationMessages[name]

    return html`
      <p class=${validationMessage ? 'hint invalid' : 'hint'} id=${`${name}-hint`}>
        ${validationMessage ?? hint}
      </p>
    `
  }

  #renderField(label: TemplateResult, value: TemplateResult) {
    return html`
      <div class="field margined">
        <dt>${label}</dt>
        <dd>${value}</dd>
      </div>
    `
  }

  static override styles = [
    cssNormalize,
    cssPage,
    css`
      .note {
        font-size: 0.875rem;
        line-height: 1.375rem;
        color: var(--h-color-400);
      }

      input {
        display: block;
        width: 100%;
        padding: 0.5rem 0.75rem;
        font: inherit;
        line-height: 1.5rem;
        color: var(--h-color-100);
        background: none;
        border: 1px solid var(--h-color-500);
      }

      input::placeholder {
        color: var(--h-color-400);
      }

      /* the ring sits on the border, rather than outside it, so the two don't
         read as a double line. */
      input:focus-visible {
        outline-offset: -1px;
      }

      input[aria-invalid='true'] {
        outline-color: var(--h-color-red);
        border-color: var(--h-color-red);
      }

      .hint {
        margin-top: 0.375rem;
        font-size: 0.875rem;
        line-height: 1.375rem;
        color: var(--h-color-400);
      }

      .hint.invalid {
        color: var(--h-color-red);
      }

      .submit {
        padding-top: 1rem;
        border-top: 1px solid var(--h-color-800);
      }

      .submit p {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        font-size: 0.875rem;
        line-height: 1.375rem;
        color: var(--h-color-400);
      }

      /* beside the publish button, where the eye already is. */
      .submit h-error {
        margin-top: 1rem;
      }

      @media (width >= 48rem) {
        .submit-body {
          grid-column: 2;
        }
      }
    `,
  ]
}

customElements.define('h-publish', HPublish)

declare global {
  interface HTMLElementTagNameMap {
    'h-publish': HPublish
  }
}

export default HPublish
