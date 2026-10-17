import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
describe("secret form fallback", () => {
  it.each([
    "src/components/auth/LoginForm.astro",
    "src/components/auth/RegisterForm.astro",
    "src/pages/admin/index.astro",
  ])("POST fallback véd a jelszó URL-be kerülésétől: %s", (path) => {
    const source = readFileSync(path, "utf8")
    expect(source).toMatch(/<form[^>]*method="post"[^>]*>/)
    expect(source).not.toMatch(/<form[^>]*method="get"/)
  })
  it("a regisztráció beköti a közös motion canvas-t és a CAPTCHA-t", () => {
    expect(readFileSync("src/pages/register.astro", "utf8")).toContain("data-wave-canvas")
    const registration = readFileSync("src/components/auth/RegisterForm.astro", "utf8")
    expect(registration).toContain("Fiók létrehozása")
    expect(registration).toContain("Profilkép (opcionális)")
    expect(registration).toContain("data-registration-captcha")
    expect(registration).not.toContain("Fotósfiók létrehozása")
  })
  it("a login a kért egyszerű szövegeket mutatja technikai magyarázat nélkül", () => {
    const login = readFileSync("src/components/auth/LoginForm.astro", "utf8")
    expect(login).toContain("Kérjük adja meg adatait:")
    expect(login).toContain('href="/register/">Regisztráció</a>')
    expect(readFileSync("src/pages/login.astro", "utf8")).not.toContain("A munkamenetet a backend")
  })
  it("a súgó és a hiba a fix méretű mező alatt marad, a rács nem nyújtja a szomszédos mezőt", () => {
    const source = readFileSync("src/components/ui/Input.astro", "utf8")
    expect(source.indexOf('<p class="ui-field__description"')).toBeGreaterThan(source.indexOf("<input"))
    const css = readFileSync("src/styles/globals.css", "utf8")
    expect(css.match(/\.ui-field\s*\{([^}]+)\}/)?.[1]).toMatch(/display:\s*flex/)
    expect(css.match(/\.ui-field\s*\{([^}]+)\}/)?.[1]).toMatch(/flex-direction:\s*column/)
    expect(css.match(/\.ui-field\s*>\s*\.ui-input\s*\{([^}]+)\}/)?.[1]).toMatch(/height:\s*3\.25rem/)
    expect(css.match(/\.form-grid\s*\{([^}]+)\}/)?.[1]).toMatch(/align-items:\s*start/)
  })
})
