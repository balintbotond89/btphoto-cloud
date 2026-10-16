import { ADMIN_ACCOUNT } from "@/test/account"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  authenticate,
  AuthApiError,
  endSession,
  getCsrfToken,
  getCurrentAdmin,
  type CsrfTokenResponse,
} from "@/api/auth"

const CSRF_TOKEN: CsrfTokenResponse = {
  headerName: "X-CSRF-TOKEN",
  parameterName: "_csrf",
  token: "test-csrf-token",
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn()
  responses.forEach((response) => fetchMock.mockResolvedValueOnce(response))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

describe("auth API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("same-origin munkamenettel lekéri és ellenőrzi a CSRF tokent", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify(CSRF_TOKEN), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    await expect(getCsrfToken()).resolves.toEqual(CSRF_TOKEN)
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/csrf",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      }),
    )
  })

  it("a bejelentkezési adatokat JSON-ként és CSRF fejléccel küldi", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify(ADMIN_ACCOUNT), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    await expect(
      authenticate({ identifier: "admin", password: "secret" }, CSRF_TOKEN),
    ).resolves.toEqual(ADMIN_ACCOUNT)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/login")
    expect(init.credentials).toBe("same-origin")
    expect(init.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": "test-csrf-token",
      }),
    )
    expect(JSON.parse(String(init.body))).toEqual({
      identifier: "admin",
      password: "secret",
    })
  })

  it("típusos, de backend részletet nem továbbító hibát ad 401 válasznál", async () => {
    stubFetch(
      new Response(
        JSON.stringify({
          code: "AUTHENTICATION_FAILED",
          message: "A megadott hitelesítési adatok érvénytelenek.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    )

    const result = authenticate(
      { identifier: "admin", password: "incorrect" },
      CSRF_TOKEN,
    )

    await expect(result).rejects.toMatchObject({
      name: "AuthApiError",
      status: 401,
      code: "AUTHENTICATION_FAILED",
    })
  })

  it("ellenőrzi az aktív admin munkamenet válaszát", async () => {
    stubFetch(
      new Response(JSON.stringify(ADMIN_ACCOUNT), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    await expect(getCurrentAdmin()).resolves.toEqual(ADMIN_ACCOUNT)
  })

  it("friss CSRF tokennel zárja le a munkamenetet", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify(CSRF_TOKEN), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      new Response(null, { status: 204 }),
    )

    await expect(endSession()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: expect.objectContaining({ "X-CSRF-TOKEN": "test-csrf-token" }),
      }),
    )
  })

  it("hibás CSRF payloadot nem fogad el", async () => {
    stubFetch(
      new Response(JSON.stringify({ token: "incomplete" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    await expect(getCsrfToken()).rejects.toBeInstanceOf(AuthApiError)
  })
})
