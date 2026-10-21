import '@/components/publish/publish'
import '@/components/start/start'
import '@/components/verify/verify'
import { html } from 'lit'

function hAppRoutes() {
  return [
    {
      path: '/',
      render: () => html`<h-start></h-start>`,
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
      render: () => html`<h-publish .file=${this._file}></h-publish>`,
    },
    {
      path: '/:hash',
      render: ({ hash }) => html`
        <h-verify
          .currentUser=${this._currentUser}
          .file=${this._file}
          .hash=${hash}
        ></h-verify>
      `,
    },
  ]
}

export default hAppRoutes
