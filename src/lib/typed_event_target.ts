type EventListenerFor<TEvent> = (event: TEvent) => void

type AnyEventListener = EventListenerOrEventListenerObject | EventListenerFor<never> | null

// an EventTarget whose listeners are typed by an event map, the way the dom types
// elements' events with HTMLElementEventMap.
class TypedEventTarget<TEventMap extends Record<string, Event>> extends EventTarget {
  override addEventListener<TType extends keyof TEventMap & string>(
    type: TType,
    listener: EventListenerFor<TEventMap[TType]>,
    options?: boolean | AddEventListenerOptions,
  ): void
  override addEventListener(...args: Parameters<EventTarget['addEventListener']>): void
  override addEventListener(
    type: string,
    listener: AnyEventListener,
    options?: boolean | AddEventListenerOptions,
  ) {
    // the overloads match each listener to its event type, which the dom can't.
    super.addEventListener(type, listener as EventListener | null, options)
  }

  override removeEventListener<TType extends keyof TEventMap & string>(
    type: TType,
    listener: EventListenerFor<TEventMap[TType]>,
    options?: boolean | EventListenerOptions,
  ): void
  override removeEventListener(...args: Parameters<EventTarget['removeEventListener']>): void
  override removeEventListener(
    type: string,
    listener: AnyEventListener,
    options?: boolean | EventListenerOptions,
  ) {
    super.removeEventListener(type, listener as EventListener | null, options)
  }
}

export default TypedEventTarget
