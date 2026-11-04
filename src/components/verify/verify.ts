import '@/components/app/app_current_user'
import '@/components/base/button'
import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/error'
import '@/components/base/spinner'
import '@/components/base/status'
import '@/components/base/user_picture'
import type CurrentUser from '@/services/current_user'
import type HFile from '@/services/file'
import type FileEvent from '@/services/file_event'
import FileSubscriber from '@/services/file_subscriber'
import verificationSorter from '@/services/verification_sorter'
import { Task, TaskStatus } from '@lit/task'
import { css, html, LitElement, nothing, type PropertyDeclarations, type TemplateResult } from 'lit'

class HVerify extends LitElement {
  static properties = {
    currentUser: { attribute: false },
    file: { attribute: false },
    hash: { attribute: false },
    _events: { state: true },
  } satisfies PropertyDeclarations

  declare currentUser?: CurrentUser | null
  declare file?: HFile
  // the route always renders this page with a hash.
  declare hash: string
  declare private _events: FileEvent[]

  #subscribeTask = this.#constructSubscribeTask()
  #subscriber: FileSubscriber | null = null

  constructor() {
    super()

    this._events = []
  }

  disconnectedCallback() {
    super.disconnectedCallback()

    this.#subscriber?.close()
  }

  // the element is reused when navigating between hashes, so the previous
  // hash's subscriber and events are dropped before subscribing to the new one.
  #constructSubscribeTask() {
    return new Task(this, {
      task: async ([hash]) => {
        this.#subscriber?.close()
        this._events = []

        this.#subscriber = new FileSubscriber({
          hash,
          onChange: (events) => (this._events = events),
        })

        return await this.#subscriber.subscribe()
      },
      args: () => [this.hash] as const,
    })
  }

  get #isFileForHash() {
    return this.file?.hash === this.hash
  }

  get #hasCurrentUserVerified() {
    const pubkey = this.currentUser?.pubkey

    return (
      (this.#isFileForHash && Boolean(this.file?.hasBeenPublished)) ||
      (pubkey !== undefined && this._events.some((event) => event.pubkey === pubkey))
    )
  }

  get #canPublish() {
    return this.#isFileForHash && !this.#hasCurrentUserVerified
  }

  #renderUntrustedTag(isUntrusted: boolean) {
    return isUntrusted
      ? html`<span class="untrusted" data-testid="untrusted-tag">untrusted</span>`
      : nothing
  }

  #renderTrustedTag(isTrusted: boolean) {
    return isTrusted
      ? html`<span class="trusted" data-testid="trusted-tag">trusted</span>`
      : nothing
  }

  // the source is one of the agreeing verifiers, so only others are counted.
  #renderAgreementTag(agreementCount: number) {
    const otherCount = agreementCount - 1

    return otherCount > 0
      ? html`<span class="trusted" data-testid="agreement-tag">+${otherCount} trusted</span>`
      : nothing
  }

  #renderVerifierList(events: FileEvent[], { emptyValue }: { emptyValue: TemplateResult }) {
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
                title=${`${event.userDisplayName}\n${event.createdAtLocaleString}`}
              ></h-user-picture>
            </li>
          `,
        )}
      </ol>
    `
  }

  render() {
    const isPending = this.#subscribeTask.status === TaskStatus.PENDING
    const { trustedEvents, untrustedEvents, source } = verificationSorter({
      events: this._events,
      currentUser: this.currentUser,
    })
    const { event: sourceEvent, isTrusted, agreementCount } = source
    // labeled whenever it shows, even while loading, so an untrusted source is
    // never shown unlabeled.
    const isUntrusted = Boolean(sourceEvent) && !isTrusted
    const url = sourceEvent?.url
    const pendingOrEmptyValue = isPending ? html`<h-spinner></h-spinner>` : html`&mdash;`

    return html`
      ${
        this.#hasCurrentUserVerified
          ? html`
              <h-status color="green" data-testid="verified-status"
                >you have verified this file!</h-status
              >
            `
          : nothing
      }
      ${this.#subscribeTask.render({
        complete: () => {
          if (!sourceEvent) {
            return html`
              <h-status color="orange" data-testid="not-verified-status">
                this file has not been verified!
                ${
                  this.#canPublish
                    ? html`<a href="/publish" data-testid="add-verification-link"
                        >add your verification</a
                      >`
                    : nothing
                }
              </h-status>
            `
          }

          if (isUntrusted && !this.#hasCurrentUserVerified) {
            return html`
              <h-status color="orange" data-testid="untrusted-status">
                ${
                  this.currentUser
                    ? 'no one in your web of trust has verified this file.'
                    : 'connect to see if anyone in your web of trust has verified this file.'
                }
                its source and url are untrusted.
              </h-status>
            `
          }

          return nothing
        },
        error: (error) => html`<h-error data-testid="subscribe-error" .error=${error}></h-error>`,
      })}
      <ul>
        <li>
          <div class="key">file hash</div>
          <div class="value" data-testid="file-hash">${this.hash}</div>
        </li>
        <li>
          <div class="key">description</div>
          <div class="value" data-testid="description">
            ${sourceEvent?.descriptionTrimmed || pendingOrEmptyValue}
          </div>
        </li>
        <li>
          <div class="key">
            url${this.#renderUntrustedTag(isUntrusted)}${this.#renderAgreementTag(agreementCount)}
          </div>
          <div class="value" data-testid="url">
            ${url ? html`<a href=${url} target="_blank">${url}</a>` : pendingOrEmptyValue}
          </div>
        </li>
        <li class="source">
          <div class="key">
            source${this.#renderUntrustedTag(isUntrusted)}${this.#renderTrustedTag(isTrusted)}
          </div>
          <div class="value" data-testid="source">
            ${
              sourceEvent
                ? html`
                    <h-user-picture
                      .pubkeyEncoded=${sourceEvent.pubkeyEncoded}
                      .userEvent=${sourceEvent.userEvent}
                    ></h-user-picture>
                    <div>
                      <div class="name">${sourceEvent.userDisplayName}</div>
                      <div>${sourceEvent.createdAtLocaleString}</div>
                    </div>
                  `
                : pendingOrEmptyValue
            }
          </div>
        </li>
        <li class="verified-list">
          <div class="key">trusted verifiers</div>
          <div class="value" data-testid="trusted-verifiers">
            ${this.#renderVerifierList(trustedEvents, {
              emptyValue: pendingOrEmptyValue,
            })}
          </div>
        </li>
        <li class="verified-list">
          <div class="key">untrusted verifiers</div>
          <div class="value">
            ${this.#renderVerifierList(untrustedEvents, {
              emptyValue: pendingOrEmptyValue,
            })}
          </div>
        </li>
      </ul>
      <div class="actions">
        ${
          this.#canPublish
            ? html`
                <h-button>
                  <a href="/publish">add your verification</a>
                </h-button>
              `
            : nothing
        }
        <h-app-current-user></h-app-current-user>
      </div>
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

      ul li .key .untrusted,
      ul li .key .trusted {
        padding: 0 0.375rem;
        margin-left: 0.5rem;
        color: var(--h-color-100);
      }

      ul li .key .untrusted {
        background: var(--h-color-orange);
      }

      ul li .key .trusted {
        background: var(--h-color-green);
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

      .actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
        margin-top: 1.5rem;
      }
    `,
  ]
}

customElements.define('h-verify', HVerify)

declare global {
  interface HTMLElementTagNameMap {
    'h-verify': HVerify
  }
}

export default HVerify
