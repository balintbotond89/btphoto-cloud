import { AuthApiError, type AuthenticatedAdmin } from "@/api/auth"
import { changePassword, decideRegistration, getRegistrations, type Profile } from "@/api/accounts"

function textNode(tag: string, text: string) {
  const element = document.createElement(tag)
  element.textContent = text
  return element
}

function renderRegistration(profile: Profile, decide: (approve: boolean) => Promise<void>) {
  const card = document.createElement("article")
  card.className = "registration-card"
  card.append(textNode("h3", `${profile.salutation ?? ""} ${profile.lastName} ${profile.firstName}`.trim()))
  const details = document.createElement("dl")
  const values: [string, string | null][] = [
    ["E-mail", profile.email], ["Telefon", profile.phone], ["Mobil", profile.mobile],
    ["Lakhely", profile.homeAddress ? Object.values(profile.homeAddress).filter(Boolean).join(", ") : null],
    ["Telephely", profile.siteAddress ? Object.values(profile.siteAddress).filter(Boolean).join(", ") : null],
    ["Vállalkozás", profile.business ? `${profile.business.name} (${profile.business.type})` : null],
    ["Adószám", profile.business?.taxNumber ?? null],
    ["Cégjegyzékszám", profile.business?.registrationNumber ?? null],
    ["Vállalkozás címe", profile.business ? Object.values(profile.business.address).filter(Boolean).join(", ") : null],
  ]
  for (const [label, value] of values) {
    if (value) details.append(textNode("dt", label), textNode("dd", value))
  }
  card.append(details)
  if (profile.avatarUrl) {
    const image = document.createElement("img")
    image.src = profile.avatarUrl; image.alt = "Regisztrációs profilkép"; image.className = "account-avatar"
    image.width = 64; image.height = 64; card.append(image)
  }
  const actions = document.createElement("div")
  actions.className = "account-links"
  for (const approve of [true, false]) {
    const button = textNode("button", approve ? "Jóváhagyás" : "Elutasítás") as HTMLButtonElement
    button.type = "button"; button.className = "ui-button ui-button--outline ui-button--small"
    button.addEventListener("click", () => {
      actions.querySelectorAll("button").forEach((item) => { item.disabled = true })
      void decide(approve).finally(() => {
        actions.querySelectorAll("button").forEach((item) => { item.disabled = false })
      })
    })
    actions.append(button)
  }
  card.append(actions)
  return card
}

function mountOperator(root: HTMLElement) {
  const panel = root.querySelector<HTMLElement>("[data-registration-panel]")
  const queue = root.querySelector<HTMLElement>("[data-registration-queue]")
  const queueStatus = root.querySelector<HTMLElement>("[data-queue-status]")
  const form = root.querySelector<HTMLFormElement>("[data-password-form]")
  const status = root.querySelector<HTMLElement>("[data-password-status]")
  const required = root.querySelector<HTMLElement>("[data-password-required]")
  const currentWrapper = root.querySelector<HTMLElement>("[data-current-password]")
  const refresh = root.querySelector<HTMLButtonElement>("[data-action='queue-refresh']")
  if (!panel || !queue || !queueStatus || !form || !status || !required || !currentWrapper || !refresh) {
    throw new Error("Hiányos üzemeltetői felület.")
  }
  let account: AuthenticatedAdmin | undefined
  let generation = 0
  let busy = false
  const showError = (error: unknown, target: HTMLElement) => {
    if (error instanceof AuthApiError && (error.status === 401 || error.status === 403)) {
      window.location.assign("/login/?reason=session")
    } else {
      target.textContent = "A művelet nem sikerült. Ellenőrizd az adatokat, majd frissítsd a nézetet."
      target.setAttribute("role", "alert")
    }
  }
  const loadQueue = async () => {
    if (!account || account.requiresPasswordChange) return
    const request = ++generation
    queueStatus.textContent = "Kérelmek betöltése…"; queueStatus.setAttribute("role", "status")
    queue.replaceChildren(); refresh.disabled = true
    try {
      const registrations = await getRegistrations()
      if (request !== generation) return
      queueStatus.textContent = registrations.length ? "" : "Nincs jóváhagyásra váró regisztráció."
      for (const profile of registrations) {
        queue.append(renderRegistration(profile, async (approve) => {
          try { await decideRegistration(profile.accountId, approve); await loadQueue() }
          catch (error) { showError(error, queueStatus) }
        }))
      }
    } catch (error) { if (request === generation) showError(error, queueStatus) }
    finally { if (request === generation) refresh.disabled = false }
  }
  root.addEventListener("btphoto:account", (event) => {
    account = (event as CustomEvent<AuthenticatedAdmin>).detail
    required.hidden = !account.requiresPasswordChange
    panel.hidden = account.requiresPasswordChange
    currentWrapper.hidden = account.requiresPasswordChange
    const current = form.elements.namedItem("currentPassword") as HTMLInputElement
    current.disabled = account.requiresPasswordChange
    if (account.requiresPasswordChange) { generation++; queue.replaceChildren() }
    else void loadQueue()
  })
  refresh.addEventListener("click", () => { void loadQueue() })
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (busy || !account) return
    const current = form.elements.namedItem("currentPassword") as HTMLInputElement
    const password = form.elements.namedItem("newPassword") as HTMLInputElement
    const confirmation = form.elements.namedItem("confirmation") as HTMLInputElement
    confirmation.setCustomValidity(password.value === confirmation.value &&
      [...password.value].length >= 12 && new TextEncoder().encode(password.value).length <= 72 ? "" :
      "Egyező, legalább 12 karakteres, legfeljebb 72 UTF-8 bájtos jelszó szükséges.")
    if (!form.reportValidity()) return
    busy = true; form.setAttribute("aria-busy", "true")
    const button = form.querySelector<HTMLButtonElement>("[data-action='password-submit']")
    if (button) button.disabled = true
    status.textContent = "A jelszó módosítása folyamatban…"
    try {
      await changePassword(account.requiresPasswordChange ? "" : current.value, password.value, confirmation.value)
      window.location.assign("/login/?reason=password-changed")
    } catch (error) { showError(error, status) }
    finally {
      current.value = ""; password.value = ""; confirmation.value = ""; confirmation.setCustomValidity("")
      busy = false; form.setAttribute("aria-busy", "false"); if (button) button.disabled = false
    }
  })
}
export { mountOperator, renderRegistration }
