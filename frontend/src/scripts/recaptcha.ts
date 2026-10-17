import { getRegistrationConfiguration } from "@/api/accounts"

type RecaptchaOptions = {
  sitekey: string; theme: "light" | "dark"; size: "normal" | "compact"
  callback: () => void; "expired-callback": () => void; "error-callback": () => void
}
type RecaptchaApi = {
  render: (element: HTMLElement, options: RecaptchaOptions) => number
  getResponse: (id: number) => string
  reset: (id: number) => void
}
type CaptchaWindow = Window & typeof globalThis & {
  grecaptcha?: RecaptchaApi; btphotoRecaptchaLoaded?: () => void
}
let apiPromise: Promise<RecaptchaApi> | undefined

function loadGoogleApi(): Promise<RecaptchaApi> {
  const target = window as CaptchaWindow
  if (target.grecaptcha?.render) return Promise.resolve(target.grecaptcha)
  apiPromise ??= new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("CAPTCHA betöltési időtúllépés.")), 20_000)
    target.btphotoRecaptchaLoaded = () => {
      window.clearTimeout(timeout)
      if (target.grecaptcha?.render) resolve(target.grecaptcha)
      else reject(new Error("A CAPTCHA nem érhető el."))
    }
    const script = document.createElement("script")
    script.src = "https://www.google.com/recaptcha/api.js?onload=btphotoRecaptchaLoaded&render=explicit&hl=hu"
    script.async = true; script.defer = true
    script.addEventListener("error", () => {
      window.clearTimeout(timeout); reject(new Error("A CAPTCHA nem tölthető be."))
    }, { once: true })
    document.head.append(script)
  })
  return apiPromise
}

function mountRecaptcha(container: HTMLElement, config = getRegistrationConfiguration, loadApi = loadGoogleApi) {
  const host = container.querySelector<HTMLElement>("[data-captcha-widget]")
  const status = container.querySelector<HTMLElement>("[data-captcha-status]")
  if (!host || !status) throw new Error("Hiányos CAPTCHA-felület.")
  let api: RecaptchaApi | undefined
  let widget: number | undefined
  let solved = false
  let disposed = false
  const message = (text: string) => { if (!disposed) status.textContent = text }
  const ready = (async () => {
    try {
      const configuration = await config()
      if (disposed) return
      if (!configuration.siteKey) {
        message("A Google CAPTCHA még nincs beállítva. A regisztráció addig nem küldhető be.")
        return
      }
      api = await loadApi()
      if (disposed) return
      widget = api.render(host, {
        sitekey: configuration.siteKey,
        theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
        size: host.clientWidth < 304 ? "compact" : "normal",
        callback: () => { solved = true; message("Az ellenőrzés sikeres.") },
        "expired-callback": () => { solved = false; message("Az ellenőrzés lejárt. Kérjük végezze el újra.") },
        "error-callback": () => { solved = false; message("A CAPTCHA nem érhető el. Kérjük frissítse az oldalt.") },
      })
      message("Kérjük jelölje be a „Nem vagyok robot” négyzetet.")
    } catch {
      message("A CAPTCHA nem tölthető be. Ellenőrizze a kapcsolatot, majd frissítse az oldalt.")
    }
  })()
  const reset = () => {
    solved = false
    if (api && widget !== undefined) {
      api.reset(widget)
      message("Kérjük végezze el a CAPTCHA ellenőrzést.")
    }
  }
  return {
    ready,
    getToken: () => solved && api && widget !== undefined ? api.getResponse(widget) : "",
    reset,
    dispose: () => { reset(); disposed = true; host.replaceChildren() },
  }
}

export { mountRecaptcha }
export type { RecaptchaApi, RecaptchaOptions }
