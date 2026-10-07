import "@fontsource-variable/cormorant-garamond"
import "@fontsource-variable/manrope"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "@/app/App"
import "@/styles/globals.css"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("A React gyökérelem nem található.")
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
