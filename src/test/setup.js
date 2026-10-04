import { afterEach } from 'vitest'

const isBrowserEnv = typeof window !== 'undefined'

if (isBrowserEnv) {
  const { cleanup } = await import('@testing-library/react')
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  // jsdom gaps.
  if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }

  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })
  }

  // jsdom has no layout: scrolling is a no-op (tests can spy on it).
  window.scrollTo = () => {}

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }

  // Minimal EventSource for tests. Tests drive it via FakeEventSource.instances.
  class FakeEventSource {
    static instances = []
    constructor(url) {
      this.url = url
      this.readyState = 0
      this.listeners = {}
      FakeEventSource.instances.push(this)
    }
    addEventListener(type, fn) {
      ;(this.listeners[type] ??= []).push(fn)
    }
    removeEventListener(type, fn) {
      this.listeners[type] = (this.listeners[type] ?? []).filter((f) => f !== fn)
    }
    emit(type, data) {
      if (type === 'open') this.readyState = 1
      const event = type === 'open' || type === 'error' ? new Event(type) : new MessageEvent(type, { data: JSON.stringify(data) })
      ;(this.listeners[type] ?? []).forEach((fn) => fn(event))
      this[`on${type}`]?.(event)
    }
    close() {
      this.readyState = 2
      this.closed = true
    }
  }
  FakeEventSource.CONNECTING = 0
  FakeEventSource.OPEN = 1
  FakeEventSource.CLOSED = 2
  window.EventSource = FakeEventSource
  globalThis.FakeEventSource = FakeEventSource
}
