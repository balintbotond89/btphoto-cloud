import { describe, expect, it, vi } from "vitest"

import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  setupThemeToggle,
  THEME_STORAGE_KEY,
} from "@/lib/theme"

function createMediaQuery(matches: boolean): MediaQueryList {
  return {
    matches,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
}

describe("theme", () => {
  it("a mentett témát részesíti előnyben", () => {
    const storage = { getItem: vi.fn().mockReturnValue("light") }

    expect(resolveTheme(storage, true)).toBe("light")
    expect(storage.getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY)
  })

  it("mentett érték nélkül a rendszerbeállítást követi", () => {
    const storage = { getItem: vi.fn().mockReturnValue(null) }

    expect(resolveTheme(storage, true)).toBe("dark")
    expect(resolveTheme(storage, false)).toBe("light")
  })

  it("figyelmen kívül hagyja az ismeretlen tárolt értéket", () => {
    const storage = { getItem: vi.fn().mockReturnValue("sepia") }

    expect(readStoredTheme(storage)).toBeNull()
  })

  it("a DOM-on és a böngésző színsémáján is alkalmazza a témát", () => {
    applyTheme("dark")

    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(document.documentElement.style.colorScheme).toBe("dark")
  })

  it("a kézi témaváltást alkalmazza és megőrzi", () => {
    const button = document.createElement("button")
    document.body.append(button)
    const colorScheme = createMediaQuery(false)
    const reducedMotion = createMediaQuery(false)
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) =>
        query.includes("prefers-color-scheme") ? colorScheme : reducedMotion,
      ),
    )
    localStorage.setItem(THEME_STORAGE_KEY, "light")

    setupThemeToggle(button)
    button.click()

    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")
    expect(button.getAttribute("aria-label")).toBe("Váltás világos témára")
  })
})
