const AUTH_CSRF_ENDPOINT = "/api/auth/csrf"
const AUTH_LOGIN_ENDPOINT = "/api/auth/login"
const AUTH_ME_ENDPOINT = "/api/auth/me"
const AUTH_LOGOUT_ENDPOINT = "/api/auth/logout"

type CsrfTokenResponse = {
  headerName: string
  parameterName: string
  token: string
}

type LoginCredentials = {
  identifier: string
  password: string
}

type AuthenticatedAdmin = {
  username: string
  role: "ADMIN" | "PHOTOGRAPHER"
  displayName: string
  requiresPasswordChange: boolean
  workspaceId: string | null
  avatarUrl: string | null
}

class AuthApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly fields: Readonly<Record<string, string>>

  constructor(
    message: string,
    { status = 0, code, cause, fields = {} }: {
      status?: number; code?: string; cause?: unknown; fields?: Record<string, string>
    } = {},
  ) {
    super(message, { cause })
    this.name = "AuthApiError"
    this.status = status
    this.code = code
    this.fields = Object.freeze({ ...fields })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isCsrfTokenResponse(value: unknown): value is CsrfTokenResponse {
  return (
    isRecord(value) &&
    isNonEmptyString(value.headerName) &&
    isNonEmptyString(value.parameterName) &&
    isNonEmptyString(value.token)
  )
}

function isAuthenticatedAdmin(value: unknown): value is AuthenticatedAdmin {
  return isRecord(value) && isNonEmptyString(value.username) && isNonEmptyString(value.displayName) &&
    (value.role === "ADMIN" || value.role === "PHOTOGRAPHER") &&
    typeof value.requiresPasswordChange === "boolean" &&
    (value.workspaceId === null || typeof value.workspaceId === "string") &&
    (value.avatarUrl === null || value.avatarUrl === "/api/photographer/profile/avatar")
}

async function authFetch(
  endpoint: string,
  init: Omit<RequestInit, "credentials"> = {},
): Promise<Response> {
  try {
    return await fetch(endpoint, {
      ...init,
      credentials: "same-origin",
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause
    }

    throw new AuthApiError("A hitelesítési szolgáltatás nem érhető el.", {
      code: "NETWORK_ERROR",
      cause,
    })
  }
}

async function createResponseError(response: Response): Promise<AuthApiError> {
  let code: string | undefined
  const fields: Record<string, string> = {}

  try {
    const payload: unknown = await response.json()
    if (isRecord(payload) && isNonEmptyString(payload.code)) {
      code = payload.code
    }
    if (isRecord(payload) && isRecord(payload.fields)) {
      for (const [key, value] of Object.entries(payload.fields)) {
        if (/^[a-zA-Z.]+$/.test(key) && typeof value === "string") fields[key] = value
      }
    }
  } catch {
    // A hibaválasz törzse opcionális; a státuszkód továbbra is elegendő.
  }

  return new AuthApiError("A hitelesítési kérés sikertelen.", {
    status: response.status,
    code,
    fields,
  })
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (cause) {
    throw new AuthApiError("A hitelesítési válasz nem érvényes JSON.", {
      status: response.status,
      code: "INVALID_RESPONSE",
      cause,
    })
  }
}

async function getCsrfToken(signal?: AbortSignal): Promise<CsrfTokenResponse> {
  const response = await authFetch(AUTH_CSRF_ENDPOINT, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  })

  if (!response.ok) {
    throw await createResponseError(response)
  }

  const payload = await readJson(response)
  if (!isCsrfTokenResponse(payload)) {
    throw new AuthApiError("A CSRF-válasz formátuma hibás.", {
      status: response.status,
      code: "INVALID_RESPONSE",
    })
  }

  return payload
}

async function authenticate(
  credentials: LoginCredentials,
  csrfToken: CsrfTokenResponse,
  signal?: AbortSignal,
): Promise<AuthenticatedAdmin> {
  const response = await authFetch(AUTH_LOGIN_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [csrfToken.headerName]: csrfToken.token,
    },
    body: JSON.stringify(credentials),
    signal,
  })

  if (!response.ok) {
    throw await createResponseError(response)
  }

  const payload = await readJson(response)
  if (!isAuthenticatedAdmin(payload)) {
    throw new AuthApiError("A bejelentkezési válasz formátuma hibás.", {
      status: response.status,
      code: "INVALID_RESPONSE",
    })
  }

  return payload
}

async function getCurrentAdmin(signal?: AbortSignal): Promise<AuthenticatedAdmin> {
  const response = await authFetch(AUTH_ME_ENDPOINT, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  })

  if (!response.ok) {
    throw await createResponseError(response)
  }

  const payload = await readJson(response)
  if (!isAuthenticatedAdmin(payload)) {
    throw new AuthApiError("A munkamenet-válasz formátuma hibás.", {
      status: response.status,
      code: "INVALID_RESPONSE",
    })
  }

  return payload
}

async function endSession(signal?: AbortSignal): Promise<void> {
  const csrfToken = await getCsrfToken(signal)
  const response = await authFetch(AUTH_LOGOUT_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      [csrfToken.headerName]: csrfToken.token,
    },
    signal,
  })

  if (!response.ok) {
    throw await createResponseError(response)
  }
}

export { authenticate, AuthApiError, endSession, getCsrfToken, getCurrentAdmin,
  authFetch, createResponseError, readJson }
export type { AuthenticatedAdmin, CsrfTokenResponse, LoginCredentials }
