import { Camera } from "lucide-react"
import type { ReactNode } from "react"

type SiteShellProps = {
  children: ReactNode
}

function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="relative min-h-svh overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,var(--ambient-copper),transparent_32rem),linear-gradient(135deg,var(--background),var(--surface-soft))]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-28 top-28 -z-10 size-72 rotate-12 rounded-[4rem] border border-accent/20 bg-accent/10 sm:size-96"
        aria-hidden="true"
      />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3" aria-label="BTPhoto Private Cloud">
          <span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Camera aria-hidden="true" className="size-5" />
          </span>
          <span>
            <span className="block font-serif text-2xl font-semibold leading-none">
              BTPhoto
            </span>
            <span className="mt-1 block text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Private Cloud
            </span>
          </span>
        </div>
        <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:block">
          Walking skeleton
        </span>
      </header>

      {children}

      <footer className="mx-auto w-full max-w-7xl px-5 pb-8 pt-4 text-xs text-muted-foreground sm:px-8 lg:px-12">
        Saját infrastruktúrára tervezett, privát fotós munkafolyamat.
      </footer>
    </div>
  )
}

export { SiteShell }
