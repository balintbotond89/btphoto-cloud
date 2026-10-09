import { describe, expect, it, vi } from "vitest"

import { refreshHealthPanel } from "@/scripts/health-panel"

function createPanel() {
  document.body.innerHTML = `
    <section data-health-panel>
      <div data-health-surface>
        <span data-health-state><span data-health-state-label></span></span>
        <strong data-health-title></strong>
        <p data-health-description></p>
        <button data-health-retry hidden>Újrapróbálás</button>
      </div>
    </section>
  `

  const panel = document.querySelector<HTMLElement>("[data-health-panel]")
  if (!panel) {
    throw new Error("A tesztpanel nem jött létre.")
  }
  return panel
}

describe("health panel", () => {
  it("elérhető állapotot jelenít meg UP válasznál", async () => {
    const panel = createPanel()
    const loadHealth = vi.fn().mockResolvedValue({ status: "UP" as const })

    await refreshHealthPanel(panel, loadHealth)

    expect(panel.querySelector("[data-health-surface]")?.getAttribute("data-status")).toBe("up")
    expect(panel.querySelector("[data-health-title]")?.textContent).toBe(
      "A szolgáltatás elérhető",
    )
    expect(panel.querySelector<HTMLButtonElement>("[data-health-retry]")?.hidden).toBe(true)
  })

  it("hibát és újrapróbálási lehetőséget jelenít meg", async () => {
    const panel = createPanel()
    const loadHealth = vi.fn().mockRejectedValue(new Error("Nincs kapcsolat"))

    await refreshHealthPanel(panel, loadHealth)

    expect(panel.querySelector("[data-health-surface]")?.getAttribute("data-status")).toBe("error")
    expect(panel.querySelector("[data-health-title]")?.textContent).toBe(
      "A kapcsolat nem ellenőrizhető",
    )
    expect(panel.querySelector<HTMLButtonElement>("[data-health-retry]")?.hidden).toBe(false)
  })
})
