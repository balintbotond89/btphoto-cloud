import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  applyButtonInteractionStyles,
  calculateScrollProgress,
  CONTOUR_THRESHOLDS,
  countContourSegments,
  createContourGeometry,
  createInteractionVisuals,
  formatCoordinates,
  HoverProgressController,
  INTERACTION_VISUAL,
  mountMotionSystem,
  populateContourField,
  resolveMotionCapabilities,
  StableTargetResolver,
  writeInteractionVisuals,
} from "@/scripts/motion-system"

const globalStyles = readFileSync(
  resolve(process.cwd(), "src/styles/globals.css"),
  "utf8",
)

function getCssRule(selector: string) {
  const ruleStart = globalStyles.lastIndexOf(`${selector} {`)
  if (ruleStart === -1) {
    throw new Error(`Nem található CSS-szabály: ${selector}`)
  }

  const bodyStart = globalStyles.indexOf("{", ruleStart) + 1
  const bodyEnd = globalStyles.indexOf("}", bodyStart)
  return globalStyles.slice(bodyStart, bodyEnd)
}

function getCssDeclaration(rule: string, property: string) {
  const declaration = rule
    .split(";")
    .map((line) => line.trim())
    .find((line) => line.startsWith(`${property}:`))
  if (!declaration) {
    throw new Error(`Nem található CSS-deklaráció: ${property}`)
  }

  return declaration.slice(property.length + 1).trim()
}

function parseHexColor(value: string) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value)
  if (!match) {
    throw new Error(`Nem értelmezhető hexadecimális szín: ${value}`)
  }

  return match.slice(1).map((channel) => Number.parseInt(channel, 16) / 255)
}

function contrastRatio(first: number[], second: number[]) {
  const luminance = (color: number[]) => color
    .map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
  const lighter = Math.max(luminance(first), luminance(second))
  const darker = Math.min(luminance(first), luminance(second))
  return (lighter + 0.05) / (darker + 0.05)
}

function createMediaQuery(matches: boolean): MediaQueryList {
  return {
    matches,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
}

class TestIntersectionObserver {
  readonly root = null
  readonly rootMargin = "0px"
  readonly thresholds = [0]

  constructor(callback: IntersectionObserverCallback) { void callback }

  disconnect() {}
  observe(target: Element) { void target }
  takeRecords(): IntersectionObserverEntry[] { return [] }
  unobserve(target: Element) { void target }
}

function createRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  }
}

function createTarget(left: number, top: number, width = 100, height = 44) {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    enterRange: 32,
    exitRange: 52,
  }
}

function settle(controller: HoverProgressController) {
  for (let index = 0; index < 80; index += 1) {
    controller.step(32)
  }
  return controller.value
}

afterEach(() => {
  document.body.innerHTML = ""
  document.documentElement.className = ""
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("motion system", () => {
  it("csak finom, hoverképes mutatón engedélyezi a koordináta- és mágneses kurzort", () => {
    expect(
      resolveMotionCapabilities({
        finePointer: true,
        hover: true,
        coarsePointer: false,
        reducedMotion: false,
      }),
    ).toEqual({
      coordinateCursor: true,
      magneticCursor: true,
      continuousMotion: true,
      parallax: true,
    })

    expect(
      resolveMotionCapabilities({
        finePointer: false,
        hover: false,
        coarsePointer: true,
        reducedMotion: false,
      }),
    ).toEqual({
      coordinateCursor: false,
      magneticCursor: false,
      continuousMotion: true,
      parallax: true,
    })
  })

  it("mozgáscsökkentésnél letiltja a mágneses, folyamatos és parallax mozgást", () => {
    expect(
      resolveMotionCapabilities({
        finePointer: true,
        hover: true,
        coarsePointer: false,
        reducedMotion: true,
      }),
    ).toEqual({
      coordinateCursor: true,
      magneticCursor: false,
      continuousMotion: false,
      parallax: false,
    })
  })

  it("a hit-testinget kizárólag a nyers pointerpozíció határozza meg", () => {
    const resolver = new StableTargetResolver()
    const targets = [createTarget(100, 100)]
    const renderedPointer = { x: 140, y: 120 }

    expect(renderedPointer.x).toBeGreaterThan(targets[0].left)
    expect(resolver.resolve(20, 20, targets)).toBe(-1)
    expect(resolver.resolve(140, 120, targets)).toBe(0)
  })

  it("a gombon belüli pointermozgás zárolva tartja az aktív célt", () => {
    const resolver = new StableTargetResolver()
    const targets = [createTarget(100, 100)]

    expect(resolver.resolve(110, 110, targets)).toBe(0)
    expect(resolver.resolve(195, 135, targets)).toBe(0)
    expect(resolver.inside).toBe(true)
  })

  it("mozdulatlan pointernél ugyanazt a stabil állapotot adja vissza", () => {
    const resolver = new StableTargetResolver()
    const targets = [createTarget(100, 100)]

    expect(resolver.resolve(150, 120, targets)).toBe(0)
    const distance = resolver.distance
    expect(resolver.resolve(150, 120, targets)).toBe(0)
    expect(resolver.distance).toBe(distance)
    expect(resolver.inside).toBe(true)
  })

  it("átfedő céloknál is egyszerre pontosan egy aktív cél marad", () => {
    const resolver = new StableTargetResolver()
    const targets = [createTarget(100, 100), createTarget(130, 100)]

    expect(resolver.resolve(145, 120, targets)).toBe(0)
    expect(resolver.index).toBe(0)
  })

  it("a kitöltött gomb aktív végállapota körvonalas", () => {
    const values = writeInteractionVisuals(1, "filled", createInteractionVisuals())

    expect(values[INTERACTION_VISUAL.buttonFillOpacity]).toBe(0)
    expect(values[INTERACTION_VISUAL.buttonBaseWeight]).toBe(0)
  })

  it("a körvonalas gomb aktív végállapota kitöltött", () => {
    const values = writeInteractionVisuals(1, "outline", createInteractionVisuals())

    expect(values[INTERACTION_VISUAL.buttonFillOpacity]).toBe(1)
    expect(values[INTERACTION_VISUAL.buttonBaseWeight]).toBe(0)
  })

  it("a két gombváltozat kizárólag ellentétes opacitásirányban változtatja a kitöltést", () => {
    const progresses = [0, 0.5, 1]
    const filledOpacities = progresses.map((progress) => writeInteractionVisuals(
      progress,
      "filled",
      createInteractionVisuals(),
    )[INTERACTION_VISUAL.buttonFillOpacity])
    const outlineOpacities = progresses.map((progress) => writeInteractionVisuals(
      progress,
      "outline",
      createInteractionVisuals(),
    )[INTERACTION_VISUAL.buttonFillOpacity])

    expect(filledOpacities).toEqual([1, 0.5, 0])
    expect(outlineOpacities).toEqual([0, 0.5, 1])
  })

  it("a kitöltött és körvonalas variáns külön, saját színtokent használ", () => {
    const filledRule = getCssRule(".ui-button--solid")
    const outlineRule = getCssRule(".ui-button--outline")
    const sharedRule = getCssRule(".ui-button[data-button-variant]")

    expect(getCssDeclaration(filledRule, "--button-fill-color")).toBe("var(--oxide)")
    expect(getCssDeclaration(filledRule, "--button-border-base")).toBe("var(--oxide)")
    expect(getCssDeclaration(filledRule, "--button-border-hover")).toBe("var(--oxide)")
    expect(getCssDeclaration(outlineRule, "--button-fill-color")).toBe("var(--ink)")
    expect(getCssDeclaration(outlineRule, "--button-border-base")).toBe("var(--ink)")
    expect(getCssDeclaration(outlineRule, "--button-border-hover")).toBe("var(--ink)")
    expect(getCssDeclaration(outlineRule, "--button-base-color")).toBe("var(--ink)")
    expect(getCssDeclaration(outlineRule, "--button-hover-color")).toBe("var(--inverse)")
    expect(outlineRule).not.toContain("var(--oxide)")
    expect(sharedRule).toContain("var(--button-border-hover)")
  })

  it.each([
    ':root,\n:root[data-theme="light"]',
    ':root[data-theme="dark"]',
  ])("az outline kitöltés és felirat kontrasztja megfelelő: %s", (themeSelector) => {
    const themeRule = getCssRule(themeSelector)
    const fillColor = parseHexColor(getCssDeclaration(themeRule, "--ink"))
    const textColor = parseHexColor(getCssDeclaration(themeRule, "--inverse"))

    expect(contrastRatio(fillColor, textColor)).toBeGreaterThanOrEqual(4.5)
  })

  it("kilépéskor mindkét gombváltozat visszaáll a saját alapkitöltésére", () => {
    const filled = writeInteractionVisuals(0, "filled", createInteractionVisuals())
    const outline = writeInteractionVisuals(0, "outline", createInteractionVisuals())

    expect(filled[INTERACTION_VISUAL.buttonFillOpacity]).toBe(1)
    expect(outline[INTERACTION_VISUAL.buttonFillOpacity]).toBe(0)
  })

  it("a gomb szélessége, magassága és hitboxa minden progresszértéknél változatlan", () => {
    const button = document.createElement("button")
    const rect = createRect(100, 100, 160, 52)
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue(rect)
    const before = button.getBoundingClientRect()

    for (const variant of ["filled", "outline"] as const) {
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        const values = writeInteractionVisuals(progress, variant, createInteractionVisuals())
        applyButtonInteractionStyles(button, values, 3, -2)
        const after = button.getBoundingClientRect()

        expect(after.width).toBe(before.width)
        expect(after.height).toBe(before.height)
        expect(after).toEqual(before)
      }
    }
    expect(button.style.getPropertyValue("--pointer-fill-opacity")).not.toBe("")
    expect(button.style.getPropertyValue("transform")).toBe("")
    expect(button.style.getPropertyValue("clip-path")).toBe("")
    expect(button.style.getPropertyValue("width")).toBe("")
    expect(button.style.getPropertyValue("height")).toBe("")
    expect(button.style.getPropertyValue("inset")).toBe("")
  })

  it("a kitöltőréteg teljes felületű és geometriája minden állapotban állandó", () => {
    const rule = getCssRule(".ui-button[data-button-variant]::before")

    expect(rule).toContain("inset: 0;")
    expect(rule).toContain("width: auto;")
    expect(rule).toContain("height: auto;")
    expect(rule).toContain("opacity: var(--button-fill-opacity);")
    expect(rule).toContain("transform: none;")
    expect(rule).toContain("clip-path: none;")
    expect(rule).toContain("will-change: opacity;")
    expect(rule).not.toContain("scaleX(")
    expect(rule).not.toContain("scaleY(")
    expect(rule).not.toContain("transform-origin")
  })

  it("a koordinátakijelzés háttér nélküli, keret és árnyék nélküli, oxid színű szöveg", () => {
    const rule = getCssRule(".coordinate-overlay__readout")

    expect(rule).toContain("padding: 0;")
    expect(rule).toContain("border: 0;")
    expect(rule).toContain("background: transparent;")
    expect(rule).toContain("box-shadow: none;")
    expect(rule).toContain("color: var(--oxide);")
    expect(rule).toContain("backdrop-filter: none;")
  })

  it("a hoverfolyamat stabilan eléri a teljes végállapotot", () => {
    const controller = new HoverProgressController()
    controller.setTarget(1)

    expect(settle(controller)).toBe(1)
  })

  it("aktív hoverkor a rombusz teljesen kialakul", () => {
    const values = writeInteractionVisuals(1, "filled", createInteractionVisuals())

    expect(values[INTERACTION_VISUAL.diamondScale]).toBe(1)
    expect(values[INTERACTION_VISUAL.diamondRotation]).toBe(135)
    expect(values[INTERACTION_VISUAL.diamondFillOpacity]).toBe(1)
  })

  it("aktív hoverkor a kereszt és a koordinátakijelzés eltűnik", () => {
    const values = writeInteractionVisuals(1, "filled", createInteractionVisuals())

    expect(values[INTERACTION_VISUAL.crossScale]).toBe(0)
    expect(values[INTERACTION_VISUAL.crossOpacity]).toBe(0)
    expect(values[INTERACTION_VISUAL.readoutOpacity]).toBe(0)
  })

  it("kilépéskor ugyanazon progressz mentén visszatér a kereszt és a koordináta", () => {
    const controller = new HoverProgressController()
    controller.setTarget(1)
    controller.step(0, true)
    controller.setTarget(0)
    expect(settle(controller)).toBe(0)

    const values = writeInteractionVisuals(controller.value, "filled", createInteractionVisuals())
    expect(values[INTERACTION_VISUAL.crossScale]).toBe(1)
    expect(values[INTERACTION_VISUAL.readoutOpacity]).toBe(1)
  })

  it("gyors enter és leave után sem marad félkész vagy beragadt állapot", () => {
    const controller = new HoverProgressController()

    controller.setTarget(1)
    controller.step(16)
    controller.setTarget(0)

    expect(settle(controller)).toBe(0)
    expect(controller.target).toBe(0)
  })

  it("két szomszédos gomb közötti gyors váltás determinisztikus", () => {
    const resolver = new StableTargetResolver()
    const targets = [createTarget(0, 0), createTarget(120, 0)]

    expect(resolver.resolve(50, 20, targets)).toBe(0)
    expect(resolver.resolve(125, 20, targets)).toBe(1)
    expect(resolver.resolve(105, 20, targets)).toBe(1)
    expect(resolver.resolve(90, 20, targets)).toBe(0)
  })

  it("a proximity cél belépési és kilépési hiszterézist használ", () => {
    const resolver = new StableTargetResolver()
    const targets = [createTarget(100, 100)]

    expect(resolver.resolve(75, 120, targets)).toBe(0)
    expect(resolver.resolve(60, 120, targets)).toBe(0)
    expect(resolver.resolve(45, 120, targets)).toBe(-1)
  })

  it("reduced-motion módban nincs mágneses mozgás, de a kitöltéscsere végbemegy", () => {
    const capabilities = resolveMotionCapabilities({
      finePointer: true,
      hover: true,
      coarsePointer: false,
      reducedMotion: true,
    })
    const controller = new HoverProgressController()
    controller.setTarget(1)
    const progress = controller.step(16, true)
    const values = writeInteractionVisuals(progress, "outline", createInteractionVisuals())

    expect(capabilities.magneticCursor).toBe(false)
    expect(progress).toBe(1)
    expect(values[INTERACTION_VISUAL.buttonFillOpacity]).toBe(1)
  })

  it("stabil koordinátaformátumot készít", () => {
    expect(formatCoordinates(7.4, 92.8)).toBe("X 0007 / Y 0093")
    expect(formatCoordinates(-4, 0)).toBe("X 0000 / Y 0000")
  })

  it("a scrollpozíciót nulla és egy közé korlátozza", () => {
    expect(calculateScrollProgress(0, 800, 1_600, 400)).toBe(0)
    expect(calculateScrollProgress(1_000, 800, 1_000, 600)).toBeCloseTo(0.5714, 3)
    expect(calculateScrollProgress(2_500, 800, 1_000, 600)).toBe(1)
  })

  it("a skalármező több küszöbszinten állít elő kontúrokat", () => {
    const geometry = createContourGeometry(960, 540, 18)
    populateContourField(geometry, 0)
    const counts = countContourSegments(geometry)
    const populatedLevels = Array.from(counts).filter((count) => count > 0)

    expect(CONTOUR_THRESHOLDS).toHaveLength(8)
    expect(populatedLevels.length).toBeGreaterThanOrEqual(7)
    expect(populatedLevels.every((count) => count > 10)).toBe(true)
  })

  it("a kurzor körüli kétdimenziós zavarás több kontúrszint geometriáját módosítja", () => {
    const baseGeometry = createContourGeometry(960, 540, 18)
    const disturbedGeometry = createContourGeometry(960, 540, 18)
    populateContourField(baseGeometry, 1_200)
    populateContourField(disturbedGeometry, 1_200, 470, 270, 1)
    const baseCounts = countContourSegments(baseGeometry)
    const disturbedCounts = countContourSegments(disturbedGeometry)
    let changedLevels = 0

    for (let index = 0; index < baseCounts.length; index += 1) {
      if (baseCounts[index] !== disturbedCounts[index]) {
        changedLevels += 1
      }
    }

    expect(changedLevels).toBeGreaterThanOrEqual(3)
  })

  it("átméretezéshez új rácsgeometriát számít", () => {
    const desktop = createContourGeometry(1_280, 720)
    const mobile = createContourGeometry(390, 720)

    expect(desktop.columns).toBeGreaterThan(mobile.columns)
    expect(desktop.values.length).toBe(desktop.columns * desktop.rows)
    expect(mobile.values.length).toBe(mobile.columns * mobile.rows)
    expect(desktop.cellWidth).toBeLessThanOrEqual(16)
    expect(mobile.cellWidth).toBeLessThanOrEqual(16)
  })

  it("a belépő layoutanimáció után újraméri a stabil gombhatárt", () => {
    document.body.innerHTML = `
      <div data-coordinate-overlay aria-hidden="true">
        <span data-coordinate-readout></span>
      </div>
      <canvas data-wave-canvas></canvas>
      <div data-reveal>
        <button type="button" data-button-variant="filled"><span>Művelet</span></button>
      </div>
    `
    const canvas = document.querySelector<HTMLCanvasElement>("canvas")
    const reveal = document.querySelector<HTMLElement>("[data-reveal]")
    const button = document.querySelector<HTMLButtonElement>("button")
    if (!canvas || !reveal || !button) {
      throw new Error("A motion teszt-fixture nem jött létre.")
    }

    const context = {
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      globalAlpha: 1,
      lineTo: vi.fn(),
      lineWidth: 1,
      moveTo: vi.fn(),
      setTransform: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: "",
    } as unknown as CanvasRenderingContext2D
    let buttonTop = 130
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context)
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(createRect(0, 0, 800, 500))
    vi.spyOn(button, "getBoundingClientRect").mockImplementation(
      () => createRect(100, buttonTop, 160, 52),
    )
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => createMediaQuery(
        query.includes("pointer: fine")
          || query.includes("hover: hover")
          || query.includes("prefers-reduced-motion"),
      )),
    )
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1))
    vi.stubGlobal("cancelAnimationFrame", vi.fn())

    const cleanup = mountMotionSystem()
    buttonTop = 100
    reveal.dispatchEvent(new Event("animationend"))
    button.dispatchEvent(new MouseEvent("pointermove", {
      bubbles: true,
      clientX: 140,
      clientY: 110,
    }))

    expect(button.style.getPropertyValue("--pointer-fill-opacity")).toBe("0.0000")
    cleanup()
  })

  it("cleanup után megszünteti az animation frame-et és a pointerkezelést", () => {
    document.body.innerHTML = `
      <div data-coordinate-overlay aria-hidden="true">
        <span data-coordinate-readout></span>
      </div>
      <canvas data-wave-canvas></canvas>
      <button type="button" data-button-variant="filled"><span>Művelet</span></button>
    `
    const canvas = document.querySelector<HTMLCanvasElement>("canvas")
    const button = document.querySelector<HTMLButtonElement>("button")
    if (!canvas || !button) {
      throw new Error("A motion teszt-fixture nem jött létre.")
    }

    const context = {
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      globalAlpha: 1,
      lineTo: vi.fn(),
      lineWidth: 1,
      moveTo: vi.fn(),
      setTransform: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: "",
    } as unknown as CanvasRenderingContext2D
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context)
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(createRect(0, 0, 800, 500))
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue(createRect(100, 100, 160, 52))
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => createMediaQuery(
        query.includes("pointer: fine") || query.includes("hover: hover"),
      )),
    )

    let nextFrameId = 1
    const activeFrames = new Map<number, FrameRequestCallback>()
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      const frameId = nextFrameId
      nextFrameId += 1
      activeFrames.set(frameId, callback)
      return frameId
    }))
    vi.stubGlobal("cancelAnimationFrame", vi.fn((frameId: number) => {
      activeFrames.delete(frameId)
    }))

    const cleanup = mountMotionSystem()
    expect(activeFrames.size).toBe(1)

    button.dispatchEvent(new MouseEvent("pointermove", {
      bubbles: true,
      clientX: 140,
      clientY: 120,
    }))
    const pendingFrame = activeFrames.entries().next().value as
      | [number, FrameRequestCallback]
      | undefined
    if (!pendingFrame) {
      throw new Error("Az animációs képkocka nem jött létre.")
    }
    activeFrames.delete(pendingFrame[0])
    pendingFrame[1](16.67)
    expect(button.style.getPropertyValue("--pointer-fill-opacity")).not.toBe("")

    cleanup()
    expect(activeFrames.size).toBe(0)
    expect(button.style.getPropertyValue("--pointer-fill-opacity")).toBe("")

    button.dispatchEvent(new MouseEvent("pointermove", {
      bubbles: true,
      clientX: 140,
      clientY: 120,
    }))
    expect(button.style.getPropertyValue("--pointer-fill-opacity")).toBe("")
  })
})
