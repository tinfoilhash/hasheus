import '@/components/base/button'
import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/error'
import currentUserConnection from '@/services/current_user_connection'
import { css, html, LitElement, nothing } from 'lit'

class HAppCurrentUser extends LitElement {
  constructor() {
    super()

    this._requestUpdateOnConnectionChange =
      this._requestUpdateOnConnectionChange.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()

    currentUserConnection.addEventListener(
      'change',
      this._requestUpdateOnConnectionChange,
    )
  }

  disconnectedCallback() {
    super.disconnectedCallback()

    currentUserConnection.removeEventListener(
      'change',
      this._requestUpdateOnConnectionChange,
    )
  }

  _requestUpdateOnConnectionChange() {
    this.requestUpdate()
  }

  _connectOrDisconnect() {
    if (currentUserConnection.currentUser) {
      currentUserConnection.disconnect()
    } else {
      currentUserConnection.connect({ canAskForPubkey: true })
    }
  }

  render() {
    const { currentUser, error } = currentUserConnection

    return html`
      <h-button ?pending=${currentUserConnection.isPending}>
        <button
          data-testid="connect-button"
          ?disabled=${currentUserConnection.isPending}
          @click=${this._connectOrDisconnect}
        >
          ${
            currentUser
              ? `connected: ${currentUser.userEvent.displayName}`
              : 'connect'
          }
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

export default HAppCurrentUser
