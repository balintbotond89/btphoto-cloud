import { AuthApiError, endSession, getCurrentAdmin } from "@/api/auth"
import { getProfile } from "@/api/accounts"
import { renderIdentity } from "@/scripts/account-identity"
import { installProtectedHistory } from "@/scripts/protected-history"

function mountWorkspace(root: HTMLElement) {
  installProtectedHistory(root)
  const status = root.querySelector<HTMLElement>("[data-workspace-status]")
  const content = root.querySelector<HTMLElement>("[data-workspace-content]")
  const name = root.querySelector<HTMLElement>("[data-workspace-name]")
  const details = root.querySelector<HTMLElement>("[data-profile-details]")
  const retry = root.querySelector<HTMLButtonElement>("[data-action='workspace-retry']")
  const logout = root.querySelector<HTMLButtonElement>("[data-action='workspace-logout']")
  if (!status || !content || !name || !details || !retry || !logout) throw new Error("Hiányos munkaterület.")
  let busy = false
  const error = (cause: unknown) => {
    if (cause instanceof AuthApiError && (cause.status === 401 || cause.status === 403)) {
      window.location.assign("/login/?reason=session")
    } else { status.textContent = "A munkaterület nem tölthető be. Próbáld újra."; status.setAttribute("role", "alert") }
  }
  const load = async () => {
    if (busy) return
    busy = true; content.hidden = true; retry.disabled = true
    status.textContent = "Saját munkaterület betöltése…"; status.setAttribute("role", "status")
    try {
      const account = await getCurrentAdmin()
      if (account.role !== "PHOTOGRAPHER") { window.location.assign("/admin/"); return }
      const profile = await getProfile()
      renderIdentity(account); name.textContent = account.displayName; details.replaceChildren()
      const values: [string, string | null][] = [
        ["E-mail", profile.email], ["Megszólítás", profile.salutation], ["Telefon", profile.phone],
        ["Mobil", profile.mobile],
        ["Lakhely", profile.homeAddress ? Object.values(profile.homeAddress).filter(Boolean).join(", ") : null],
        ["Telephely", profile.siteAddress ? Object.values(profile.siteAddress).filter(Boolean).join(", ") : null],
        ["Vállalkozás", profile.business ? `${profile.business.name} (${profile.business.type})` : null],
        ["Adószám", profile.business?.taxNumber ?? null],
        ["Cégjegyzékszám", profile.business?.registrationNumber ?? null],
        ["Vállalkozás címe", profile.business ? Object.values(profile.business.address).filter(Boolean).join(", ") : null],
      ]
      for (const [label, value] of values) {
        if (value) {
          const term = document.createElement("dt"); term.textContent = label
          const definition = document.createElement("dd"); definition.textContent = value
          details.append(term, definition)
        }
      }
      status.textContent = ""; content.hidden = false
    } catch (cause) { error(cause) }
    finally { busy = false; retry.disabled = false }
  }
  retry.addEventListener("click", () => { void load() })
  logout.addEventListener("click", async () => {
    logout.disabled = true
    try { await endSession(); window.location.assign("/login/?reason=logout") }
    catch (cause) { error(cause); logout.disabled = false }
  })
  void load()
}
export { mountWorkspace }
