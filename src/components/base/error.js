import cssNormalize from '@/components/base/css/css_normalize'
import '@/components/base/status'
import { css, html, LitElement } from 'lit'

class THVError extends LitElement {
  static properties = {
    error: { attribute: false },
  }

  render() {
    return html`
      <thv-status color="red">
        <strong>an error occurred!</strong>
        ${String(this.error?.message ?? this.error).toLowerCase()}
      </thv-status>
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

customElements.define('thv-error', THVError)

export default THVError
