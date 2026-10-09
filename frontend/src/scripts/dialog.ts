const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

function getFocusableElements(dialog: HTMLDialogElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hidden,
  )
}

export function mountDialog(root: HTMLElement) {
  const trigger = root.querySelector<HTMLButtonElement>("[data-dialog-open]")
  const dialog = root.querySelector<HTMLDialogElement>("[data-dialog]")
  const closeButton = root.querySelector<HTMLButtonElement>("[data-dialog-close]")

  if (!trigger || !dialog || !closeButton) {
    throw new Error("A dialog kötelező elemei hiányoznak.")
  }

  let returnFocus: HTMLElement | null = null

  const openDialog = () => {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : trigger
    dialog.showModal()
    queueMicrotask(() => getFocusableElements(dialog)[0]?.focus())
  }

  const closeDialog = () => {
    if (dialog.open) {
      dialog.close()
    }
  }

  const handleClose = () => {
    returnFocus?.focus()
  }

  const handleCancel = (event: Event) => {
    event.preventDefault()
    closeDialog()
  }

  const handleBackdrop = (event: MouseEvent) => {
    if (event.target === dialog) {
      closeDialog()
    }
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault()
      closeDialog()
      return
    }

    if (event.key !== "Tab") {
      return
    }

    const focusable = getFocusableElements(dialog)
    const first = focusable[0]
    const last = focusable.at(-1)

    if (!first || !last) {
      event.preventDefault()
      dialog.focus()
      return
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  trigger.addEventListener("click", openDialog)
  closeButton.addEventListener("click", closeDialog)
  dialog.addEventListener("close", handleClose)
  dialog.addEventListener("cancel", handleCancel)
  dialog.addEventListener("click", handleBackdrop)
  dialog.addEventListener("keydown", handleKeydown)

  return () => {
    trigger.removeEventListener("click", openDialog)
    closeButton.removeEventListener("click", closeDialog)
    dialog.removeEventListener("close", handleClose)
    dialog.removeEventListener("cancel", handleCancel)
    dialog.removeEventListener("click", handleBackdrop)
    dialog.removeEventListener("keydown", handleKeydown)
  }
}
