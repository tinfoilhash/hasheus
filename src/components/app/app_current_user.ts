import '@/components/base/button'
import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/error'
import currentUserConnection from '@/services/current_user_connection'
import { css, html, LitElement, nothing } from 'lit'

class HAppCurrentUser extends LitElement {
  connectedCallback() {
    super.connectedCallback()

    currentUserConnection.addEventListener('change', this.#requestUpdateOnConnectionChange)
  }

  disconnectedCallback() {
    super.disconnectedCallback()

    currentUserConnection.removeEventListener('change', this.#requestUpdateOnConnectionChange)
  }

  #requestUpdateOnConnectionChange = () => {
    this.requestUpdate()
  }

  #connectOrDisconnect = () => {
    if (currentUserConnection.currentUser) {
      currentUserConnection.disconnect()
    } else {
      void currentUserConnection.connect({ canAskForPubkey: true })
    }
  }

  render() {
    const { currentUser, error } = currentUserConnection

    return html`
      <h-button ?pending=${currentUserConnection.isPending}>
        <button
          data-testid="connect-button"
          ?disabled=${currentUserConnection.isPending}
          @click=${this.#connectOrDisconnect}
        >
          ${currentUser ? `connected: ${currentUser.userEvent.displayName}` : 'connect'}
        </button>
      </h-button>
      ${error ? html`<h-error data-testid="connect-error" .error=${error}></h-error>` : nothing}
    `
  }

  static styles = [
    cssNormalize,
    css`
      :host {
        display: block;
      }

      h-error {
        margin-top: 0.5rem;
      }
    `,
  ]
}

customElements.define('h-app-current-user', HAppCurrentUser)

declare global {
  interface HTMLElementTagNameMap {
    'h-app-current-user': HAppCurrentUser
  }
}

export default HAppCurrentUser
