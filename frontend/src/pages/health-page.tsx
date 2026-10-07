import { CheckCircle2, Cloud, Info } from "lucide-react"

import { SiteShell } from "@/components/layout/site-shell"
import { ErrorState } from "@/components/feedback/error-state"
import { LoadingState } from "@/components/feedback/loading-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useHealthStatus } from "@/hooks/use-health-status"

function HealthPage() {
  const { state, retry, errorMessage } = useHealthStatus()

  return (
    <SiteShell>
      <main className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-5 py-10 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:px-12 lg:py-24">
        <section aria-labelledby="page-title" className="max-w-3xl">
          <Badge variant="outline" className="mb-6 bg-background/60">
            <Cloud aria-hidden="true" className="size-3.5" />
            Saját infrastruktúra
          </Badge>
          <h1
            id="page-title"
            className="max-w-2xl font-serif text-5xl font-semibold leading-[0.96] tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl"
          >
            A képeknek hely kell. A bizalomnak is.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
            A BTPhoto Private Cloud egy fotós munkafolyamatokra tervezett,
            privát felület. Ez az első frontend checkpoint a böngésző és a
            Spring Boot backend közötti kapcsolatot igazolja.
          </p>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="mt-6 -ml-3">
                <Info aria-hidden="true" />
                Mit ellenőriz ez az oldal?
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Walking skeleton állapot</DialogTitle>
                <DialogDescription>
                  A frontend a relatív <code>/api/health</code> útvonalon kéri
                  le a backend Actuator health válaszát. Üzleti vagy személyes
                  adatot ez a kérés nem továbbít.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Rendben</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>

        <Card className="relative overflow-hidden bg-card/90 backdrop-blur-sm">
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-copper to-accent"
            aria-hidden="true"
          />
          <CardHeader>
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Rendszerkapcsolat
              </span>
              {state.kind === "up" ? (
                <Badge variant="success" aria-label="Backend státusz: UP">
                  {state.status}
                </Badge>
              ) : null}
            </div>
            <CardTitle>Backend health</CardTitle>
            <CardDescription>
              A kliens a szerver publikus diagnosztikai végpontját ellenőrzi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state.kind === "loading" ? <LoadingState /> : null}

            {state.kind === "up" ? (
              <section className="rounded-2xl border border-success/25 bg-success/8 p-5" aria-live="polite">
                <div className="flex items-start gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold">A szolgáltatás elérhető</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      A frontend érvényes <strong>UP</strong> választ kapott a
                      backendtől.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {state.kind === "error" ? (
              <ErrorState message={errorMessage} onRetry={retry} />
            ) : null}
          </CardContent>
        </Card>
      </main>
    </SiteShell>
  )
}

export { HealthPage }
