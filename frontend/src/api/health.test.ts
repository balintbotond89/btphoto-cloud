import { afterEach, describe, expect, it, vi } from "vitest"

import { getHealthStatus, HealthApiError } from "@/api/health"

function stubFetch(result: Response | Promise<never>) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(result)))
}

describe("getHealthStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("elfogadja az érvényes UP választ", async () => {
    stubFetch(
      new Response(JSON.stringify({ status: "UP" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    await expect(getHealthStatus()).resolves.toEqual({ status: "UP" })
    expect(fetch).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    )
  })

  it("elutasítja a sikertelen HTTP választ", async () => {
    stubFetch(new Response(null, { status: 503 }))

    await expect(getHealthStatus()).rejects.toBeInstanceOf(HealthApiError)
  })

  it("elutasítja a hibás health payloadot", async () => {
    stubFetch(
      new Response(JSON.stringify({ status: "DOWN" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    await expect(getHealthStatus()).rejects.toThrow(
      "A health válasz formátuma vagy státusza hibás.",
    )
  })

  it("típusos hibára fordítja a hálózati hibát", async () => {
    const networkFailure = Promise.reject(new TypeError("Network error"))
    stubFetch(networkFailure)

    await expect(getHealthStatus()).rejects.toThrow("A backend nem érhető el.")
  })
})
