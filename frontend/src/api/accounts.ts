import { authFetch, createResponseError, getCsrfToken, readJson } from "@/api/auth"

type Address = { country: string; postalCode: string; city: string; line1: string; line2?: string | null }
type Business = { type: string; name: string; taxNumber: string; registrationNumber?: string | null; address: Address }
type Registration = {
  lastName: string; firstName: string; salutation: string; email: string
  password: string; passwordConfirmation: string; phone: string; mobile: string
  homeAddress: Address | null; siteAddress: Address | null; hasBusiness: boolean; business: Business | null
}
type Profile = {
  accountId: string; workspaceId: string; lastName: string; firstName: string
  salutation: string | null; email: string; phone: string | null; mobile: string | null
  homeAddress: Address | null; siteAddress: Address | null; business: Business | null; avatarUrl: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isAddress(value: unknown): value is Address {
  return isRecord(value) && ["country", "postalCode", "city", "line1"].every((key) =>
    typeof value[key] === "string") &&
    (value.line2 === undefined || value.line2 === null || typeof value.line2 === "string")
}

function isBusiness(value: unknown): value is Business {
  return isRecord(value) && ["type", "name", "taxNumber"].every((key) => typeof value[key] === "string") &&
    (value.registrationNumber === null || value.registrationNumber === undefined ||
      typeof value.registrationNumber === "string") && isAddress(value.address)
}

function isProfile(value: unknown): value is Profile {
  if (typeof value !== "object" || value === null) return false
  const row = value as Record<string, unknown>
  return ["accountId", "workspaceId", "lastName", "firstName", "email"].every(
    (key) => typeof row[key] === "string",
  ) && ["salutation", "phone", "mobile"].every((key) => row[key] === null || typeof row[key] === "string") &&
    (row.homeAddress === null || isAddress(row.homeAddress)) &&
    (row.siteAddress === null || isAddress(row.siteAddress)) &&
    (row.business === null || isBusiness(row.business)) && (row.avatarUrl === null || (
    typeof row.avatarUrl === "string" &&
    /^\/api\/(photographer\/profile|admin\/registrations\/[0-9a-f-]{36})\/avatar$/.test(row.avatarUrl)
  ))
}

async function mutate(endpoint: string, body?: BodyInit, contentType?: string) {
  const csrf = await getCsrfToken()
  const response = await authFetch(endpoint, {
    method: "POST", cache: "no-store",
    headers: { Accept: "application/json", [csrf.headerName]: csrf.token,
      ...(contentType ? { "Content-Type": contentType } : {}) },
    body,
  })
  if (!response.ok) throw await createResponseError(response)
  return response
}

async function getRegistrationConfiguration(): Promise<{ siteKey: string }> {
  const response = await authFetch("/api/auth/registration-config", { cache: "no-store" })
  if (!response.ok) throw await createResponseError(response)
  const result = await readJson(response)
  if (!isRecord(result) || result.provider !== "recaptcha-v2" || typeof result.siteKey !== "string") {
    throw new Error("Hibás CAPTCHA-konfiguráció.")
  }
  return { siteKey: result.siteKey }
}

async function register(data: Registration, avatar?: File, captcha?: string) {
  const body = new FormData()
  body.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }))
  if (avatar) body.append("avatar", avatar)
  if (captcha) body.append("captcha", captcha)
  const response = await mutate("/api/auth/register", body)
  const result = await readJson(response)
  if (typeof result !== "object" || result === null || !("status" in result) || result.status !== "PENDING") {
    throw new Error("Hibás regisztrációs válasz.")
  }
}

async function getProfile(): Promise<Profile> {
  const response = await authFetch("/api/photographer/profile", { cache: "no-store" })
  if (!response.ok) throw await createResponseError(response)
  const result = await readJson(response)
  if (!isProfile(result)) throw new Error("Hibás profilválasz.")
  return result
}

async function getRegistrations(): Promise<Profile[]> {
  const response = await authFetch("/api/admin/registrations", { cache: "no-store" })
  if (!response.ok) throw await createResponseError(response)
  const result = await readJson(response)
  if (!Array.isArray(result) || !result.every(isProfile)) throw new Error("Hibás regisztrációs lista.")
  return result
}

async function decideRegistration(id: string, approve: boolean) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Hibás kérelemazonosító.")
  await mutate(`/api/admin/registrations/${id}/${approve ? "approve" : "reject"}`)
}

async function changePassword(currentPassword: string, newPassword: string, confirmation: string) {
  await mutate("/api/auth/change-password",
    JSON.stringify({ currentPassword, newPassword, confirmation }), "application/json")
}

export { changePassword, decideRegistration, getProfile, getRegistrations, getRegistrationConfiguration, register }
export type { Address, Business, Profile, Registration }
