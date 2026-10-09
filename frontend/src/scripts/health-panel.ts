import { getHealthStatus } from "@/api/health"

type HealthLoader = (signal?: AbortSignal) => Promise<{ status: "UP" }>

type HealthElements = {
  panel: HTMLElement
  state: HTMLElement
  stateLabel: HTMLElement
  title: HTMLElement
  description: HTMLElement
  retry: HTMLButtonElement
}

function getHealthElements(root: HTMLElement): HealthElements {
  const panel = root.querySelector<HTMLElement>("[data-health-surface]")
  const state = root.querySelector<HTMLElement>("[data-health-state]")
  const stateLabel = root.querySelector<HTMLElement>("[data-health-state-label]")
  const title = root.querySelector<HTMLElement>("[data-health-title]")
  const description = root.querySelector<HTMLElement>("[data-health-description]")
  const retry = root.querySelector<HTMLButtonElement>("[data-health-retry]")

  if (!panel || !state || !stateLabel || !title || !description || !retry) {
    throw new Error("A health panel szerkezete hiányos.")
  }

  return { panel, state, stateLabel, title, description, retry }
}

function renderLoading(elements: HealthElements) {
  elements.panel.dataset.status = "loading"
  elements.state.dataset.status = "loading"
  elements.stateLabel.textContent = "ELLENŐRZÉS"
  elements.title.textContent = "Kapcsolat ellenőrzése"
  elements.description.textContent = "A frontend lekérdezi a backend nyilvános health végpontját."
  elements.retry.hidden = true
}

function renderAvailable(elements: HealthElements) {
  elements.panel.dataset.status = "up"
  elements.state.dataset.status = "up"
  elements.stateLabel.textContent = "ELÉRHETŐ"
  elements.title.textContent = "A szolgáltatás elérhető"
  elements.description.textContent = "A frontend érvényes UP választ kapott a Spring Boot backendtől."
  elements.retry.hidden = true
}

function renderUnavailable(elements: HealthElements) {
  elements.panel.dataset.status = "error"
  elements.state.dataset.status = "error"
  elements.stateLabel.textContent = "NEM ELÉRHETŐ"
  elements.title.textContent = "A kapcsolat nem ellenőrizhető"
  elements.description.textContent = "Indítsd el a backendet, majd próbáld újra az ellenőrzést."
  elements.retry.hidden = false
}

async function refreshHealthPanel(
  root: HTMLElement,
  loadHealth: HealthLoader = getHealthStatus,
  signal?: AbortSignal,
) {
  const elements = getHealthElements(root)
  renderLoading(elements)

  try {
    await loadHealth(signal)
    renderAvailable(elements)
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return
    }

    renderUnavailable(elements)
  }
}

function mountHealthPanel(root: HTMLElement) {
  let controller = new AbortController()

  const refresh = () => {
    controller.abort()
    controller = new AbortController()
    void refreshHealthPanel(root, getHealthStatus, controller.signal)
  }

  const retry = root.querySelector<HTMLButtonElement>("[data-health-retry]")
  retry?.addEventListener("click", refresh)
  refresh()

  return () => {
    controller.abort()
    retry?.removeEventListener("click", refresh)
  }
}

export { mountHealthPanel, refreshHealthPanel }
export type { HealthLoader }
