import TypedEventTarget from '@/lib/typed_event_target'
import { describe, expect, it, vi } from 'vite-plus/test'

class Counter extends TypedEventTarget<{ change: CustomEvent<number> }> {
  change(count: number) {
    this.dispatchEvent(new CustomEvent('change', { detail: count }))
  }
}

describe('TypedEventTarget', () => {
  it('calls a listener with the dispatched event', () => {
    const counter = new Counter()
    const listener = vi.fn((event: CustomEvent<number>) => event.detail)

    counter.addEventListener('change', listener)
    counter.change(1)

    expect(listener).toHaveReturnedWith(1)
  })

  it('stops calling a removed listener', () => {
    const counter = new Counter()
    const listener = vi.fn()

    counter.addEventListener('change', listener)
    counter.removeEventListener('change', listener)
    counter.change(1)

    expect(listener).not.toHaveBeenCalled()
  })

  it('passes options through', () => {
    const counter = new Counter()
    const listener = vi.fn()

    counter.addEventListener('change', listener, { once: true })
    counter.change(1)
    counter.change(2)

    expect(listener).toHaveBeenCalledOnce()
  })

  it("rejects a listener for another event's type", () => {
    const counter = new Counter()

    // @ts-expect-error the change event's detail is a number, not a string.
    counter.addEventListener('change', (event: CustomEvent<string>) => event.detail)
  })
})
