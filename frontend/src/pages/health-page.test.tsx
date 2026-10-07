import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getHealthStatus, HealthApiError } from "@/api/health"
import { HealthPage } from "@/pages/health-page"

type HealthApiModule = {
  getHealthStatus: typeof getHealthStatus
  HealthApiError: typeof HealthApiError
}

vi.mock("@/api/health", async (importOriginal) => {
  const original = await importOriginal<HealthApiModule>()

  return {
    ...original,
    getHealthStatus: vi.fn(),
  }
})

const getHealthStatusMock = vi.mocked(getHealthStatus)

describe("HealthPage", () => {
  beforeEach(() => {
    getHealthStatusMock.mockReset()
  })

  it("megjeleníti a loading állapotot a kérés közben", () => {
    getHealthStatusMock.mockReturnValue(new Promise(() => undefined))

    render(<HealthPage />)

    expect(
      screen.getByRole("status", {
        name: "A backend állapotának lekérése folyamatban",
      }),
    ).toBeInTheDocument()
    expect(screen.getByText("Kapcsolódás folyamatban…")).toBeInTheDocument()
  })

  it("megjeleníti a sikeres UP állapotot", async () => {
    getHealthStatusMock.mockResolvedValue({ status: "UP" })

    render(<HealthPage />)

    expect(
      await screen.findByRole("heading", {
        name: "A szolgáltatás elérhető",
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Backend státusz: UP")).toBeInTheDocument()
  })

  it("emberi nyelvű hibát mutat sikertelen vagy hibás válasznál", async () => {
    getHealthStatusMock.mockRejectedValue(
      new HealthApiError("A health válasz formátuma vagy státusza hibás."),
    )

    render(<HealthPage />)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A szolgáltatás állapota most nem kérdezhető le.",
    )
    expect(screen.queryByText(/health válasz formátuma/i)).not.toBeInTheDocument()
  })

  it("kezeli a hálózati hibát", async () => {
    getHealthStatusMock.mockRejectedValue(new TypeError("Failed to fetch"))

    render(<HealthPage />)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ellenőrizd, hogy fut-e a backend",
    )
  })

  it("újrapróbálja a health kérést", async () => {
    const user = userEvent.setup()
    getHealthStatusMock
      .mockRejectedValueOnce(new HealthApiError("Átmeneti hiba"))
      .mockResolvedValueOnce({ status: "UP" })

    render(<HealthPage />)

    await screen.findByRole("alert")
    await user.click(screen.getByRole("button", { name: "Újrapróbálás" }))

    expect(
      await screen.findByRole("heading", {
        name: "A szolgáltatás elérhető",
      }),
    ).toBeInTheDocument()
    expect(getHealthStatusMock).toHaveBeenCalledTimes(2)
  })
})
