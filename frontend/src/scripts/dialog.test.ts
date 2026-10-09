import { describe, expect, it, vi } from "vitest"

import { mountDialog } from "@/scripts/dialog"

function createDialogFixture() {
  document.body.innerHTML = `
    <div data-dialog-root>
      <button data-dialog-open>Megnyitás</button>
      <dialog data-dialog aria-labelledby="dialog-title">
        <h2 id="dialog-title">Részletek</h2>
        <button data-dialog-close>Bezárás</button>
        <a href="#cel">Cél</a>
      </dialog>
    </div>
  `

  const root = document.querySelector<HTMLElement>("[data-dialog-root]")
  const dialog = document.querySelector<HTMLDialogElement>("[data-dialog]")
  if (!root || !dialog) {
    throw new Error("A dialog teszt-fixture nem jött létre.")
  }

  dialog.showModal = vi.fn(() => dialog.setAttribute("open", ""))
  dialog.close = vi.fn(() => {
    dialog.removeAttribute("open")
    dialog.dispatchEvent(new Event("close"))
  })
  return { root, dialog }
}

describe("dialog", () => {
  it("megnyitáskor a dialogba helyezi, bezáráskor visszaadja a fókuszt", async () => {
    const { root, dialog } = createDialogFixture()
    const trigger = root.querySelector<HTMLButtonElement>("[data-dialog-open]")
    const closeButton = root.querySelector<HTMLButtonElement>("[data-dialog-close]")
    mountDialog(root)

    trigger?.focus()
    trigger?.click()
    await Promise.resolve()

    expect(dialog.open).toBe(true)
    expect(document.activeElement).toBe(closeButton)

    closeButton?.click()
    expect(dialog.open).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it("Escape billentyűre bezár", () => {
    const { root, dialog } = createDialogFixture()
    mountDialog(root)
    root.querySelector<HTMLButtonElement>("[data-dialog-open]")?.click()

    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

    expect(dialog.open).toBe(false)
  })
})
