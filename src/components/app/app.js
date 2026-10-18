import '@/components/app/app_header'
import thvAppRoutes from '@/components/app/app_routes'
import cssNormalize from '@/components/base/css/css_normalize'
import cssVariables from '@/components/base/css/css_variables'
import currentUserConnection from '@/services/current_user_connection'
import THVRouter from '@/services/router'
import { css, html, LitElement } from 'lit'

class THVApp extends LitElement {
  static properties = {
    _currentUser: { state: true },
    _file: { state: true },
  }

  _router = this._constructRouter()

  constructor() {
    super()

    this._setCurrentUserFromConnection =
      this._setCurrentUserFromConnection.bind(this)
    this._setFileFromEvent = this._setFileFromEvent.bind(this)
    this._navigateFromEvent = this._navigateFromEvent.bind(this)
  }

  _constructRouter() {
    return new THVRouter(this, thvAppRoutes.call(this))
  }

  connectedCallback() {
    super.connectedCallback()

    currentUserConnection.addEventListener(
      'change',
      this._setCurrentUserFromConnection,
    )
    currentUserConnection.connect({ ignoreNoPubkeyError: true })

    this.addEventListener('thv-file', this._setFileFromEvent)
    this.addEventListener('thv-navigate', this._navigateFromEvent)
  }

  disconnectedCallback() {
    super.disconnectedCallback()

    currentUserConnection.removeEventListener(
      'change',
      this._setCurrentUserFromConnection,
    )

    this.removeEventListener('thv-file', this._setFileFromEvent)
    this.removeEventListener('thv-navigate', this._navigateFromEvent)
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('_file') && this._file) {
      this._router.navigate(`/${this._file.hash}`)
    }
  }

  _setCurrentUserFromConnection(event) {
    this._currentUser = event.detail.currentUser
  }

  _setFileFromEvent(event) {
    this._file = event.detail
  }

  _navigateFromEvent(event) {
    const { url, replace, back } = event.detail

    this._router.navigate(url, { replace, back })
  }

  render() {
    return html`
      <thv-app-header></thv-app-header>
      <main>${this._router.outlet()}</main>
    `
  }

  static styles = [
    cssNormalize,
    cssVariables,
    css`
      :host {
        display: block;
        padding: 1.25rem;
        font-family:
          ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas,
          'DejaVu Sans Mono', monospace;
        color: var(--thv-color-100);
        background: var(--thv-color-900);
      }

      @media (width >= 40rem) {
        :host {
          padding: 2rem;
        }
      }
    `,
  ]
}

customElements.define('thv-app', THVApp)

export default THVApp
