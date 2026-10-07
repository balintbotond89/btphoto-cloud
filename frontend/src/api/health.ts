const HEALTH_ENDPOINT = "/api/health"

type HealthResponse = {
  status: "UP"
}

class HealthApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "HealthApiError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isHealthResponse(value: unknown): value is HealthResponse {
  return isRecord(value) && value.status === "UP"
}

async function getHealthStatus(signal?: AbortSignal): Promise<HealthResponse> {
  let response: Response

  try {
    response = await fetch(HEALTH_ENDPOINT, {
      headers: {
        Accept: "application/json",
      },
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause
    }

    throw new HealthApiError("A backend nem érhető el.", { cause })
  }

  if (!response.ok) {
    throw new HealthApiError(
      `A health végpont sikertelen választ adott (${response.status}).`,
    )
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch (cause) {
    throw new HealthApiError("A health válasz nem érvényes JSON.", { cause })
  }

  if (!isHealthResponse(payload)) {
    throw new HealthApiError("A health válasz formátuma vagy státusza hibás.")
  }

  return payload
}

export { getHealthStatus, HealthApiError }
export type { HealthResponse }
