import type * as React from "react"
import { Toaster as Sonner } from "sonner"

function Toaster(props: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "border-border bg-popover text-popover-foreground shadow-xl font-sans",
          title: "font-semibold",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-secondary text-secondary-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
