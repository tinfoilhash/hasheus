import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/status'
import { css, html, LitElement } from 'lit'

class HError extends LitElement {
  static properties = {
    error: { attribute: false },
  }

  render() {
    return html`
      <h-status color="red">
        <strong>an error occurred!</strong>
        ${String(this.error?.message ?? this.error).toLowerCase()}
      </h-status>
    `
  }

  static styles = [
    cssNormalize,
    css`
      :host {
        display: block;
      }
    `,
  ]
}

customElements.define('h-error', HError)

export default HError
