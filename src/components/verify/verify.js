import '@/components/app/app_current_user'
import '@/components/base/button'
import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/error'
import '@/components/base/spinner'
import '@/components/base/status'
import '@/components/base/user_picture'
import FileSubscriber from '@/services/file_subscriber'
import verificationSorter from '@/services/verification_sorter'
import { Task, TaskStatus } from '@lit/task'
import { css, html, LitElement, nothing } from 'lit'

class HVerify extends LitElement {
  static properties = {
    currentUser: { attribute: false },
    file: { attribute: false },
    hash: { attribute: false },
    _events: { state: true },
  }

  _subscribeTask = this._constructSubscribeTask()
  _subscriber = null

  constructor() {
    super()

    this._events = []
  }

  disconnectedCallback() {
    super.disconnectedCallback()

    this._subscriber?.close()
  }

  // the element is reused when navigating between hashes, so the previous
  // hash's subscriber and events are dropped before subscribing to the new one.
  _constructSubscribeTask() {
    return new Task(this, {
      task: async ([hash]) => {
        this._subscriber?.close()
        this._events = []

        this._subscriber = new FileSubscriber({
          hash,
          onChange: (events) => (this._events = events),
        })

        return await this._subscriber.subscribe()
      },
      args: () => [this.hash],
    })
  }

  get _isFileForHash() {
    return this.file?.hash === this.hash
  }

  get _hasCurrentUserVerified() {
    return (
      (this._isFileForHash && this.file.hasBeenPublished) ||
      (this.currentUser &&
        this._events.some((event) => event.pubkey === this.currentUser.pubkey))
    )
  }

  get _canPublish() {
    return this._isFileForHash && !this._hasCurrentUserVerified
  }

  _renderUntrustedTag(isUntrusted) {
    return isUntrusted
      ? html`<span class="untrusted" data-testid="untrusted-tag"
          >untrusted</span
        >`
      : nothing
  }

  _renderVerifierList(events, { isTrusted = false, emptyValue }) {
    if (!events.length) {
      return emptyValue
    }

    return html`
      <ol>
        ${events.map(
          (event) => html`
            <li>
              <h-user-picture
                .pubkeyEncoded=${event.pubkeyEncoded}
                .userEvent=${event.userEvent}
                ?trusted=${isTrusted}
                title=${`${event.userDisplayName}\n${event.createdAtDate.toLocaleString()}`}
              ></h-user-picture>
            </li>
          `,
        )}
      </ol>
    `
  }

  render() {
    const isPending = this._subscribeTask.status === TaskStatus.PENDING
    const { trustedEvents, untrustedEvents, source } = verificationSorter({
      events: this._events,
      currentUser: this.currentUser,
    })
    const { event: sourceEvent, isTrusted, agreementCount } = source
    // labeled whenever it shows, even while loading, so an untrusted source is
    // never shown unlabeled.
    const isUntrusted = Boolean(sourceEvent) && !isTrusted
    const url = sourceEvent?.url
    const pendingOrEmptyValue = isPending
      ? html`<h-spinner></h-spinner>`
      : html`&mdash;`

    return html`
      ${
        this._hasCurrentUserVerified
          ? html`
              <h-status color="green" data-testid="verified-status"
                >you have verified this file!</h-status
              >
            `
          : nothing
      }
      ${this._subscribeTask.render({
        complete: () => {
          if (!sourceEvent) {
            return html`
              <h-status color="orange" data-testid="not-verified-status">
                this file has not been verified!
                ${
                  this._canPublish
                    ? html`<a
                        href="/publish"
                        data-testid="add-verification-link"
                        >add your verification</a
                      >`
                    : nothing
                }
              </h-status>
            `
          }

          if (isUntrusted && !this._hasCurrentUserVerified) {
            return html`
              <h-status color="orange" data-testid="untrusted-status">
                ${
                  this.currentUser
                    ? 'no one in your web of trust has verified this file.'
                    : 'connect to see if anyone in your web of trust has verified this file.'
                }
                its description and url are untrusted.
              </h-status>
            `
          }

          return nothing
        },
        error: (error) =>
          html`<h-error
            data-testid="subscribe-error"
            .error=${error}
          ></h-error>`,
      })}
      <ul>
        <li>
          <div class="key">file hash</div>
          <div class="value" data-testid="file-hash">${this.hash}</div>
        </li>
        <li>
          <div class="key">
            description${this._renderUntrustedTag(isUntrusted)}
          </div>
          <div class="value" data-testid="description">
            ${sourceEvent?.descriptionTrimmed || pendingOrEmptyValue}
          </div>
        </li>
        <li>
          <div class="key">url${this._renderUntrustedTag(isUntrusted)}</div>
          <div class="value" data-testid="url">
            ${
              url
                ? html`<a href=${url} target="_blank">${url}</a>`
                : pendingOrEmptyValue
            }
            ${
              isTrusted && url
                ? html`
                    <div class="agreement" data-testid="agreement">
                      linked by ${agreementCount} in your web of trust
                    </div>
                  `
                : nothing
            }
          </div>
        </li>
        <li class="source">
          <div class="key">source</div>
          <div class="value" data-testid="source">
            ${
              sourceEvent
                ? html`
                    <h-user-picture
                      .pubkeyEncoded=${sourceEvent.pubkeyEncoded}
                      .userEvent=${sourceEvent.userEvent}
                      ?trusted=${isTrusted}
                    ></h-user-picture>
                    <div>
                      <div class="name">${sourceEvent.userDisplayName}</div>
                      <div>${sourceEvent.createdAtDate.toLocaleString()}</div>
                    </div>
                  `
                : pendingOrEmptyValue
            }
          </div>
        </li>
        <li class="verified-list">
          <div class="key">verified in your web of trust</div>
          ${
            this.currentUser
              ? html`
                  <div class="value" data-testid="trusted-verifiers">
                    ${this._renderVerifierList(trustedEvents, {
                      isTrusted: true,
                      emptyValue: pendingOrEmptyValue,
                    })}
                  </div>
                `
              : nothing
          }
          <h-app-current-user></h-app-current-user>
        </li>
        <li class="verified-list">
          <div class="key">verified outside your web of trust</div>
          <div class="value">
            ${this._renderVerifierList(untrustedEvents, {
              emptyValue: pendingOrEmptyValue,
            })}
          </div>
        </li>
      </ul>
      ${
        this._canPublish
          ? html`
              <div class="publish">
                <h-button>
                  <a href="/publish">add your verification</a>
                </h-button>
              </div>
            `
          : nothing
      }
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

      ul {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 0;
        margin: 0;
        list-style: none;
      }

      ul li .key {
        margin-bottom: 0.5rem;
        color: var(--h-color-500);
      }

      ul li .value {
        font-size: 1.25rem;
        overflow-wrap: break-word;
      }

      ul li .value a {
        color: inherit;
      }

      ul li .key .untrusted {
        padding: 0 0.375rem;
        margin-left: 0.5rem;
        color: var(--h-color-100);
        background: var(--h-color-orange);
      }

      ul li .value .agreement {
        margin-top: 0.25rem;
        font-size: 1rem;
        color: var(--h-color-500);
      }

      ul li.source .value {
        display: flex;
        gap: 0.5rem;
      }

      ul li.source .value .name {
        margin-bottom: 0.5rem;
      }

      ul li.verified-list .value ol {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0;
        margin: 0;
        list-style: none;
      }

      ul li.verified-list h-app-current-user {
        margin-top: 0.5rem;
      }

      .publish {
        margin-top: 1.5rem;
      }
    `,
  ]
}

customElements.define('h-verify', HVerify)

export default HVerify
