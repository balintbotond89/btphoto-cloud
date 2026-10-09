export type ToastTone = "neutral" | "success" | "warning" | "error"

type ToastOptions = {
  tone?: ToastTone
  duration?: number
}

export function pushToast(
  region: HTMLElement,
  message: string,
  { tone = "neutral", duration = 4_000 }: ToastOptions = {},
) {
  const toast = document.createElement("div")
  const text = document.createElement("p")
  const dismissButton = document.createElement("button")

  toast.className = `toast toast--${tone}`
  toast.dataset.toast = ""
  if (tone === "error") {
    toast.setAttribute("role", "alert")
  }

  text.textContent = message
  dismissButton.type = "button"
  dismissButton.className = "toast__dismiss"
  dismissButton.setAttribute("aria-label", "Értesítés bezárása")
  dismissButton.textContent = "×"
  toast.append(text, dismissButton)
  region.append(toast)

  let timer = window.setTimeout(() => toast.remove(), duration)
  const dismiss = () => {
    window.clearTimeout(timer)
    toast.remove()
  }

  dismissButton.addEventListener("click", dismiss, { once: true })

  return {
    element: toast,
    dismiss,
    resetTimer(nextDuration = duration) {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => toast.remove(), nextDuration)
    },
  }
}
