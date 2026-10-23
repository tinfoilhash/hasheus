import cssNormalize from '@/components/base/css/css_normalize'
import { css, html, LitElement } from 'lit'

class HUserPicture extends LitElement {
  static properties = {
    pubkeyEncoded: { attribute: false },
    userEvent: { attribute: false },
  }

  render() {
    return html`
      <a href=${`https://njump.to/${this.pubkeyEncoded}`} target="_blank">
        ${
          this.userEvent?.picture
            ? html`<img
                src=${this.userEvent.picture}
                alt=${this.userEvent.displayName}
              />`
            : html`
                <div class="text">
                  <span class="display-name"
                    >${this.userEvent?.displayName}</span
                  ><span>${this.pubkeyEncoded}</span>
                </div>
              `
        }
      </a>
    `
  }

  static styles = [
    cssNormalize,
    css`
      :host {
        display: block;
        width: 3.5rem;
        height: 3.5rem;
      }

      a {
        display: block;
        width: 100%;
        height: 100%;
        overflow: hidden;
        text-decoration: none;
        border: 2px solid var(--h-color-700);
      }

      a img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      a .text {
        padding: 0.125rem;
        font-size: 0.625rem;
        color: var(--h-color-700);
        text-align: center;
        word-break: break-all;
      }

      a .text .display-name {
        color: var(--h-color-600);
      }
    `,
  ]
}

customElements.define('h-user-picture', HUserPicture)

export default HUserPicture
