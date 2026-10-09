const THEME_STORAGE_KEY = "btphoto-theme"

type Theme = "light" | "dark"
type ThemeStorage = Pick<Storage, "getItem" | "setItem">

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => unknown
}

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark"
}

function readStoredTheme(storage: Pick<ThemeStorage, "getItem">): Theme | null {
  try {
    const storedTheme = storage.getItem(THEME_STORAGE_KEY)
    return isTheme(storedTheme) ? storedTheme : null
  } catch {
    return null
  }
}

function resolveTheme(
  storage: Pick<ThemeStorage, "getItem">,
  prefersDark: boolean,
): Theme {
  return readStoredTheme(storage) ?? (prefersDark ? "dark" : "light")
}

function applyTheme(theme: Theme, root: HTMLElement = document.documentElement) {
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

function storeTheme(theme: Theme, storage: Pick<ThemeStorage, "setItem">) {
  try {
    storage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    return
  }
}

function updateThemeButton(button: HTMLButtonElement, theme: Theme) {
  const nextTheme = theme === "dark" ? "világos" : "sötét"
  button.dataset.themeCurrent = theme
  button.setAttribute("aria-label", `Váltás ${nextTheme} témára`)
  button.setAttribute("title", `Váltás ${nextTheme} témára`)
}

function setupThemeToggle(button: HTMLButtonElement) {
  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)")
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const initialTheme = resolveTheme(window.localStorage, colorScheme.matches)

  applyTheme(initialTheme)
  updateThemeButton(button, initialTheme)

  const changeTheme = (theme: Theme) => {
    const commitTheme = () => {
      applyTheme(theme)
      storeTheme(theme, window.localStorage)
      updateThemeButton(button, theme)
    }

    const transitionDocument = document as ViewTransitionDocument
    if (!reducedMotion.matches && transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(commitTheme)
    } else {
      commitTheme()
    }
  }

  button.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme
    changeTheme(currentTheme === "dark" ? "light" : "dark")
  })

  colorScheme.addEventListener("change", (event) => {
    if (readStoredTheme(window.localStorage) === null) {
      const theme = event.matches ? "dark" : "light"
      applyTheme(theme)
      updateThemeButton(button, theme)
    }
  })
}

export {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  setupThemeToggle,
  THEME_STORAGE_KEY,
}
export type { Theme }
