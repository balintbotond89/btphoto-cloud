import { describe, expect, it, vi } from "vitest"

import { AuthApiError, type CsrfTokenResponse } from "@/api/auth"
import {
  renderLoginReason,
  submitLoginForm,
  type LoginDependencies,
} from "@/scripts/login-form"

const CSRF_TOKEN: CsrfTokenResponse = {
  headerName: "X-CSRF-TOKEN",
  parameterName: "_csrf",
  token: "test-token",
}

function createLoginForm() {
  document.body.innerHTML = `
    <section data-login-form-root>
      <form data-login-form>
        <input name="identifier" required value="admin">
        <input name="password" type="password" required value="secret">
        <button type="submit" data-action="login-submit">Bejelentkezés</button>
      </form>
      <p data-login-status role="status"></p>
    </section>
  `

  const root = document.querySelector<HTMLElement>("[data-login-form-root]")
  if (!root) {
    throw new Error("A tesztűrlap nem jött létre.")
  }
  return root
}

function createDependencies(
  overrides: Partial<LoginDependencies> = {},
): LoginDependencies {
  return {
    loadCsrf: vi.fn().mockResolvedValue(CSRF_TOKEN),
    authenticateAdmin: vi.fn().mockResolvedValue({ username: "admin" }),
    navigate: vi.fn(),
    ...overrides,
  }
}

describe("login form", () => {
  it("CSRF tokennel bejelentkezik és fix admin útvonalra irányít", async () => {
    const root = createLoginForm()
    const dependencies = createDependencies()

    await submitLoginForm(root, dependencies)

    expect(dependencies.loadCsrf).toHaveBeenCalledOnce()
    expect(dependencies.authenticateAdmin).toHaveBeenCalledWith(
      { identifier: "admin", password: "secret" },
      CSRF_TOKEN,
      undefined,
    )
    expect(dependencies.navigate).toHaveBeenCalledWith("/admin/")
    expect(root.querySelector<HTMLInputElement>("[name='password']")?.value).toBe("")
  })

  it("hibás azonosítóknál általános hibaüzenetet jelenít meg", async () => {
    const root = createLoginForm()
    const dependencies = createDependencies({
      authenticateAdmin: vi
        .fn()
        .mockRejectedValue(new AuthApiError("Sikertelen", { status: 401 })),
    })

    await submitLoginForm(root, dependencies)

    expect(root.querySelector("[data-login-status]")?.textContent).toBe(
      "A megadott hitelesítési adatok érvénytelenek.",
    )
    expect(root.querySelector("[data-login-status]")?.getAttribute("role")).toBe("alert")
    expect(dependencies.navigate).not.toHaveBeenCalled()
  })

  it("hálózati hibát elkülönített szolgáltatáshibaként jelez", async () => {
    const root = createLoginForm()
    const dependencies = createDependencies({
      loadCsrf: vi.fn().mockRejectedValue(new AuthApiError("Nincs kapcsolat")),
    })

    await submitLoginForm(root, dependencies)

    expect(root.querySelector("[data-login-status]")?.textContent).toBe(
      "A bejelentkezési szolgáltatás jelenleg nem érhető el. Próbáld újra később.",
    )
  })

  it("a kérés alatt letiltja az ismételt beküldést", async () => {
    const root = createLoginForm()
    let resolveAuthentication: ((value: { username: string }) => void) | undefined
    const authenticateAdmin = vi.fn(
      () =>
        new Promise<{ username: string }>((resolve) => {
          resolveAuthentication = resolve
        }),
    )
    const dependencies = createDependencies({ authenticateAdmin })

    const firstSubmission = submitLoginForm(root, dependencies)
    await Promise.resolve()
    const secondSubmission = submitLoginForm(root, dependencies)

    expect(root.querySelector<HTMLButtonElement>("[data-action='login-submit']")?.disabled).toBe(true)
    await secondSubmission
    expect(authenticateAdmin).toHaveBeenCalledOnce()

    resolveAuthentication?.({ username: "admin" })
    await firstSubmission
  })

  it("biztonságos munkamenet-állapotot jelenít meg a query paraméter alapján", () => {
    const root = createLoginForm()

    renderLoginReason(root, "session")

    expect(root.querySelector("[data-login-status]")?.textContent).toBe(
      "A munkamenet lejárt vagy bejelentkezés szükséges.",
    )
  })
})
