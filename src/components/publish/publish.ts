import '@/components/app/app_current_user'
import '@/components/base/button'
import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/error'
import HNavigable from '@/components/base/mixins/navigable'
import '@/components/base/status'
import type CurrentUser from '@/services/current_user'
import type HFile from '@/services/file'
import FilePublisher from '@/services/file_publisher'
import { Task, TaskStatus } from '@lit/task'
import { css, html, LitElement, nothing, type PropertyDeclarations } from 'lit'

class HPublish extends HNavigable(LitElement) {
  static override properties = {
    currentUser: { attribute: false },
    file: { attribute: false },
  } satisfies PropertyDeclarations

  declare currentUser?: CurrentUser | null
  // the route only renders this page once there's a file.
  declare file: HFile

  #publishTask = this.#constructPublishTask()

  #constructPublishTask() {
    return new Task(this, {
      task: async ([form]: [HTMLFormElement]) => {
        if (!this.#canPublish || !this.currentUser || form.matches(':invalid')) {
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
          // going back avoids a duplicate history entry for the verify page.
          this.navigate(`/${this.file.hash}`, { replace: true, back: true })
        }
      },
    })
  }

  get #canPublish() {
    return Boolean(window.nostr)
  }

  #publish = (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()

    void this.#publishTask.run([event.currentTarget])
  }

  // the npub stays next to the name, since anyone can copy a name.
  #renderVerifiedBy() {
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
      ${
        !this.#canPublish
          ? html`
              <h-status color="orange">
                you need a browser extension that can sign nostr events!
                <a href="https://nostr.com" target="_blank">learn more</a>
              </h-status>
            `
          : nothing
      }
      ${this.#publishTask.render({
        error: (error) => html`<h-error data-testid="publish-error" .error=${error}></h-error>`,
      })}
      <form novalidate @submit=${this.#publish}>
        <ul>
          <li>
            <div class="key">file hash</div>
            <div class="value">${this.file.hash}</div>
          </li>
          <li>
            <div class="key">description</div>
            <div class="value">
              <input
                type="text"
                name="description"
                value=${this.file.name}
                required
                maxlength="1000"
              />
            </div>
          </li>
          <li>
            <div class="key">url</div>
            <div class="value">
              <input
                data-testid="url-input"
                type="url"
                name="url"
                required
                pattern="https?://.+"
                maxlength="1000"
              />
            </div>
          </li>
          <li>
            <div class="key">mime type</div>
            <div class="value" data-testid="mime-type">${this.file.type}</div>
          </li>
          <li>
            <div class="key">verified by</div>
            <div class="value" data-testid="verified-by">${this.#renderVerifiedBy()}</div>
          </li>
        </ul>
        <h-button ?pending=${isPending}>
          <button data-testid="publish-button" type="submit" ?disabled=${isDisabled}>
            publish
          </button>
        </h-button>
      </form>
    `
  }

  static override styles = [
    cssNormalize,
    css`
      :host {
        display: block;
      }

      h-status,
      h-error {
        margin-bottom: 2rem;
      }

      form ul {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 0;
        margin: 0;
        margin-bottom: 1.5rem;
        list-style: none;
      }

      form ul li .key {
        margin-bottom: 0.5rem;
        color: var(--h-color-500);
      }

      form ul li .value {
        font-size: 1.25rem;
        overflow-wrap: break-word;
      }

      form ul li .value input {
        display: block;
        width: 100%;
        padding: 0.5rem;
        color: inherit;
        background: none;
        border: 2px solid var(--h-color-700);
        border-top: none;
        border-right: none;
      }

      form ul li .value input:focus {
        outline: none;
        border-color: var(--h-color-600);
      }

      form ul li .value input:user-invalid {
        border-color: var(--h-color-red);
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
