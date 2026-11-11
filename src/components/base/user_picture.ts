import cssNormalize from '@/components/base/css/css_normalize'
import type UserEvent from '@/services/user_event'
import { css, html, LitElement, type PropertyDeclarations } from 'lit'

class HUserPicture extends LitElement {
  static override properties = {
    pubkeyEncoded: { attribute: false },
    userEvent: { attribute: false },
  } satisfies PropertyDeclarations

  declare pubkeyEncoded?: string
  declare userEvent?: UserEvent | null

  // names can be copied, so the label pairs it with the start of the key.
  get #label() {
    const { userEvent, pubkeyEncoded } = this

    if (!userEvent) {
      return pubkeyEncoded ?? ''
    }

    const { displayName, pubkeyEncodedTruncated } = userEvent

    return displayName === pubkeyEncodedTruncated
      ? displayName
      : `${displayName} (${pubkeyEncodedTruncated})`
  }

  override render() {
    return html`
      <a href=${`https://njump.to/${this.pubkeyEncoded}`} target="_blank" aria-label=${this.#label}>
        ${
          this.userEvent?.picture
            ? html`<img src=${this.userEvent.picture} alt=${this.userEvent.displayName} />`
            : html`
                <div class="text">
                  <span class="display-name">${this.userEvent?.displayName}</span
                  ><span>${this.pubkeyEncoded}</span>
                </div>
              `
        }
      </a>
    `
  }

  static override styles = [
    cssNormalize,
    css`
      :host {
        display: block;
        width: 3.125rem;
        height: 3.125rem;
      }

      a {
        display: block;
        width: 100%;
        height: 100%;
        overflow: hidden;
        text-decoration: none;
        border: 1px solid var(--h-color-600);
      }

      a img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      a .text {
        padding: 0.125rem;
        font-family: var(--h-font-mono);
        font-size: 0.625rem;
        line-height: 0.75rem;
        color: var(--h-color-400);
        text-align: center;
        word-break: break-all;
      }

      a .text .display-name {
        color: var(--h-color-200);
      }
    `,
  ]
}

customElements.define('h-user-picture', HUserPicture)

declare global {
  interface HTMLElementTagNameMap {
    'h-user-picture': HUserPicture
  }
}

export default HUserPicture
