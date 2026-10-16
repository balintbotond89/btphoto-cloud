import type { AuthenticatedAdmin } from "@/api/auth"

function renderIdentity(account: AuthenticatedAdmin) {
  document.querySelectorAll<HTMLElement>("[data-account-identity]").forEach((root) => {
    root.hidden = false
    const name = root.querySelector<HTMLElement>("[data-account-name]")
    const image = root.querySelector<HTMLImageElement>("[data-account-avatar]")
    const initials = root.querySelector<HTMLElement>("[data-account-initials]")
    if (name) name.textContent = account.displayName
    if (initials) initials.textContent = account.displayName.split(/\s+/).slice(0, 2)
      .map((part) => [...part][0]).join("").toLocaleUpperCase("hu-HU")
    if (image && initials && account.avatarUrl === "/api/photographer/profile/avatar") {
      image.src = account.avatarUrl
      image.hidden = false
      initials.hidden = true
      image.addEventListener("error", () => { image.hidden = true; initials.hidden = false }, { once: true })
    }
  })
}
export { renderIdentity }
