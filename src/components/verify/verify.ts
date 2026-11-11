import '@/components/app/app_current_user'
import '@/components/app/app_header'
import '@/components/base/button'
import cssNormalize from '@/components/base/css/css_normalize'
import cssPage from '@/components/base/css/css_page'
import '@/components/base/error'
import '@/components/base/hash'
import '@/components/base/spinner'
import '@/components/base/status'
import '@/components/base/tag'
import '@/components/base/user_picture'
import type CurrentUser from '@/services/current_user'
import type HFile from '@/services/file'
import type FileEvent from '@/services/file_event'
import FileSubscriber from '@/services/file_subscriber'
import verificationSorter from '@/services/verification_sorter'
import { Task, TaskStatus } from '@lit/task'
import { css, html, LitElement, nothing, type PropertyDeclarations, type TemplateResult } from 'lit'

class HVerify extends LitElement {
  static UNKNOWN_FILE_NAME = 'unknown.ext'

  static override properties = {
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

  override disconnectedCallback() {
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

  // only counts the connected user's own verification, so switching accounts
  // after publishing doesn't carry it over to someone else.
  get #hasCurrentUserVerified() {
    const pubkey = this.currentUser?.pubkey

    if (pubkey === undefined) {
      return false
    }

    const publishedPubkey = this.#isFileForHash ? this.file?.publishedFileEvent?.pubkey : undefined

    return publishedPubkey === pubkey || this._events.some((event) => event.pubkey === pubkey)
  }

  get #canPublish() {
    return this.#isFileForHash && !this.file?.hasBeenPublished && !this.#hasCurrentUserVerified
  }

  #renderUnknownTag(isUnknown: boolean) {
    return isUnknown
      ? html`<h-tag kind="unknown" data-testid="unknown-tag">unknown</h-tag>`
      : nothing
  }

  #renderTrustedTag(isTrusted: boolean) {
    return isTrusted
      ? html`<h-tag kind="trusted" data-testid="trusted-tag">trusted</h-tag>`
      : nothing
  }

  // the source is one of the agreeing verifiers, so only others are counted.
  #renderAgreementTag(agreementCount: number) {
    const otherCount = agreementCount - 1

    return otherCount > 0
      ? html`<h-tag kind="trusted" data-testid="agreement-tag">+${otherCount} trusted</h-tag>`
      : nothing
  }

  #renderVerifierList(events: FileEvent[], { emptyValue }: { emptyValue: TemplateResult }) {
    if (!events.length) {
      return emptyValue
    }

    return html`
      <ol class="pictures">
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

  override render() {
    const isPending = this.#subscribeTask.status === TaskStatus.PENDING
    const { trustedEvents, unknownEvents, source } = verificationSorter({
      events: this._events,
      currentUser: this.currentUser,
    })
    const { event: sourceEvent, isTrusted, agreementCount } = source
    // labeled whenever it shows, even while loading, so an unknown source is
    // never shown unlabeled.
    const isUnknown = Boolean(sourceEvent) && !isTrusted
    const description = sourceEvent?.descriptionTrimmed
    const pendingOrEmptyValue = isPending ? html`<h-spinner></h-spinner>` : html`&mdash;`
    // with no verification to describe it, the file you just chose is named
    // instead, muted so it isn't mistaken for someone's description.
    const fileName = !sourceEvent && this.#isFileForHash ? this.file?.name : undefined
    const fallbackHeading =
      fileName || (isPending ? html`<h-spinner></h-spinner>` : HVerify.UNKNOWN_FILE_NAME)

    return html`
      <section class="head margined">
        <h-app-header></h-app-header>
        <div class="body">
          <h2 class=${description ? nothing : 'empty'} data-testid="description">
            ${description || fallbackHeading}
          </h2>
          <div class="status" role="status">
            ${this.#renderStatus({
              sourceEvent,
              isPending,
              isUnknown,
              trustedCount: trustedEvents.length,
            })}
          </div>
          ${this.#subscribeTask.render({
            error: (error) =>
              html`<h-error data-testid="subscribe-error" .error=${error}></h-error>`,
          })}
          <div class="actions">
            ${
              this.#canPublish
                ? html`<h-button
                    ><a href="/publish" data-testid="add-verification-link"
                      >add your verification</a
                    ></h-button
                  >`
                : nothing
            }
            <h-app-current-user></h-app-current-user>
          </div>
        </div>
      </section>
      <dl>
        ${this.#renderField('file hash', html`<h-hash data-testid="file-hash" .hash=${this.hash}></h-hash>`)}
        ${this.#renderField(
          'link',
          html`
            ${this.#renderTags(
              this.#renderUnknownTag(isUnknown),
              this.#renderAgreementTag(agreementCount),
            )}
            <div data-testid="url">${this.#renderURL(sourceEvent?.url) ?? pendingOrEmptyValue}</div>
          `,
        )}
        ${this.#renderField(
          'source',
          html`<div class="source" data-testid="source">
            ${sourceEvent ? this.#renderSource(sourceEvent, isUnknown, isTrusted) : pendingOrEmptyValue}
          </div>`,
        )}
        ${this.#renderField(
          'trusted',
          html`<div data-testid="trusted-verifiers">
            ${this.#renderVerifierList(trustedEvents, { emptyValue: pendingOrEmptyValue })}
          </div>`,
        )}
        ${this.#renderField(
          'unknown',
          this.#renderVerifierList(unknownEvents, { emptyValue: pendingOrEmptyValue }),
        )}
      </dl>
    `
  }

  // a status shows as soon as there's something to say, even while still
  // loading, so an unknown source's description is never shown unlabeled.
  #renderStatus({
    sourceEvent,
    isPending,
    isUnknown,
    trustedCount,
  }: {
    sourceEvent: FileEvent | undefined
    isPending: boolean
    isUnknown: boolean
    trustedCount: number
  }) {
    if (this.#hasCurrentUserVerified) {
      return html`
        <h-status color="green" data-testid="verified-status">you've verified this file</h-status>
      `
    }

    if (isUnknown) {
      return html`
        <h-status color="yellow" data-testid="unknown-status">
          ${
            this.currentUser
              ? 'no one you follow has verified this file;'
              : 'connect to see if anyone you follow has verified this file;'
          }
          its description, link, and source come from an unknown verifier
        </h-status>
      `
    }

    if (sourceEvent) {
      return html`
        <h-status color="green" data-testid="trusted-status">
          ${trustedCount === 1 ? '1 person' : `${trustedCount} people`} you follow verified this
          file
        </h-status>
      `
    }

    if (isPending) {
      return html`<h-status>looking up verifications…</h-status>`
    }

    // the error explains itself, and there's no telling whether anyone verified it.
    if (this.#subscribeTask.status === TaskStatus.ERROR) {
      return nothing
    }

    return html`
      <h-status data-testid="not-verified-status">no one has verified this file yet</h-status>
    `
  }

  #renderField(label: string, value: unknown) {
    return html`
      <div class="field margined">
        <dt>${label}</dt>
        <dd>${value}</dd>
      </div>
    `
  }

  #renderURL(url: string | null | undefined) {
    return url ? html`<a href=${url} target="_blank">${url}</a>` : undefined
  }

  #renderTags(...tags: unknown[]) {
    return html`<div class="tags">${tags}</div>`
  }

  #renderSource(sourceEvent: FileEvent, isUnknown: boolean, isTrusted: boolean) {
    return html`
      <h-user-picture
        .pubkeyEncoded=${sourceEvent.pubkeyEncoded}
        .userEvent=${sourceEvent.userEvent}
      ></h-user-picture>
      <div>
        <div class="name">
          ${sourceEvent.userDisplayName}
          ${this.#renderUnknownTag(isUnknown)}${this.#renderTrustedTag(isTrusted)}
        </div>
        <div class="date">${sourceEvent.createdAtLocaleString}</div>
      </div>
    `
  }

  static override styles = [
    cssNormalize,
    cssPage,
    css`
      h2.empty {
        color: var(--h-color-500);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: flex-start;
      }

      /* a long name truncates rather than widening the page past the screen. */
      h-app-current-user {
        min-width: 0;
        max-width: 100%;
      }

      .tags:not(:empty) {
        margin-bottom: 0.25rem;
      }

      .source {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }

      .source h-user-picture {
        flex: none;
      }

      /* a set gap, rather than a space, between the name and its tag. */
      .name {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }

      .date {
        font-size: 0.875rem;
        line-height: 1.375rem;
        color: var(--h-color-400);
      }

      .pictures {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0;
        list-style: none;
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
