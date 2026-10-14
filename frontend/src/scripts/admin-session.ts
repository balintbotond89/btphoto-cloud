import {
  AuthApiError,
  endSession,
  getCurrentAdmin,
  type AuthenticatedAdmin,
} from "@/api/auth"

type AdminSessionDependencies = {
  loadAdmin: (signal?: AbortSignal) => Promise<AuthenticatedAdmin>
  logout: (signal?: AbortSignal) => Promise<void>
  navigate: (target: string) => void
}

type AdminSessionElements = {
  loading: HTMLElement
  error: HTMLElement
  content: HTMLElement
  username: HTMLElement
  retry: HTMLButtonElement
  logout: HTMLButtonElement
  status: HTMLElement
}

const defaultDependencies: AdminSessionDependencies = {
  loadAdmin: getCurrentAdmin,
  logout: endSession,
  navigate: (target) => window.location.assign(target),
}

function getAdminSessionElements(root: HTMLElement): AdminSessionElements {
  const loading = root.querySelector<HTMLElement>("[data-admin-loading]")
  const error = root.querySelector<HTMLElement>("[data-admin-error]")
  const content = root.querySelector<HTMLElement>("[data-admin-content]")
  const username = root.querySelector<HTMLElement>("[data-admin-username]")
  const retry = root.querySelector<HTMLButtonElement>("[data-action='admin-retry']")
  const logout = root.querySelector<HTMLButtonElement>("[data-action='admin-logout']")
  const status = root.querySelector<HTMLElement>("[data-admin-status]")

  if (!loading || !error || !content || !username || !retry || !logout || !status) {
    throw new Error("Az admin munkamenet-nézet szerkezete hiányos.")
  }

  return { loading, error, content, username, retry, logout, status }
}

function isAuthenticationFailure(error: unknown) {
  return error instanceof AuthApiError && (error.status === 401 || error.status === 403)
}

async function refreshAdminSession(
  root: HTMLElement,
  dependencies: AdminSessionDependencies = defaultDependencies,
  signal?: AbortSignal,
) {
  const elements = getAdminSessionElements(root)
  elements.loading.hidden = false
  elements.error.hidden = true
  elements.content.hidden = true
  elements.status.textContent = ""

  try {
    const admin = await dependencies.loadAdmin(signal)
    elements.username.textContent = admin.username
    elements.loading.hidden = true
    elements.content.hidden = false
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return
    }

    if (isAuthenticationFailure(error)) {
      dependencies.navigate("/login/?reason=session")
      return
    }

    elements.loading.hidden = true
    elements.error.hidden = false
  }
}

async function logoutAdmin(
  root: HTMLElement,
  dependencies: AdminSessionDependencies = defaultDependencies,
  signal?: AbortSignal,
) {
  const elements = getAdminSessionElements(root)
  elements.logout.disabled = true
  elements.status.textContent = "A kijelentkezés folyamatban van."

  try {
    await dependencies.logout(signal)
    dependencies.navigate("/login/?reason=logout")
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return
    }

    if (isAuthenticationFailure(error)) {
      dependencies.navigate("/login/?reason=session")
      return
    }

    elements.status.textContent = "A kijelentkezés nem sikerült. Próbáld újra."
    elements.status.setAttribute("role", "alert")
    elements.logout.disabled = false
  }
}

function mountAdminSession(
  root: HTMLElement,
  dependencies: AdminSessionDependencies = defaultDependencies,
) {
  const elements = getAdminSessionElements(root)
  let controller = new AbortController()

  const refresh = () => {
    controller.abort()
    controller = new AbortController()
    void refreshAdminSession(root, dependencies, controller.signal)
  }
  const handleLogout = () => {
    controller.abort()
    controller = new AbortController()
    void logoutAdmin(root, dependencies, controller.signal)
  }

  elements.retry.addEventListener("click", refresh)
  elements.logout.addEventListener("click", handleLogout)
  refresh()

  return () => {
    controller.abort()
    elements.retry.removeEventListener("click", refresh)
    elements.logout.removeEventListener("click", handleLogout)
  }
}

export { logoutAdmin, mountAdminSession, refreshAdminSession }
export type { AdminSessionDependencies }
