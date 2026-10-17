import { afterEach, describe, expect, it, vi } from "vitest"
import { AuthApiError } from "@/api/auth"
import { mountRegistration, registrationData } from "@/scripts/registration-form"

function formFixture() {
  const inputs = ["lastName", "firstName", "email", "password", "passwordConfirmation", "phone", "mobile"]
    .map((name) => `<label for="${name}">${name}</label><input id="${name}" name="${name}" value="${name.startsWith("password") ? "fixture-password" : "Fixture"}">`).join("")
  document.body.innerHTML = `<form data-registration-form>${inputs}
    <select name="salutation"><option value="">Nincs</option><option>Dr.</option></select>
    <input name="hasBusiness" type="checkbox">
    <fieldset data-business-fields disabled hidden><input name="business.name" value="Fixture Kft." required></fieldset>
    <input name="avatar" type="file">
    <img data-avatar-preview hidden alt="Előnézet">
    <p data-registration-status tabindex="-1"></p>
    <button data-action="registration-submit" type="submit">Beküldés</button>
  </form>`
  return document.querySelector("form") as HTMLFormElement
}
describe("registration form", () => {
  afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren() })
  it("vállalkozási mezőket csak a checkbox aktiválja; kikapcsolva nem küldi", () => {
    const form = formFixture()
    const cleanup = mountRegistration(form, vi.fn())
    const checkbox = form.elements.namedItem("hasBusiness") as HTMLInputElement
    const business = form.querySelector<HTMLFieldSetElement>("[data-business-fields]")!
    expect(business.hidden).toBe(true); expect(business.disabled).toBe(true)
    checkbox.checked = true; checkbox.dispatchEvent(new Event("change"))
    expect(business.hidden).toBe(false); expect(business.disabled).toBe(false)
    checkbox.checked = false; checkbox.dispatchEvent(new Event("change"))
    expect(registrationData(form).business).toBeNull()
    cleanup()
  })
  it("siker után jóváhagyásról tájékoztat és törli a jelszavakat", async () => {
    const form = formFixture()
    const submit = vi.fn().mockResolvedValue(undefined)
    const cleanup = mountRegistration(form, submit)
    form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }))
    await vi.waitFor(() => expect(form.querySelector("[data-registration-status]")?.textContent).toContain("jóváhagyás után"))
    expect((form.elements.namedItem("password") as HTMLInputElement).value).toBe("")
    expect(submit).toHaveBeenCalledOnce()
    cleanup()
  })
  it("bfcache elhagyáskor törli a jelszót, visszatéréskor az űrlap továbbra is működik", async () => {
    const form = formFixture()
    const password = form.elements.namedItem("password") as HTMLInputElement
    const confirmation = form.elements.namedItem("passwordConfirmation") as HTMLInputElement
    password.type = "password"; confirmation.type = "password"
    const submit = vi.fn().mockResolvedValue(undefined)
    const cleanup = mountRegistration(form, submit)
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }))
    expect(password.value).toBe("")
    password.value = "fixture-password"; confirmation.value = "fixture-password"
    form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }))
    await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce())
    cleanup()
  })

  it("eltérő jelszavaknál nem küld hálózati kérést", () => {
    const form = formFixture(); const submit = vi.fn()
    const cleanup = mountRegistration(form, submit)
    ;(form.elements.namedItem("passwordConfirmation") as HTMLInputElement).value = "other-password"
    form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }))
    expect(submit).not.toHaveBeenCalled()
    expect(form.querySelector("[data-registration-status]")?.getAttribute("role")).toBe("alert")
    cleanup()
  })
  it("az üres kötelező mezőnél tartós magyar hibát és fókuszt ad, javításkor eltávolítja", () => {
    const form = formFixture(); const submit = vi.fn()
    const input = form.elements.namedItem("lastName") as HTMLInputElement
    input.required = true; input.value = ""
    const cleanup = mountRegistration(form, submit)
    form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }))
    expect(submit).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(input)
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(document.getElementById("lastName-validation-error")?.textContent).toBe("A mező kitöltése kötelező.")
    expect(input.getAttribute("aria-describedby")).toContain("lastName-validation-error")
    input.value = "Fixture"; input.dispatchEvent(new Event("input", { bubbles: true }))
    expect(document.getElementById("lastName-validation-error")).toBeNull()
    expect(input.hasAttribute("aria-invalid")).toBe(false)
    cleanup()
  })
  it("a hibás e-mail formátumát is a mező mellett jelzi", () => {
    const form = formFixture()
    const email = form.elements.namedItem("email") as HTMLInputElement
    email.type = "email"; email.value = "invalid"
    const cleanup = mountRegistration(form, vi.fn())
    form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }))
    expect(document.getElementById("email-validation-error")?.textContent).toContain("érvényes e-mail")
    cleanup()
  })
  it("hibánál nem titkos mezőt megtart, jelszót töröl és mezőt megjelöl", async () => {
    const form = formFixture()
    const submit = vi.fn().mockRejectedValue(new AuthApiError("Hibás", {
      status: 400, fields: { email: "Hibás mező" },
    }))
    const cleanup = mountRegistration(form, submit)
    form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }))
    await vi.waitFor(() => expect(form.querySelector("#email")?.getAttribute("aria-invalid")).toBe("true"))
    expect((form.elements.namedItem("lastName") as HTMLInputElement).value).toBe("Fixture")
    expect((form.elements.namedItem("password") as HTMLInputElement).value).toBe("")
    cleanup()
  })
  it("avatar előnézet URL-jét váltáskor és cleanupkor felszabadítja", () => {
    const create = vi.fn().mockReturnValue("blob:fixture")
    const revoke = vi.fn()
    class TestUrl extends URL { static createObjectURL = create; static revokeObjectURL = revoke }
    vi.stubGlobal("URL", TestUrl)
    const form = formFixture()
    const cleanup = mountRegistration(form, vi.fn())
    const avatar = form.elements.namedItem("avatar") as HTMLInputElement
    Object.defineProperty(avatar, "files", { configurable: true, value: [new File(["fixture"], "photo.png", { type: "image/png" })] })
    avatar.dispatchEvent(new Event("change"))
    expect(create).toHaveBeenCalledOnce()
    avatar.dispatchEvent(new Event("change"))
    expect(revoke).toHaveBeenCalledOnce()
    cleanup()
    expect(revoke).toHaveBeenCalledTimes(2)
  })
})
