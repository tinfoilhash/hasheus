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

  constructor() {
    super()

    this._events = []
  }

  _constructSubscribeTask() {
    return new Task(this, {
      task: async ([hash]) => {
        const subscriber = new FileSubscriber({
          hash,
          onChange: (events) => (this._events = events),
        })

        return await subscriber.subscribe()
      },
      args: () => [this.hash],
    })
  }

  get _hasCurrentUserVerified() {
    return (
      this.file?.hasBeenPublished ||
      (this.currentUser &&
        this._events.some((event) => event.pubkey === this.currentUser.pubkey))
    )
  }

  get _canPublish() {
    return this.file?.hash === this.hash && !this._hasCurrentUserVerified
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

  get _eventsSorted() {
    const [first, ...rest] = this._firstEventPerPubkey

    if (!this.currentUser) {
      return [first, [], rest]
    }

    const trusted = []
    const untrusted = []

    for (const event of rest) {
      if (this.currentUser.hasTrusted(event.pubkey)) {
        trusted.push(event)
      } else {
        untrusted.push(event)
      }
    }

    return [first, trusted, untrusted]
  }

  render() {
    const isPending = this._subscribeTask.status === TaskStatus.PENDING
    const [firstEvent, trustedEvents, untrustedEvents] = this._eventsSorted
    const url = firstEvent?.getFirstTagValue('url')
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
        complete: () =>
          firstEvent
            ? nothing
            : html`
                <thv-status color="orange">
                  this file has not been verified!
                  ${
                    this._canPublish
                      ? html`<a href="/publish">add your verification</a>`
                      : nothing
                  }
                </thv-status>
              `,
        error: (error) => html`<thv-error .error=${error}></thv-error>`,
      })}
      <ul>
        <li>
          <div class="key">file hash</div>
          <div class="value">${this.hash}</div>
        </li>
        <li>
          <div class="key">description</div>
          <div class="value">${firstEvent?.content ?? pendingOrEmptyValue}</div>
        </li>
        <li>
          <div class="key">url</div>
          <div class="value">
            ${
              url
                ? html`<a href=${url} target="_blank">${url}</a>`
                : pendingOrEmptyValue
            }
          </div>
        </li>
        <li class="verified-first">
          <div class="key">verified first</div>
          <div class="value">
            ${
              firstEvent
                ? html`
                    <thv-user-picture
                      .pubkeyEncoded=${firstEvent.pubkeyEncoded}
                      .userEvent=${firstEvent.userEvent}
                      ?trusted=${this.currentUser?.hasTrusted(firstEvent.pubkey)}
                    ></thv-user-picture>
                    <div>
                      <div class="name">${firstEvent.userDisplayName}</div>
                      <div>${firstEvent.createdAtDate.toLocaleString()}</div>
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

      ul li.verified-first .value {
        display: flex;
        gap: 0.5rem;
      }

      ul li.verified-first .value .name {
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
