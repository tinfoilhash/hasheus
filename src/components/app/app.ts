import '@/components/app/app_footer'
import hAppRoutes from '@/components/app/app_routes'
import cssNormalize from '@/components/base/css/css_normalize'
import cssVariables from '@/components/base/css/css_variables'
import type CurrentUser from '@/services/current_user'
import currentUserConnection, { type ChangeDetail } from '@/services/current_user_connection'
import type HFile from '@/services/file'
import HRouter from '@/services/router'
import { css, html, LitElement, type PropertyDeclarations } from 'lit'

class HApp extends LitElement {
  static override properties = {
    _currentUser: { state: true },
    _file: { state: true },
  } satisfies PropertyDeclarations

  declare private _currentUser?: CurrentUser | null
  declare private _file?: HFile

  #router: HRouter = this.#constructRouter()

  #constructRouter() {
    return new HRouter(
      this,
      hAppRoutes({
        getCurrentUser: () => this._currentUser,
        getFile: () => this._file,
        navigate: (path, options) => this.#router.navigate(path, options),
      }),
    )
  }

  override connectedCallback() {
    super.connectedCallback()

    currentUserConnection.addEventListener('change', this.#setCurrentUserFromConnection)
    void currentUserConnection.connect({ ignoreNoPubkeyError: true })

    this.addEventListener('h-file', this.#setFileFromEvent)
    this.addEventListener('h-navigate', this.#navigateFromEvent)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()

    currentUserConnection.removeEventListener('change', this.#setCurrentUserFromConnection)

    this.removeEventListener('h-file', this.#setFileFromEvent)
    this.removeEventListener('h-navigate', this.#navigateFromEvent)
  }

  #setCurrentUserFromConnection = (event: CustomEvent<ChangeDetail>) => {
    this._currentUser = event.detail.currentUser
  }

  #setFileFromEvent = (event: HTMLElementEventMap['h-file']) => {
    const { detail: file } = event

    this._file = file
    this.#router.navigate(`/${file.hash}`)
  }

  #navigateFromEvent = (event: HTMLElementEventMap['h-navigate']) => {
    const { url, replace, back } = event.detail

    this.#router.navigate(url, { replace, back })
  }

  override render() {
    return html`
      <main>${this.#router.outlet()}</main>
      <h-app-footer></h-app-footer>
    `
  }

  static override styles = [
    cssNormalize,
    cssVariables,
    css`
      :host {
        display: block;
        padding: 1.25rem;
        font-family: var(--h-font-mono);
        color: var(--h-color-100);
        background: var(--h-color-900);
      }

      main,
      h-app-footer {
        max-width: var(--h-page-width);
        margin-inline: auto;
      }

      /* the same space as between the start page's sections. */
      h-app-footer {
        margin-top: 2.5rem;
      }

      @media (width >= 40rem) {
        :host {
          padding: 2rem;
        }
      }

      @media (width >= 48rem) {
        h-app-footer {
          margin-top: 3rem;
        }
      }
    `,
  ]
}

customElements.define('h-app', HApp)

declare global {
  interface HTMLElementTagNameMap {
    'h-app': HApp
  }
}

export default HApp
