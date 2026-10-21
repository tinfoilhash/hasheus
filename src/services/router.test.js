import HRouter from '@/services/router'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

// @lit-labs/router reads location when it's imported, before any test runs.
vi.hoisted(() => {
  globalThis.location = new URL('http://localhost/')
})

afterAll(() => {
  delete globalThis.location
})

const ROUTES = [{ path: '/' }, { path: '/publish' }, { path: '/:hash' }]

function buildRouter() {
  const router = new HRouter(
    { addController: vi.fn(), requestUpdate: vi.fn() },
    ROUTES,
  )

  vi.spyOn(router, 'goto').mockResolvedValue()

  return router
}

// stands in for the navigation api, given the history entries as paths.
function buildNavigation({ entries, currentIndex }) {
  return {
    currentEntry: { index: currentIndex },
    entries: () =>
      entries.map(({ path, sameDocument = true }) => ({
        url: `http://localhost${path}`,
        sameDocument,
      })),
  }
}

describe('HRouter', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      history: { pushState: vi.fn(), replaceState: vi.fn(), back: vi.fn() },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('navigate', () => {
    it('pushes a history entry and goes to the path', () => {
      const router = buildRouter()

      router.navigate('/abc')

      expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/abc')
      expect(router.goto).toHaveBeenCalledWith('/abc')
    })

    it('replaces the history entry when asked', () => {
      const router = buildRouter()

      router.navigate('/abc', { replace: true })

      expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '/abc')
      expect(window.history.pushState).not.toHaveBeenCalled()
    })

    it('goes back when the previous entry is that page in this document', () => {
      window.navigation = buildNavigation({
        entries: [{ path: '/' }, { path: '/abc' }, { path: '/publish' }],
        currentIndex: 2,
      })

      const router = buildRouter()

      router.navigate('/abc', { replace: true, back: true })

      expect(window.history.back).toHaveBeenCalledOnce()
      expect(window.history.replaceState).not.toHaveBeenCalled()
      expect(router.goto).not.toHaveBeenCalled()
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
          entries: [
            { path: '/abc', sameDocument: false },
            { path: '/publish' },
          ],
          currentIndex: 1,
        },
      ],
      [
        'there is no previous entry',
        { entries: [{ path: '/publish' }], currentIndex: 0 },
      ],
    ])('navigates instead of going back when %s', (_, navigation) => {
      window.navigation = buildNavigation(navigation)

      const router = buildRouter()

      router.navigate('/abc', { replace: true, back: true })

      expect(window.history.back).not.toHaveBeenCalled()
      expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '/abc')
      expect(router.goto).toHaveBeenCalledWith('/abc')
    })

    it('navigates instead of going back without the navigation api', () => {
      const router = buildRouter()

      router.navigate('/abc', { replace: true, back: true })

      expect(window.history.back).not.toHaveBeenCalled()
      expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '/abc')
      expect(router.goto).toHaveBeenCalledWith('/abc')
    })
  })
})
