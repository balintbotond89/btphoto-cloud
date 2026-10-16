import { AuthApiError } from "@/api/auth"
import { register, type Address, type Registration } from "@/api/accounts"
import { clearFieldError, showFieldError, validateFormFields } from "@/scripts/form-validation"
import { mountRecaptcha } from "@/scripts/recaptcha"

function field(form: HTMLFormElement, name: string): string {
  const input = form.elements.namedItem(name)
  return input instanceof HTMLInputElement || input instanceof HTMLSelectElement ? input.value : ""
}

function address(form: HTMLFormElement, prefix: string): Address | null {
  const values = ["country", "postalCode", "city", "line1", "line2"].map((key) => field(form, `${prefix}.${key}`).trim())
  if (values.every((value) => !value)) return null
  return { country: values[0].toUpperCase(), postalCode: values[1], city: values[2], line1: values[3], line2: values[4] }
}

function registrationData(form: HTMLFormElement): Registration {
  const business = form.elements.namedItem("hasBusiness") as HTMLInputElement
  return {
    lastName: field(form, "lastName").trim(), firstName: field(form, "firstName").trim(),
    salutation: field(form, "salutation"), email: field(form, "email").trim(),
    password: field(form, "password"), passwordConfirmation: field(form, "passwordConfirmation"),
    phone: field(form, "phone"), mobile: field(form, "mobile"),
    homeAddress: address(form, "homeAddress"), siteAddress: address(form, "siteAddress"),
    hasBusiness: business.checked,
    business: business.checked ? {
      type: field(form, "business.type"), name: field(form, "business.name").trim(),
      taxNumber: field(form, "business.taxNumber").trim(),
      registrationNumber: field(form, "business.registrationNumber").trim(),
      address: address(form, "business.address") as Address,
    } : null,
  }
}

function errorMessage(error: unknown) {
  if (error instanceof AuthApiError) {
    if (error.status === 429) return "Túl sok regisztrációs kísérlet. Próbáld újra 10 perc múlva."
    if (error.status === 409) return "A regisztráció ezekkel az adatokkal nem rögzíthető."
    if (error.code === "REGISTRATION_DISABLED") return "A regisztráció még nem engedélyezett."
    if (error.code === "CAPTCHA_INVALID") return "A CAPTCHA ellenőrzés sikertelen vagy lejárt. Kérjük végezze el újra."
    if (error.code === "CAPTCHA_UNAVAILABLE") return "A CAPTCHA ellenőrzés jelenleg nem érhető el. Próbálja újra később."
    if (error.code === "INVALID_AVATAR" || error.status === 413) return "A profilkép mérete vagy formátuma nem megfelelő."
    if (error.status === 400) return "Ellenőrizd a mezőket: kötelező adatok, címek és jelszó-megerősítés."
  }
  return "A beküldés eredménye nem ellenőrizhető. Próbáld újra később; a megadott adatok nem kerülnek helyi tárolóba."
}

function mountRegistration(form: HTMLFormElement, submit = register) {
  const checkbox = form.elements.namedItem("hasBusiness") as HTMLInputElement
  const business = form.querySelector<HTMLFieldSetElement>("[data-business-fields]")
  const status = form.querySelector<HTMLElement>("[data-registration-status]")
  const button = form.querySelector<HTMLButtonElement>("[data-action='registration-submit']")
  const avatar = form.elements.namedItem("avatar") as HTMLInputElement
  const preview = form.querySelector<HTMLImageElement>("[data-avatar-preview]")
  const captchaElement = form.querySelector<HTMLElement>("[data-registration-captcha]")
  const captcha = captchaElement ? mountRecaptcha(captchaElement) : undefined
  let objectUrl: string | undefined
  let busy = false
  if (!business || !status || !button || !preview) throw new Error("Hiányos regisztrációs űrlap.")
  const toggle = () => {
    business.disabled = !checkbox.checked; business.hidden = !checkbox.checked
    if (!checkbox.checked) business.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")
      .forEach(clearFieldError)
  }
  const previewAvatar = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = undefined
    preview.hidden = true
    const file = avatar.files?.[0]
    if (file && ["image/jpeg", "image/png"].includes(file.type) && file.size <= 2 * 1024 * 1024) {
      objectUrl = URL.createObjectURL(file); preview.src = objectUrl; preview.hidden = false
    }
  }
  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    if (busy) return
    for (const prefix of ["homeAddress", "siteAddress"]) {
      const started = address(form, prefix) !== null
      form.querySelectorAll<HTMLInputElement>(`[data-address="${prefix}"] input`).forEach((input) => {
        input.required = started && !input.name.endsWith(".line2")
      })
    }
    const data = registrationData(form)
    const password = form.elements.namedItem("password") as HTMLInputElement
    const confirmation = form.elements.namedItem("passwordConfirmation") as HTMLInputElement
    const validPassword = [...data.password].length >= 12 && new TextEncoder().encode(data.password).length <= 72
    confirmation.setCustomValidity(data.password === data.passwordConfirmation && validPassword ? "" :
      "A jelszavak egyezzenek; legalább 12 karakter és legfeljebb 72 UTF-8 bájt szükséges.")
    const invalid = validateFormFields(form)
    if (invalid) {
      status.textContent = "Ellenőrizze a megjelölt mezőket. A * jelölt mezők kitöltése kötelező."
      status.setAttribute("role", "alert")
      invalid.focus(); return
    }
    const captchaToken = captcha?.getToken()
    if (captcha && !captchaToken) {
      status.textContent = "A regisztrációhoz CAPTCHA-ellenőrzés szükséges."
      status.setAttribute("role", "alert"); captchaElement?.focus(); return
    }
    busy = true; button.disabled = true; form.setAttribute("aria-busy", "true")
    form.querySelectorAll("[aria-invalid]").forEach((element) => element.removeAttribute("aria-invalid"))
    status.textContent = "A regisztráció beküldése folyamatban…"
    try {
      await submit(data, avatar.files?.[0], captchaToken)
      form.reset(); toggle(); previewAvatar()
      status.textContent = "A regisztráció rögzítve. A bejelentkezés jóváhagyás után válik elérhetővé."
      status.setAttribute("role", "status")
    } catch (error) {
      status.textContent = errorMessage(error); status.setAttribute("role", "alert")
      if (error instanceof AuthApiError) {
        const names: string[] = []
        for (const key of Object.keys(error.fields)) {
          const input = form.elements.namedItem(key)
          if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
            showFieldError(input, "A mező hiányos vagy érvénytelen.")
            const label = form.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)
            names.push(label?.textContent?.trim() ?? key)
          }
        }
        if (names.length) status.textContent += " Hibás mezők: " + names.join(", ") + "."
      }
    } finally {
      captcha?.reset()
      password.value = ""; confirmation.value = ""; confirmation.setCustomValidity("")
      busy = false; button.disabled = false; form.setAttribute("aria-busy", "false"); status.focus()
    }
  }
  checkbox.addEventListener("change", toggle)
  const onInput = (event: Event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      clearFieldError(event.target)
    }
  }
  form.addEventListener("input", onInput)
  avatar.addEventListener("change", previewAvatar)
  form.addEventListener("submit", handleSubmit)
  toggle()
  const cleanup = () => {
    captcha?.dispose()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = undefined
    preview.hidden = true
    form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((input) => { input.value = "" })
    checkbox.removeEventListener("change", toggle); avatar.removeEventListener("change", previewAvatar)
    form.removeEventListener("submit", handleSubmit)
    form.removeEventListener("input", onInput)
    window.removeEventListener("pagehide", onHide)
  }
  const onHide = (event: PageTransitionEvent) => {
    captcha?.reset()
    form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((input) => { input.value = "" })
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = undefined
    preview.hidden = true
    // A bfcache visszatéréskor megőrzi a működő event handlereket, de nem a jelszót/előnézetet.
    if (!event.persisted) cleanup()
  }
  window.addEventListener("pagehide", onHide)
  return cleanup
}
export { mountRegistration, registrationData }
