import '@/components/base/button'
import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/error'
import HNavigable from '@/components/base/mixins/navigable'
import '@/components/base/status'
import FilePublisher from '@/services/file_publisher'
import { Task, TaskStatus } from '@lit/task'
import { css, html, LitElement, nothing } from 'lit'

class HPublish extends HNavigable(LitElement) {
  static properties = {
    file: { attribute: false },
  }

  _publishTask = this._constructPublishTask()

  _constructPublishTask() {
    return new Task(this, {
      task: async ([form]) => {
        if (!this._canPublish || form.matches(':invalid')) {
          return
        }

        const formData = new FormData(form)

        const publisher = new FilePublisher({
          file: this.file,
          description: formData.get('description'),
          url: formData.get('url'),
        })

        return await publisher.publish()
      },
      args: () => [],
      autoRun: false,
      onComplete: (fileEvent) => {
        if (fileEvent) {
          // going back avoids a duplicate history entry for the verify page.
          this.navigate(`/${this.file.hash}`, { replace: true, back: true })
        }
      },
    })
  }

  get _canPublish() {
    return Boolean(window.nostr)
  }

  _publish(event) {
    event.preventDefault()

    this._publishTask.run([event.target])
  }

  render() {
    const isPending = this._publishTask.status === TaskStatus.PENDING
    // stays disabled after publishing until the navigation to the verify page
    // lands, so the file can't be published twice.
    const isDisabled =
      !this._canPublish || isPending || this.file.hasBeenPublished

    return html`
      ${
        !this._canPublish
          ? html`
              <h-status color="orange">
                you need a browser extension that can sign nostr events!
                <a href="https://nostr.com" target="_blank">learn more</a>
              </h-status>
            `
          : nothing
      }
      ${this._publishTask.render({
        error: (error) =>
          html`<h-error data-testid="publish-error" .error=${error}></h-error>`,
      })}
      <form novalidate @submit=${this._publish}>
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
        </ul>
        <h-button ?pending=${isPending}>
          <button
            data-testid="publish-button"
            type="submit"
            ?disabled=${isDisabled}
          >
            publish
          </button>
        </h-button>
      </form>
    `
  }

  static styles = [
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

export default HPublish
