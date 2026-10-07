function LoadingState() {
  return (
    <section
      className="space-y-5"
      role="status"
      aria-live="polite"
      aria-label="A backend állapotának lekérése folyamatban"
    >
      <div className="flex items-center gap-4">
        <span className="size-3 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
        <div className="space-y-2">
          <div className="h-4 w-40 animate-pulse rounded-full bg-secondary motion-reduce:animate-none" />
          <div className="h-3 w-56 max-w-full animate-pulse rounded-full bg-secondary/70 motion-reduce:animate-none" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Kapcsolódás folyamatban…</p>
    </section>
  )
}

export { LoadingState }
