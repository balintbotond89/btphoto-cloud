import {
  authenticate,
  AuthApiError,
  getCsrfToken,
  type AuthenticatedAdmin,
  type CsrfTokenResponse,
  type LoginCredentials,
} from "@/api/auth"

const INVALID_CREDENTIALS_MESSAGE = "A megadott hitelesítési adatok érvénytelenek."
const SERVICE_UNAVAILABLE_MESSAGE =
  "A bejelentkezési szolgáltatás jelenleg nem érhető el. Próbáld újra később."

type LoginDependencies = {
  loadCsrf: (signal?: AbortSignal) => Promise<CsrfTokenResponse>
  authenticateAdmin: (
    credentials: LoginCredentials,
    csrfToken: CsrfTokenResponse,
    signal?: AbortSignal,
  ) => Promise<AuthenticatedAdmin>
  navigate: (target: string) => void
}

type LoginElements = {
  form: HTMLFormElement
  identifier: HTMLInputElement
  password: HTMLInputElement
  submit: HTMLButtonElement
  status: HTMLElement
}

const defaultDependencies: LoginDependencies = {
  loadCsrf: getCsrfToken,
  authenticateAdmin: authenticate,
  navigate: (target) => window.location.assign(target),
}

function getLoginElements(root: HTMLElement): LoginElements {
  const form = root.querySelector<HTMLFormElement>("[data-login-form]")
  const identifier = root.querySelector<HTMLInputElement>("[name='identifier']")
  const password = root.querySelector<HTMLInputElement>("[name='password']")
  const submit = root.querySelector<HTMLButtonElement>("[data-action='login-submit']")
  const status = root.querySelector<HTMLElement>("[data-login-status]")

  if (!form || !identifier || !password || !submit || !status) {
    throw new Error("A bejelentkezési űrlap szerkezete hiányos.")
  }

  return { form, identifier, password, submit, status }
}

function renderStatus(
  status: HTMLElement,
  message: string,
  tone: "neutral" | "success" | "error" = "neutral",
) {
  status.textContent = message
  status.dataset.tone = tone
  status.setAttribute("role", tone === "error" ? "alert" : "status")
}

function setBusy(elements: LoginElements, busy: boolean) {
  elements.form.setAttribute("aria-busy", String(busy))
  elements.submit.disabled = busy
  elements.identifier.readOnly = busy
  elements.password.readOnly = busy
  elements.submit.textContent = busy ? "Ellenőrzés…" : "Bejelentkezés"
}

function renderLoginReason(root: HTMLElement, reason: string | null) {
  const { status } = getLoginElements(root)

  if (reason === "session") {
    renderStatus(status, "A munkamenet lejárt vagy bejelentkezés szükséges.", "error")
  } else if (reason === "logout") {
    renderStatus(status, "A kijelentkezés sikeres.", "success")
  }
}

async function submitLoginForm(
  root: HTMLElement,
  dependencies: LoginDependencies = defaultDependencies,
  signal?: AbortSignal,
) {
  const elements = getLoginElements(root)

  if (root.dataset.submitting === "true") {
    return
  }

  if (!elements.form.checkValidity()) {
    renderStatus(elements.status, "Töltsd ki a felhasználónevet és a jelszót.", "error")
    elements.form.reportValidity()
    return
  }

  root.dataset.submitting = "true"
  renderStatus(elements.status, "A hitelesítési adatok ellenőrzése folyamatban van.")
  setBusy(elements, true)

  try {
    const csrfToken = await dependencies.loadCsrf(signal)
    await dependencies.authenticateAdmin(
      {
        identifier: elements.identifier.value.trim(),
        password: elements.password.value,
      },
      csrfToken,
      signal,
    )
    dependencies.navigate("/admin/")
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return
    }

    const message =
      error instanceof AuthApiError && (error.status === 400 || error.status === 401)
        ? INVALID_CREDENTIALS_MESSAGE
        : SERVICE_UNAVAILABLE_MESSAGE
    renderStatus(elements.status, message, "error")
  } finally {
    elements.password.value = ""
    root.dataset.submitting = "false"
    setBusy(elements, false)
  }
}

function mountLoginForm(
  root: HTMLElement,
  dependencies: LoginDependencies = defaultDependencies,
) {
  const { form } = getLoginElements(root)
  let controller: AbortController | undefined

  renderLoginReason(root, new URLSearchParams(window.location.search).get("reason"))

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    if (root.dataset.submitting === "true") {
      return
    }

    controller = new AbortController()
    void submitLoginForm(root, dependencies, controller.signal)
  }

  form.addEventListener("submit", handleSubmit)

  return () => {
    controller?.abort()
    form.removeEventListener("submit", handleSubmit)
  }
}

export { mountLoginForm, renderLoginReason, submitLoginForm }
export type { LoginDependencies }
