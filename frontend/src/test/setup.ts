import { afterEach, vi } from "vitest"

afterEach(() => {
  document.body.replaceChildren()
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
