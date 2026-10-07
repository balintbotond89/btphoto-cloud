import { RefreshCw, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"

type ErrorStateProps = {
  message: string
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <section
      className="rounded-2xl border border-destructive/25 bg-destructive/8 p-5"
      role="alert"
      aria-labelledby="health-error-title"
    >
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/12 text-destructive">
          <TriangleAlert aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 id="health-error-title" className="font-semibold">
            A kapcsolat megszakadt
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
      <Button className="mt-5 w-full sm:w-auto" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Újrapróbálás
      </Button>
    </section>
  )
}

export { ErrorState }
