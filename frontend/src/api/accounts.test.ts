import { afterEach, describe, expect, it, vi } from "vitest"
import { changePassword, decideRegistration, getProfile, getRegistrations, register, type Registration } from "@/api/accounts"

const csrf = { headerName: "X-CSRF-TOKEN", parameterName: "_csrf", token: "fixture-token" }
const profile = {
  accountId: "11111111-1111-1111-1111-111111111111", workspaceId: "22222222-2222-2222-2222-222222222222",
  lastName: "Fotós", firstName: "Fixture", email: "photo@fixture.test", salutation: null,
  phone: null, mobile: null, homeAddress: null, siteAddress: null, business: null, avatarUrl: null,
}
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } })
}
function fetchStub(...responses: Response[]) {
  const fetch = vi.fn()
  for (const response of responses) fetch.mockResolvedValueOnce(response)
  vi.stubGlobal("fetch", fetch)
  return fetch
}
describe("account API", () => {
  afterEach(() => vi.unstubAllGlobals())
  it("multipart regisztráció friss CSRF-fel, same-origin sessionnel és jogosultságmezők nélkül", async () => {
    const fetch = fetchStub(json(csrf), json({ status: "PENDING" }, 201))
    const data: Registration = { lastName: "Fotós", firstName: "Fixture", salutation: "", email: "photo@fixture.test",
      password: "fixture-password", passwordConfirmation: "fixture-password", phone: "", mobile: "",
      homeAddress: null, siteAddress: null, hasBusiness: false, business: null }
    await register(data, undefined, "fixture-captcha-response")
    const [endpoint, request] = fetch.mock.calls[1] as [string, RequestInit]
    expect(endpoint).toBe("/api/auth/register")
    expect(request.credentials).toBe("same-origin")
    expect(request.headers).toMatchObject({ "X-CSRF-TOKEN": "fixture-token" })
    expect(request.body).toBeInstanceOf(FormData)
    expect((request.body as FormData).get("captcha")).toBe("fixture-captcha-response")
    expect(request.headers).not.toHaveProperty("Content-Type")
    expect(data).not.toHaveProperty("role")
  })
  it("saját profilt és operátori listát típusellenőrzéssel kér le", async () => {
    fetchStub(json(profile), json([profile]))
    await expect(getProfile()).resolves.toEqual(profile)
    await expect(getRegistrations()).resolves.toEqual([profile])
  })
  it("hamis avatar URL és hibás lista nem használható", async () => {
    fetchStub(json({ ...profile, avatarUrl: "https://untrusted.example/avatar.png" }), json({ rows: [profile] }))
    await expect(getProfile()).rejects.toThrow()
    await expect(getRegistrations()).rejects.toThrow()
  })
  it("minden elbírálás és jelszócsere előtt új CSRF-t kér", async () => {
    const fetch = fetchStub(json(csrf), new Response(null, { status: 204 }),
      json(csrf), new Response(null, { status: 204 }))
    await decideRegistration(profile.accountId, true)
    await changePassword("current-fixture", "changed-fixture-password", "changed-fixture-password")
    expect(fetch.mock.calls.filter(([path]) => path === "/api/auth/csrf")).toHaveLength(2)
    expect(fetch.mock.calls[1][0]).toBe(`/api/admin/registrations/${profile.accountId}/approve`)
    expect(fetch.mock.calls[3][0]).toBe("/api/auth/change-password")
    expect(fetch.mock.calls[3][1].body).toContain('"confirmation":"changed-fixture-password"')
  })
  it("429 és mezőhiba biztonságos típusos hiba, nyers backend üzenet nélkül", async () => {
    fetchStub(json(csrf), json({ code: "RATE_LIMITED", message: "internal-details" }, 429))
    await expect(changePassword("", "fixture-password", "fixture-password")).rejects.toMatchObject({
      status: 429, code: "RATE_LIMITED",
    })
  })
})
