import HRouter from '@/services/router'
import { afterAll, afterEach, describe, expect, it, vi } from 'vite-plus/test'

// @lit-labs/router reads location when it's imported, before any test runs.
vi.hoisted(() => {
  Object.assign(globalThis, { location: new URL('http://localhost/') })
})

afterAll(() => {
  Reflect.deleteProperty(globalThis, 'location')
})

const ROUTES = [{ path: '/' }, { path: '/publish' }, { path: '/:hash' }]

// the router only adds itself as a controller and requests updates, so the
// host is a stand-in rather than an element.
function buildRouter() {
  const host = { addController: vi.fn(), requestUpdate: vi.fn() }
  const router = new HRouter(host as unknown as ConstructorParameters<typeof HRouter>[0], ROUTES)
  const goto = vi.spyOn(router, 'goto').mockResolvedValue()

  return { router, goto }
}

// stands in for the navigation api, given the history entries as paths.
function buildNavigation({
  entries,
  currentIndex,
}: {
  entries: { path: string; sameDocument?: boolean }[]
  currentIndex: number
}) {
  return {
    currentEntry: { index: currentIndex },
    entries: () =>
      entries.map(({ path, sameDocument = true }) => ({
        url: `http://localhost${path}`,
        sameDocument,
      })),
  }
}

function stubWindow({ navigation }: { navigation?: ReturnType<typeof buildNavigation> } = {}) {
  const history = { pushState: vi.fn(), replaceState: vi.fn(), back: vi.fn() }

  vi.stubGlobal('window', { history, navigation })

  return history
}

describe('HRouter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('navigate', () => {
    it('pushes a history entry and goes to the path', () => {
      const history = stubWindow()
      const { router, goto } = buildRouter()

      router.navigate('/abc')

      expect(history.pushState).toHaveBeenCalledWith({}, '', '/abc')
      expect(goto).toHaveBeenCalledWith('/abc')
    })

    it('replaces the history entry when asked', () => {
      const history = stubWindow()
      const { router } = buildRouter()

      router.navigate('/abc', { replace: true })

      expect(history.replaceState).toHaveBeenCalledWith({}, '', '/abc')
      expect(history.pushState).not.toHaveBeenCalled()
    })

    it('goes back when the previous entry is that page in this document', () => {
      const history = stubWindow({
        navigation: buildNavigation({
          entries: [{ path: '/' }, { path: '/abc' }, { path: '/publish' }],
          currentIndex: 2,
        }),
      })
      const { router, goto } = buildRouter()

      router.navigate('/abc', { replace: true, back: true })

      expect(history.back).toHaveBeenCalledOnce()
      expect(history.replaceState).not.toHaveBeenCalled()
      expect(goto).not.toHaveBeenCalled()
    })

    it.each([
      [
        'the previous entry is another page',
        {
          entries: [{ path: '/def' }, { path: '/publish' }],
          currentIndex: 1,
        },
      ],
      [
        'the previous entry is in another document',
        {
          entries: [{ path: '/abc', sameDocument: false }, { path: '/publish' }],
          currentIndex: 1,
        },
      ],
      ['there is no previous entry', { entries: [{ path: '/publish' }], currentIndex: 0 }],
    ])('navigates instead of going back when %s', (_, navigation) => {
      const history = stubWindow({ navigation: buildNavigation(navigation) })
      const { router, goto } = buildRouter()

      router.navigate('/abc', { replace: true, back: true })

      expect(history.back).not.toHaveBeenCalled()
      expect(history.replaceState).toHaveBeenCalledWith({}, '', '/abc')
      expect(goto).toHaveBeenCalledWith('/abc')
    })

    it('navigates instead of going back without the navigation api', () => {
      const history = stubWindow()
      const { router, goto } = buildRouter()

      router.navigate('/abc', { replace: true, back: true })

      expect(history.back).not.toHaveBeenCalled()
      expect(history.replaceState).toHaveBeenCalledWith({}, '', '/abc')
      expect(goto).toHaveBeenCalledWith('/abc')
    })
  })
})
