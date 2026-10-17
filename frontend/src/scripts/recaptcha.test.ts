import { afterEach, describe, expect, it, vi } from "vitest"
import { mountRecaptcha, type RecaptchaApi, type RecaptchaOptions } from "@/scripts/recaptcha"

function fixture() {
  document.body.innerHTML = '<fieldset><div data-captcha-widget></div><p data-captcha-status></p></fieldset>'
  return document.querySelector("fieldset")!
}
describe("Google reCAPTCHA v2", () => {
  afterEach(() => document.body.replaceChildren())
  it("kulcs nélkül nem tölt be Google scriptet és nem ad bypass tokent", async () => {
    const container = fixture(); const loader = vi.fn()
    const captcha = mountRecaptcha(container, async () => ({ siteKey: "" }), loader)
    await captcha.ready
    expect(loader).not.toHaveBeenCalled()
    expect(captcha.getToken()).toBe("")
    expect(container.textContent).toContain("még nincs beállítva")
    captcha.dispose()
  })
  it("sikeres widget után tokent ad, lejárat és reset után már nem", async () => {
    let options: RecaptchaOptions | undefined
    const api: RecaptchaApi = {
      render: vi.fn((_element, settings) => { options = settings; return 7 }),
      getResponse: vi.fn(() => "fixture-response"), reset: vi.fn(),
    }
    const captcha = mountRecaptcha(fixture(), async () => ({ siteKey: "fixture-public" }), async () => api)
    await captcha.ready
    expect(captcha.getToken()).toBe("")
    options!.callback()
    expect(captcha.getToken()).toBe("fixture-response")
    options!["expired-callback"]()
    expect(captcha.getToken()).toBe("")
    options!.callback(); captcha.reset()
    expect(captcha.getToken()).toBe("")
    expect(api.reset).toHaveBeenCalledWith(7)
    captcha.dispose()
  })
  it("hálózati és szolgáltatói hiba esetén nincs sikeres token", async () => {
    const container = fixture()
    const captcha = mountRecaptcha(container, async () => ({ siteKey: "fixture-public" }),
      async () => { throw new Error("fixture") })
    await captcha.ready
    expect(container.textContent).toContain("nem tölthető be")
    expect(captcha.getToken()).toBe("")
    captcha.dispose()
  })
  it("eltávolított oldalon a későn betöltődő widget nem jelenik meg", async () => {
    const api: RecaptchaApi = { render: vi.fn(() => 1), getResponse: vi.fn(), reset: vi.fn() }
    const captcha = mountRecaptcha(fixture(), async () => ({ siteKey: "fixture-public" }), async () => api)
    captcha.dispose(); await captcha.ready
    expect(api.render).not.toHaveBeenCalled()
  })
})
