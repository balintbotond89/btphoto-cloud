import { describe, expect, it, vi } from "vitest"

import { pushToast } from "@/scripts/toast"

describe("toast", () => {
  it("élő régióban biztonságosan jeleníti meg az üzenetet", () => {
    vi.useFakeTimers()
    const region = document.createElement("section")
    region.setAttribute("role", "status")
    region.setAttribute("aria-live", "polite")
    document.body.append(region)

    const result = pushToast(region, "A galéria mentése sikerült", {
      tone: "success",
      duration: 2_000,
    })

    expect(result.element.textContent).toContain("A galéria mentése sikerült")
    expect(result.element.classList).toContain("toast--success")
    vi.advanceTimersByTime(2_000)
    expect(region.children).toHaveLength(0)
    vi.useRealTimers()
  })

  it("a hibaüzenetet sürgős jelzésként és bezárhatóan kezeli", () => {
    const region = document.createElement("section")
    const result = pushToast(region, "A feltöltés megszakadt", { tone: "error" })

    expect(result.element.getAttribute("role")).toBe("alert")
    result.element.querySelector<HTMLButtonElement>("button")?.click()
    expect(region.children).toHaveLength(0)
  })
})
