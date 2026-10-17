import { describe, expect, it, vi } from "vitest"
import { mountOperator, renderRegistration } from "@/scripts/operator"
import { ADMIN_ACCOUNT } from "@/test/account"
import { getRegistrations } from "@/api/accounts"
import type { Profile } from "@/api/accounts"

vi.mock("@/api/accounts", () => ({
  getRegistrations: vi.fn().mockResolvedValue([]),
  decideRegistration: vi.fn(), changePassword: vi.fn(),
}))
describe("operator", () => {
  it("bootstrap állapotban elrejti a listát és egyáltalán nem kéri le", () => {
    document.body.innerHTML = `<main data-root>
      <div data-registration-panel><p data-queue-status></p><div data-registration-queue></div></div>
      <p data-password-required hidden></p><div data-current-password></div>
      <form data-password-form><input name="currentPassword"><p data-password-status></p></form>
      <button data-action="queue-refresh"></button>
    </main>`
    const root = document.querySelector<HTMLElement>("[data-root]")!
    mountOperator(root)
    root.dispatchEvent(new CustomEvent("btphoto:account", {
      detail: { ...ADMIN_ACCOUNT, requiresPasswordChange: true },
    }))
    expect(root.querySelector<HTMLElement>("[data-registration-panel]")?.hidden).toBe(true)
    expect(root.querySelector<HTMLElement>("[data-password-required]")?.hidden).toBe(false)
    expect(getRegistrations).not.toHaveBeenCalled()
  })
  it("személyes szöveget DOM-szövegként jelenít meg, nem HTML-ként", () => {
    const profile: Profile = {
      accountId: "11111111-1111-1111-1111-111111111111", workspaceId: "22222222-2222-2222-2222-222222222222",
      firstName: "Fixture", lastName: "<script>bad</script>", salutation: null, email: "photo@fixture.test",
      phone: null, mobile: null, homeAddress: null, siteAddress: null, business: null, avatarUrl: null,
    }
    const card = renderRegistration(profile, vi.fn().mockResolvedValue(undefined))
    expect(card.querySelector("script")).toBeNull()
    expect(card.querySelector("h3")?.textContent).toContain("<script>")
    expect(card.querySelectorAll("button")).toHaveLength(2)
  })
})
