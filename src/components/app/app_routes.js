import '@/components/publish/publish'
import '@/components/start/start'
import '@/components/verify/verify'
import { html } from 'lit'

function thvAppRoutes() {
  return [
    {
      path: '/',
      render: () => html`<thv-start></thv-start>`,
    },
    {
      path: '/publish',
      // redirects replace the history entry so the back button doesn't land on
      // this page again and redirect forward in a loop.
      enter: () => {
        if (!this._file) {
          this._router.navigate('/', { replace: true })
          return false
        }

        if (this._file.hasBeenPublished) {
          this._router.navigate(`/${this._file.hash}`, { replace: true })
          return false
        }

        return true
      },
      render: () => html`<thv-publish .file=${this._file}></thv-publish>`,
    },
    {
      path: '/:hash',
      render: ({ hash }) => html`
        <thv-verify
          .currentUser=${this._currentUser}
          .file=${this._file}
          .hash=${hash}
        ></thv-verify>
      `,
    },
  ]
}

export default thvAppRoutes
