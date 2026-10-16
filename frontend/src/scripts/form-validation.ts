type FormField = HTMLInputElement | HTMLSelectElement

function clearFieldError(input: FormField) {
  const errorId = `${input.id}-validation-error`
  document.getElementById(errorId)?.remove()
  const descriptions = (input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== errorId)
  if (descriptions.length) input.setAttribute("aria-describedby", descriptions.join(" "))
  else input.removeAttribute("aria-describedby")
  input.removeAttribute("aria-invalid")
}

function showFieldError(input: FormField, message: string) {
  clearFieldError(input)
  const error = document.createElement("p")
  error.id = `${input.id}-validation-error`
  error.className = "ui-field__error"
  error.textContent = message
  input.insertAdjacentElement("afterend", error)
  const descriptions = input.getAttribute("aria-describedby")
  input.setAttribute("aria-describedby", [descriptions, error.id].filter(Boolean).join(" "))
  input.setAttribute("aria-invalid", "true")
}

function validateFormFields(form: HTMLFormElement): FormField | undefined {
  let firstInvalid: FormField | undefined
  form.querySelectorAll<FormField>("input, select").forEach((input) => {
    clearFieldError(input)
    if (!input.willValidate) return
    let message = ""
    if (input.validity.valueMissing || (input.required && !input.value.trim())) {
      message = "A mező kitöltése kötelező."
    } else if (input.validity.typeMismatch) {
      message = input instanceof HTMLInputElement && input.type === "email"
        ? "Adjon meg érvényes e-mail-címet." : "A mező formátuma érvénytelen."
    } else if (!input.validity.valid) {
      message = input.validity.customError ? input.validationMessage : "Ellenőrizze a mező hosszát és formátumát."
    }
    if (message) {
      showFieldError(input, message)
      firstInvalid ??= input
    }
  })
  return firstInvalid
}

export { clearFieldError, showFieldError, validateFormFields }
