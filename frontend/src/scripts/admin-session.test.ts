import { ADMIN_ACCOUNT } from "@/test/account"
import { describe, expect, it, vi } from "vitest"

import { AuthApiError } from "@/api/auth"
import {
  logoutAdmin,
  refreshAdminSession,
  type AdminSessionDependencies,
} from "@/scripts/admin-session"

function createAdminSession() {
  document.body.innerHTML = `
    <section data-admin-session>
      <div data-admin-loading></div>
      <div data-admin-error hidden><button data-action="admin-retry">Újrapróbálás</button></div>
      <div data-admin-content hidden>
        <span data-admin-username></span>
        <button data-action="admin-logout">Kijelentkezés</button>
        <p data-admin-status role="status"></p>
      </div>
    </section>
  `

  const root = document.querySelector<HTMLElement>("[data-admin-session]")
  if (!root) {
    throw new Error("Az admin tesztnézet nem jött létre.")
  }
  return root
}

function createDependencies(
  overrides: Partial<AdminSessionDependencies> = {},
): AdminSessionDependencies {
  return {
    loadAdmin: vi.fn().mockResolvedValue(ADMIN_ACCOUNT),
    logout: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn(),
    ...overrides,
  }
}

describe("admin session", () => {
  it("aktív munkamenetnél megjeleníti az admin felületet", async () => {
    const root = createAdminSession()
    const dependencies = createDependencies()

    await refreshAdminSession(root, dependencies)

    expect(root.querySelector<HTMLElement>("[data-admin-loading]")?.hidden).toBe(true)
    expect(root.querySelector<HTMLElement>("[data-admin-content]")?.hidden).toBe(false)
    expect(root.querySelector("[data-admin-username]")?.textContent).toBe("admin")
  })

  it("fotósnak nem nyit adminnézetet", async () => {
    const root = createAdminSession()
    const dependencies = createDependencies({ loadAdmin: vi.fn().mockResolvedValue({
      ...ADMIN_ACCOUNT, role: "PHOTOGRAPHER", workspaceId: "fixture-workspace",
    }) })
    await refreshAdminSession(root, dependencies)
    expect(dependencies.navigate).toHaveBeenCalledWith("/workspace/")
    expect(root.querySelector<HTMLElement>("[data-admin-content]")?.hidden).toBe(true)
  })

  it("hiányzó munkamenetnél a login oldalra irányít", async () => {
    const root = createAdminSession()
    const dependencies = createDependencies({
      loadAdmin: vi
        .fn()
        .mockRejectedValue(new AuthApiError("Hitelesítés szükséges", { status: 401 })),
    })

    await refreshAdminSession(root, dependencies)

    expect(dependencies.navigate).toHaveBeenCalledWith("/login/?reason=session")
    expect(root.querySelector<HTMLElement>("[data-admin-content]")?.hidden).toBe(true)
  })

  it("átmeneti backendhibánál újrapróbálható hibaállapotot mutat", async () => {
    const root = createAdminSession()
    const dependencies = createDependencies({
      loadAdmin: vi.fn().mockRejectedValue(new AuthApiError("Nincs kapcsolat")),
    })

    await refreshAdminSession(root, dependencies)

    expect(root.querySelector<HTMLElement>("[data-admin-error]")?.hidden).toBe(false)
    expect(dependencies.navigate).not.toHaveBeenCalled()
  })

  it("sikeres kijelentkezés után fix login útvonalra irányít", async () => {
    const root = createAdminSession()
    const dependencies = createDependencies()

    await logoutAdmin(root, dependencies)

    expect(dependencies.logout).toHaveBeenCalledOnce()
    expect(dependencies.navigate).toHaveBeenCalledWith("/login/?reason=logout")
  })

  it("kijelentkezési hibánál visszaengedi az újrapróbálást", async () => {
    const root = createAdminSession()
    const dependencies = createDependencies({
      logout: vi.fn().mockRejectedValue(new AuthApiError("Nincs kapcsolat")),
    })

    await logoutAdmin(root, dependencies)

    expect(root.querySelector("[data-admin-status]")?.textContent).toBe(
      "A kijelentkezés nem sikerült. Próbáld újra.",
    )
    expect(root.querySelector<HTMLButtonElement>("[data-action='admin-logout']")?.disabled).toBe(false)
  })
})
