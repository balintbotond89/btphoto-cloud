import { describe, expect, it, vi } from "vitest"
import { installProtectedHistory } from "@/scripts/protected-history"
describe("protected browser history", () => {
  it("elhagyáskor elrejti a profilt/listát és bfcache-visszatéréskor friss sessiont követel", () => {
    document.body.innerHTML = `<span data-account-identity><img src="/api/photographer/profile/avatar" alt="Avatar"></span>
      <main><section data-admin-content><div data-registration-queue>Fixture személyes adat</div>
      <input type="password" value="fixture-password"></section></main>`
    const root = document.querySelector("main")!
    const reload = vi.fn()
    const cleanup = installProtectedHistory(root, reload)
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }))
    expect(root.querySelector<HTMLElement>("[data-admin-content]")?.hidden).toBe(true)
    expect(root.querySelector("[data-registration-queue]")?.textContent).toBe("")
    expect(root.querySelector("input")?.value).toBe("")
    expect(document.querySelector<HTMLElement>("[data-account-identity]")?.hidden).toBe(true)
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }))
    expect(reload).toHaveBeenCalledOnce()
    cleanup()
  })
})
