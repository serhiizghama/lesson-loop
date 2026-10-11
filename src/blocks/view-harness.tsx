// Shared by the view tests: a root to render into and a speech double that records calls.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { vi } from 'vitest'
import type { Speech } from '@/speech/speech'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

export function fakeSpeech(): Speech {
  return {
    speak: vi.fn(),
    quiet: false,
    enable: vi.fn(),
    getState: () => ({ status: 'working', speaking: false, enableAttempted: false }),
    subscribe: () => () => {},
    cancel: vi.fn(),
    preload: vi.fn(),
  }
}

/** A mounted root; `render` re-renders in place, so a test can show a transition. */
export function mount() {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  return {
    container,
    render: (node: React.ReactNode) => act(() => root.render(node)),
    click: (el: Element | undefined) => act(() => (el as HTMLElement).click()),
    button: (text: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text)),
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}
