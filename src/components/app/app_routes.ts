import '@/components/publish/publish'
import '@/components/start/start'
import '@/components/verify/verify'
import type { RouteConfig } from '@lit-labs/router'
import type CurrentUser from '@/services/current_user'
import type HFile from '@/services/file'
import type HRouter from '@/services/router'
import { html } from 'lit'

function hAppRoutes({
  getCurrentUser,
  getFile,
  navigate,
}: {
  getCurrentUser: () => CurrentUser | null | undefined
  getFile: () => HFile | undefined
  navigate: HRouter['navigate']
}): RouteConfig[] {
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
        const file = getFile()

        if (!file) {
          navigate('/', { replace: true })
          return false
        }

        if (file.hasBeenPublished) {
          navigate(`/${file.hash}`, { replace: true })
          return false
        }

        return true
      },
      render: () => html`
        <h-publish .currentUser=${getCurrentUser()} .file=${getFile()}></h-publish>
      `,
    },
    {
      path: '/:hash',
      render: ({ hash }) => html`
        <h-verify .currentUser=${getCurrentUser()} .file=${getFile()} .hash=${hash}></h-verify>
      `,
    },
  ]
}

export default hAppRoutes
