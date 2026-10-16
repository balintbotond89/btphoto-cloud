function installProtectedHistory(root: HTMLElement, reload = () => window.location.reload()) {
  const hide = () => {
    root.querySelectorAll<HTMLElement>("[data-admin-content], [data-workspace-content]").forEach(
      (content) => { content.hidden = true },
    )
    root.querySelectorAll("[data-registration-queue], [data-profile-details]").forEach(
      (container) => container.replaceChildren(),
    )
    root.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((input) => { input.value = "" })
    document.querySelectorAll<HTMLElement>("[data-account-identity]").forEach((identity) => {
      identity.hidden = true
      identity.querySelectorAll<HTMLImageElement>("img").forEach((image) => image.removeAttribute("src"))
    })
  }
  const show = (event: PageTransitionEvent) => { if (event.persisted) reload() }
  window.addEventListener("pagehide", hide)
  window.addEventListener("pageshow", show)
  return () => {
    window.removeEventListener("pagehide", hide)
    window.removeEventListener("pageshow", show)
  }
}
export { installProtectedHistory }
