import { useCallback, useEffect, useState } from "react"

import { getHealthStatus } from "@/api/health"

type HealthViewState =
  | { kind: "loading" }
  | { kind: "up"; status: "UP" }
  | { kind: "error" }

const HEALTH_ERROR_MESSAGE =
  "A szolgáltatás állapota most nem kérdezhető le. Ellenőrizd, hogy fut-e a backend, majd próbáld újra."

function useHealthStatus() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<HealthViewState>({ kind: "loading" })

  useEffect(() => {
    const controller = new AbortController()

    void getHealthStatus(controller.signal).then(
      (response) => {
        setState({ kind: "up", status: response.status })
      },
      () => {
        if (!controller.signal.aborted) {
          setState({ kind: "error" })
        }
      },
    )

    return () => {
      controller.abort()
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ kind: "loading" })
    setAttempt((currentAttempt) => currentAttempt + 1)
  }, [])

  return {
    state,
    retry,
    errorMessage: HEALTH_ERROR_MESSAGE,
  }
}

export { useHealthStatus }
export type { HealthViewState }
