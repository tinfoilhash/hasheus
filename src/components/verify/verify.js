import '@/components/app/app_current_user'
import '@/components/base/button'
import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/error'
import '@/components/base/spinner'
import '@/components/base/status'
import '@/components/base/user_picture'
import FileSubscriber from '@/services/file_subscriber'
import { Task, TaskStatus } from '@lit/task'
import { css, html, LitElement, nothing } from 'lit'

class THVVerify extends LitElement {
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

  // someone can verify the same file more than once, so only their first
  // verification is shown. events are already sorted oldest first.
  get _firstEventPerPubkey() {
    const seenPubkeys = new Set()

    return this._events.filter((event) => {
      if (seenPubkeys.has(event.pubkey)) {
        return false
      }

      seenPubkeys.add(event.pubkey)

      return true
    })
  }

  get _trustedEvents() {
    return this._firstEventPerPubkey.filter((event) =>
      this.currentUser?.hasTrusted(event.pubkey),
    )
  }

  get _untrustedEvents() {
    return this._firstEventPerPubkey.filter(
      (event) => !this.currentUser?.hasTrusted(event.pubkey),
    )
  }

  // anyone can backdate a verification, so the description and url come from
  // the url most trusted verifiers agree on, with ties going to the earliest.
  get _source() {
    const trustedEvents = this._trustedEvents

    if (!trustedEvents.length) {
      return {
        event: this._firstEventPerPubkey[0],
        isConfirmed: false,
        agreementCount: 0,
      }
    }

    const eventsByURL = Map.groupBy(
      trustedEvents.filter((event) => event.url),
      (event) => new URL(event.url).href,
    )
    let agreeingEvents = []

    for (const events of eventsByURL.values()) {
      if (events.length > agreeingEvents.length) {
        agreeingEvents = events
      }
    }

    return {
      event: agreeingEvents[0] ?? trustedEvents[0],
      isConfirmed: true,
      agreementCount: agreeingEvents.length,
    }
  }

  _renderUnconfirmedTag(isUnconfirmed) {
    return isUnconfirmed
      ? html`<span class="unconfirmed">unconfirmed</span>`
      : nothing
  }

  render() {
    const isPending = this._subscribeTask.status === TaskStatus.PENDING
    const trustedEvents = this._trustedEvents
    const untrustedEvents = this._untrustedEvents
    const { event: sourceEvent, isConfirmed, agreementCount } = this._source
    // labeled whenever it shows, even while loading, so an untrusted source is
    // never shown unlabeled.
    const isUnconfirmed = Boolean(sourceEvent) && !isConfirmed
    const url = sourceEvent?.url
    const pendingOrEmptyValue = isPending
      ? html`<thv-spinner></thv-spinner>`
      : html`<span class="empty">&mdash;</span>`

    return html`
      ${
        this._hasCurrentUserVerified
          ? html`
              <thv-status color="green"
                >you have verified this file!</thv-status
              >
            `
          : nothing
      }
      ${this._subscribeTask.render({
        complete: () => {
          if (!sourceEvent) {
            return html`
              <thv-status color="orange">
                this file has not been verified!
                ${
                  this._canPublish
                    ? html`<a href="/publish">add your verification</a>`
                    : nothing
                }
              </thv-status>
            `
          }

          if (isUnconfirmed && !this._hasCurrentUserVerified) {
            return html`
              <thv-status color="orange">
                ${
                  this.currentUser
                    ? 'no one in your web of trust has verified this file.'
                    : 'connect to see if anyone in your web of trust has verified this file.'
                }
                its description and url are unconfirmed.
              </thv-status>
            `
          }

          return nothing
        },
        error: (error) => html`<thv-error .error=${error}></thv-error>`,
      })}
      <ul>
        <li>
          <div class="key">file hash</div>
          <div class="value">${this.hash}</div>
        </li>
        <li>
          <div class="key">
            description${this._renderUnconfirmedTag(isUnconfirmed)}
          </div>
          <div class="value">
            ${sourceEvent?.content ?? pendingOrEmptyValue}
          </div>
        </li>
        <li>
          <div class="key">url${this._renderUnconfirmedTag(isUnconfirmed)}</div>
          <div class="value">
            ${
              url
                ? html`<a href=${url} target="_blank">${url}</a>`
                : pendingOrEmptyValue
            }
            ${
              isConfirmed && url
                ? html`
                    <div class="agreement">
                      linked by ${agreementCount} in your web of trust
                    </div>
                  `
                : nothing
            }
          </div>
        </li>
        <li class="source">
          <div class="key">source</div>
          <div class="value">
            ${
              sourceEvent
                ? html`
                    <thv-user-picture
                      .pubkeyEncoded=${sourceEvent.pubkeyEncoded}
                      .userEvent=${sourceEvent.userEvent}
                      ?trusted=${isConfirmed}
                    ></thv-user-picture>
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
                  <div class="value">
                    ${
                      trustedEvents.length
                        ? html`
                            <ol>
                              ${trustedEvents.map(
                                (event) => html`
                                  <li>
                                    <thv-user-picture
                                      .pubkeyEncoded=${event.pubkeyEncoded}
                                      .userEvent=${event.userEvent}
                                      trusted
                                      title=${`${event.userDisplayName}\n${event.createdAtDate.toLocaleString()}`}
                                    ></thv-user-picture>
                                  </li>
                                `,
                              )}
                            </ol>
                          `
                        : pendingOrEmptyValue
                    }
                  </div>
                `
              : nothing
          }
          <thv-app-current-user></thv-app-current-user>
        </li>
        <li class="verified-list">
          <div class="key">verified outside your web of trust</div>
          <div class="value">
            ${
              untrustedEvents.length
                ? html`
                    <ol>
                      ${untrustedEvents.map(
                        (event) => html`
                          <li>
                            <thv-user-picture
                              .pubkeyEncoded=${event.pubkeyEncoded}
                              .userEvent=${event.userEvent}
                              title=${`${event.userDisplayName}\n${event.createdAtDate.toLocaleString()}`}
                            ></thv-user-picture>
                          </li>
                        `,
                      )}
                    </ol>
                  `
                : pendingOrEmptyValue
            }
          </div>
        </li>
      </ul>
      ${
        this._canPublish
          ? html`
              <div class="publish">
                <thv-button>
                  <a href="/publish">add your verification</a>
                </thv-button>
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

      thv-status,
      thv-error {
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
        color: var(--thv-color-500);
      }

      ul li .value {
        font-size: 1.25rem;
        overflow-wrap: break-word;
      }

      ul li .value a {
        color: inherit;
      }

      ul li .key .unconfirmed {
        padding: 0 0.375rem;
        margin-left: 0.5rem;
        color: var(--thv-color-100);
        background: var(--thv-color-orange);
      }

      ul li .value .agreement {
        margin-top: 0.25rem;
        font-size: 1rem;
        color: var(--thv-color-500);
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

      ul li.verified-list thv-app-current-user {
        margin-top: 0.5rem;
      }

      .publish {
        margin-top: 1.5rem;
      }
    `,
  ]
}

customElements.define('thv-verify', THVVerify)

export default THVVerify
