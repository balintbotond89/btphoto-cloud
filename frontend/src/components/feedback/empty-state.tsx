import { ImageOff } from "lucide-react"
import type { ReactNode } from "react"

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-secondary/35 p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-background text-muted-foreground">
        <ImageOff aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-4 font-serif text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  )
}

export { EmptyState }
