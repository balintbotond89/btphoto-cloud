type MotionCapabilityInput = {
  finePointer: boolean
  hover: boolean
  coarsePointer: boolean
  reducedMotion: boolean
}

export type MotionCapabilities = {
  coordinateCursor: boolean
  magneticCursor: boolean
  continuousMotion: boolean
  parallax: boolean
}

export type ButtonVariant = "filled" | "outline"

export type InteractionTargetBounds = {
  left: number
  top: number
  right: number
  bottom: number
  centerX: number
  centerY: number
  enterRange: number
  exitRange: number
}

export type ContourGeometry = {
  width: number
  height: number
  columns: number
  rows: number
  cellWidth: number
  cellHeight: number
  values: Float32Array
  sourceCenters: Float32Array
}

type ScrollElement = {
  element: HTMLElement
  top: number
  height: number
  factor: number
}

type MagneticItem = InteractionTargetBounds & {
  element: HTMLElement
  variant: ButtonVariant
}

type TopographicSource = {
  x: number
  y: number
  radiusX: number
  radiusY: number
  strength: number
  cosine: number
  sine: number
  phase: number
}

type SegmentVisitor = (x1: number, y1: number, x2: number, y2: number) => void

const TOPOGRAPHIC_SOURCES: readonly TopographicSource[] = [
  { x: 0.14, y: 0.26, radiusX: 0.17, radiusY: 0.25, strength: 0.98, cosine: Math.cos(0.28), sine: Math.sin(0.28), phase: 0.3 },
  { x: 0.43, y: 0.2, radiusX: 0.14, radiusY: 0.18, strength: 0.82, cosine: Math.cos(-0.46), sine: Math.sin(-0.46), phase: 1.8 },
  { x: 0.76, y: 0.3, radiusX: 0.2, radiusY: 0.24, strength: 1.02, cosine: Math.cos(0.58), sine: Math.sin(0.58), phase: 3.1 },
  { x: 0.28, y: 0.72, radiusX: 0.2, radiusY: 0.22, strength: 0.9, cosine: Math.cos(-0.2), sine: Math.sin(-0.2), phase: 4.4 },
  { x: 0.63, y: 0.7, radiusX: 0.15, radiusY: 0.26, strength: 0.94, cosine: Math.cos(0.76), sine: Math.sin(0.76), phase: 5.6 },
  { x: 0.91, y: 0.76, radiusX: 0.13, radiusY: 0.2, strength: 0.78, cosine: Math.cos(-0.62), sine: Math.sin(-0.62), phase: 2.5 },
]

export const CONTOUR_THRESHOLDS = [0.18, 0.26, 0.34, 0.42, 0.5, 0.58, 0.66, 0.74] as const

const MAGNETIC_SELECTOR = "[data-button-variant]"
const DEFAULT_GRID_SIZE = 16

export const INTERACTION_VISUAL = {
  crossScale: 0,
  crossOpacity: 1,
  diamondScale: 2,
  diamondRotation: 3,
  diamondFillOpacity: 4,
  readoutOpacity: 5,
  magneticStrength: 6,
  buttonFillOpacity: 7,
  buttonBaseWeight: 8,
  arrowShift: 9,
} as const

const INTERACTION_VISUAL_COUNT = 10

export class HoverProgressController {
  private currentValue = 0
  private targetValue = 0

  get value() {
    return this.currentValue
  }

  get target() {
    return this.targetValue
  }

  setTarget(value: number) {
    this.targetValue = clamp(value, 0, 1)
  }

  step(deltaMs: number, reducedMotion = false) {
    if (reducedMotion) {
      this.currentValue = this.targetValue
      return this.currentValue
    }

    const seconds = clamp(deltaMs, 0, 32) / 1_000
    const nextValue = this.currentValue
      + (this.targetValue - this.currentValue) * (1 - Math.exp(-14 * seconds))
    this.currentValue = Math.abs(this.targetValue - nextValue) < 0.001
      ? this.targetValue
      : nextValue
    return this.currentValue
  }

  reset() {
    this.currentValue = 0
    this.targetValue = 0
  }
}

export class StableTargetResolver {
  private currentIndex = -1
  private currentDistance = Number.POSITIVE_INFINITY
  private pointerInside = false

  get index() {
    return this.currentIndex
  }

  get distance() {
    return this.currentDistance
  }

  get inside() {
    return this.pointerInside
  }

  resolve(x: number, y: number, items: readonly InteractionTargetBounds[]) {
    const retainedItem = items[this.currentIndex]
    if (retainedItem) {
      const retainedDistance = distanceToItem(x, y, retainedItem)
      if (retainedDistance === 0) {
        this.currentDistance = 0
        this.pointerInside = true
        return this.currentIndex
      }

      for (let index = 0; index < items.length; index += 1) {
        if (index !== this.currentIndex && distanceToItem(x, y, items[index]) === 0) {
          return this.select(index, 0, true)
        }
      }

      if (retainedDistance <= retainedItem.exitRange) {
        this.currentDistance = retainedDistance
        this.pointerInside = false
        return this.currentIndex
      }
    }

    let nextIndex = -1
    let nearestDistance = Number.POSITIVE_INFINITY
    for (let index = 0; index < items.length; index += 1) {
      const distance = distanceToItem(x, y, items[index])
      if (distance <= items[index].enterRange && distance < nearestDistance) {
        nextIndex = index
        nearestDistance = distance
      }
    }

    return this.select(nextIndex, nearestDistance, nearestDistance === 0)
  }

  clear() {
    return this.select(-1, Number.POSITIVE_INFINITY, false)
  }

  private select(index: number, distance: number, inside: boolean) {
    this.currentIndex = index
    this.currentDistance = distance
    this.pointerInside = inside
    return this.currentIndex
  }
}

export function createInteractionVisuals() {
  return new Float32Array(INTERACTION_VISUAL_COUNT)
}

export function writeInteractionVisuals(
  progress: number,
  variant: ButtonVariant,
  output: Float32Array,
) {
  const normalizedProgress = clamp(progress, 0, 1)
  const easedProgress = normalizedProgress * normalizedProgress * (3 - 2 * normalizedProgress)
  output[INTERACTION_VISUAL.crossScale] = 1 - easedProgress
  output[INTERACTION_VISUAL.crossOpacity] = 1 - easedProgress
  output[INTERACTION_VISUAL.diamondScale] = 0.36 + easedProgress * 0.64
  output[INTERACTION_VISUAL.diamondRotation] = 45 + easedProgress * 90
  output[INTERACTION_VISUAL.diamondFillOpacity] = easedProgress
  output[INTERACTION_VISUAL.readoutOpacity] = 1 - easedProgress
  output[INTERACTION_VISUAL.magneticStrength] = easedProgress
  output[INTERACTION_VISUAL.buttonFillOpacity] = variant === "filled"
    ? 1 - easedProgress
    : easedProgress
  output[INTERACTION_VISUAL.buttonBaseWeight] = 1 - easedProgress
  output[INTERACTION_VISUAL.arrowShift] = easedProgress * 4
  return output
}

export function applyButtonInteractionStyles(
  element: HTMLElement,
  values: Float32Array,
  contentShiftX = 0,
  contentShiftY = 0,
) {
  element.style.setProperty(
    "--pointer-fill-opacity",
    values[INTERACTION_VISUAL.buttonFillOpacity].toFixed(4),
  )
  element.style.setProperty(
    "--pointer-base-weight",
    `${(values[INTERACTION_VISUAL.buttonBaseWeight] * 100).toFixed(2)}%`,
  )
  element.style.setProperty(
    "--pointer-arrow-shift",
    `${values[INTERACTION_VISUAL.arrowShift].toFixed(2)}px`,
  )
  element.style.setProperty("--magnetic-content-x", `${contentShiftX.toFixed(2)}px`)
  element.style.setProperty("--magnetic-content-y", `${contentShiftY.toFixed(2)}px`)
}

export function resolveMotionCapabilities({
  finePointer,
  hover,
  coarsePointer,
  reducedMotion,
}: MotionCapabilityInput): MotionCapabilities {
  const coordinateCursor = finePointer && hover && !coarsePointer
  return {
    coordinateCursor,
    magneticCursor: coordinateCursor && !reducedMotion,
    continuousMotion: !reducedMotion,
    parallax: !reducedMotion,
  }
}

export function formatCoordinates(x: number, y: number) {
  const normalize = (value: number) => Math.max(0, Math.round(value)).toString().padStart(4, "0")
  return `X ${normalize(x)} / Y ${normalize(y)}`
}

export function calculateScrollProgress(
  scrollY: number,
  viewportHeight: number,
  elementTop: number,
  elementHeight: number,
) {
  const travel = Math.max(1, viewportHeight + elementHeight)
  const progress = (scrollY + viewportHeight - elementTop) / travel
  return Math.min(1, Math.max(0, progress))
}

export function createContourGeometry(
  width: number,
  height: number,
  targetGridSize = DEFAULT_GRID_SIZE,
): ContourGeometry {
  const safeWidth = Math.max(1, width)
  const safeHeight = Math.max(1, height)
  const safeGridSize = Math.max(8, targetGridSize)
  const columns = Math.max(12, Math.ceil(safeWidth / safeGridSize) + 1)
  const rows = Math.max(10, Math.ceil(safeHeight / safeGridSize) + 1)

  return {
    width: safeWidth,
    height: safeHeight,
    columns,
    rows,
    cellWidth: safeWidth / (columns - 1),
    cellHeight: safeHeight / (rows - 1),
    values: new Float32Array(columns * rows),
    sourceCenters: new Float32Array(TOPOGRAPHIC_SOURCES.length * 2),
  }
}

export function populateContourField(
  geometry: ContourGeometry,
  timeMs: number,
  pointerX = Number.NaN,
  pointerY = Number.NaN,
  pointerStrength = 0,
) {
  const time = timeMs * 0.001
  const hasPointer = Number.isFinite(pointerX) && Number.isFinite(pointerY) && pointerStrength > 0
  const pointerRadius = Math.min(geometry.width, geometry.height) * 0.31
  let valueIndex = 0

  for (let sourceIndex = 0; sourceIndex < TOPOGRAPHIC_SOURCES.length; sourceIndex += 1) {
    const source = TOPOGRAPHIC_SOURCES[sourceIndex]
    geometry.sourceCenters[sourceIndex * 2] = source.x
      + Math.sin(time * 0.055 + source.phase) * 0.012
    geometry.sourceCenters[sourceIndex * 2 + 1] = source.y
      + Math.cos(time * 0.047 + source.phase * 1.3) * 0.01
  }

  for (let row = 0; row < geometry.rows; row += 1) {
    const y = row * geometry.cellHeight
    const normalizedY = y / geometry.height

    for (let column = 0; column < geometry.columns; column += 1) {
      const x = column * geometry.cellWidth
      const normalizedX = x / geometry.width
      const warpX = Math.sin(normalizedY * 13.7 + time * 0.07) * 0.016
        + Math.sin((normalizedX + normalizedY) * 21.3 - time * 0.045) * 0.008
      const warpY = Math.cos(normalizedX * 11.9 - time * 0.06) * 0.015
        + Math.cos((normalizedX - normalizedY) * 18.1 + time * 0.04) * 0.009
      let fieldValue = 0

      for (let sourceIndex = 0; sourceIndex < TOPOGRAPHIC_SOURCES.length; sourceIndex += 1) {
        const source = TOPOGRAPHIC_SOURCES[sourceIndex]
        const driftingX = geometry.sourceCenters[sourceIndex * 2]
        const driftingY = geometry.sourceCenters[sourceIndex * 2 + 1]
        const deltaX = normalizedX + warpX - driftingX
        const deltaY = normalizedY + warpY - driftingY
        const rotatedX = deltaX * source.cosine - deltaY * source.sine
        const rotatedY = deltaX * source.sine + deltaY * source.cosine
        const ellipticalDistance = (rotatedX * rotatedX) / (source.radiusX * source.radiusX)
          + (rotatedY * rotatedY) / (source.radiusY * source.radiusY)
        const irregularity = 1
          + Math.sin(normalizedX * 31 + normalizedY * 17 + source.phase) * 0.075
          + Math.cos(normalizedX * 19 - normalizedY * 29 - source.phase) * 0.045
        const potential = Math.exp(-ellipticalDistance * 1.7 * irregularity) * source.strength
        fieldValue = Math.max(fieldValue, potential)
      }

      fieldValue += Math.sin(normalizedX * 24 + normalizedY * 15 + time * 0.025) * 0.018
      fieldValue += Math.cos(normalizedX * 13 - normalizedY * 27 - time * 0.022) * 0.014

      if (hasPointer) {
        const deltaX = x - pointerX
        const deltaY = y - pointerY
        const distance = Math.hypot(deltaX, deltaY)
        const normalizedDistance = distance / Math.max(1, pointerRadius)
        const radialFalloff = Math.exp(-normalizedDistance * normalizedDistance * 3.2)
        const angle = Math.atan2(deltaY, deltaX)
        const organicRipple = 0.22
          + Math.sin(angle * 3 + normalizedDistance * 8.5 + time * 0.35) * 0.055
          + Math.cos(deltaX * 0.021 - deltaY * 0.017) * 0.035
        fieldValue += radialFalloff * organicRipple * pointerStrength
      }

      geometry.values[valueIndex] = fieldValue
      valueIndex += 1
    }
  }
}

function interpolateLevel(level: number, start: number, end: number) {
  const difference = end - start
  if (Math.abs(difference) < 0.00001) {
    return 0.5
  }
  return Math.min(1, Math.max(0, (level - start) / difference))
}

export function visitContourSegments(
  geometry: ContourGeometry,
  level: number,
  visit: SegmentVisitor,
) {
  let segmentCount = 0

  for (let row = 0; row < geometry.rows - 1; row += 1) {
    const y = row * geometry.cellHeight

    for (let column = 0; column < geometry.columns - 1; column += 1) {
      const x = column * geometry.cellWidth
      const topLeftIndex = row * geometry.columns + column
      const topLeft = geometry.values[topLeftIndex]
      const topRight = geometry.values[topLeftIndex + 1]
      const bottomLeft = geometry.values[topLeftIndex + geometry.columns]
      const bottomRight = geometry.values[topLeftIndex + geometry.columns + 1]
      const state = (topLeft >= level ? 1 : 0)
        | (topRight >= level ? 2 : 0)
        | (bottomRight >= level ? 4 : 0)
        | (bottomLeft >= level ? 8 : 0)

      if (state === 0 || state === 15) {
        continue
      }

      const topX = x + interpolateLevel(level, topLeft, topRight) * geometry.cellWidth
      const rightY = y + interpolateLevel(level, topRight, bottomRight) * geometry.cellHeight
      const bottomX = x + interpolateLevel(level, bottomLeft, bottomRight) * geometry.cellWidth
      const leftY = y + interpolateLevel(level, topLeft, bottomLeft) * geometry.cellHeight
      const rightX = x + geometry.cellWidth
      const bottomY = y + geometry.cellHeight

      switch (state) {
        case 1:
        case 14:
          visit(x, leftY, topX, y)
          segmentCount += 1
          break
        case 2:
        case 13:
          visit(topX, y, rightX, rightY)
          segmentCount += 1
          break
        case 3:
        case 12:
          visit(x, leftY, rightX, rightY)
          segmentCount += 1
          break
        case 4:
        case 11:
          visit(rightX, rightY, bottomX, bottomY)
          segmentCount += 1
          break
        case 5: {
          const centerAboveLevel = (topLeft + topRight + bottomRight + bottomLeft) * 0.25 >= level
          if (centerAboveLevel) {
            visit(x, leftY, bottomX, bottomY)
            visit(topX, y, rightX, rightY)
          } else {
            visit(x, leftY, topX, y)
            visit(rightX, rightY, bottomX, bottomY)
          }
          segmentCount += 2
          break
        }
        case 6:
        case 9:
          visit(topX, y, bottomX, bottomY)
          segmentCount += 1
          break
        case 7:
        case 8:
          visit(x, leftY, bottomX, bottomY)
          segmentCount += 1
          break
        case 10: {
          const centerAboveLevel = (topLeft + topRight + bottomRight + bottomLeft) * 0.25 >= level
          if (centerAboveLevel) {
            visit(x, leftY, topX, y)
            visit(rightX, rightY, bottomX, bottomY)
          } else {
            visit(topX, y, rightX, rightY)
            visit(x, leftY, bottomX, bottomY)
          }
          segmentCount += 2
          break
        }
      }
    }
  }

  return segmentCount
}

export function countContourSegments(
  geometry: ContourGeometry,
  thresholds: readonly number[] = CONTOUR_THRESHOLDS,
) {
  const counts = new Int32Array(thresholds.length)
  const countSegment = () => undefined
  for (let index = 0; index < thresholds.length; index += 1) {
    counts[index] = visitContourSegments(geometry, thresholds[index], countSegment)
  }
  return counts
}

function readCapabilities() {
  return resolveMotionCapabilities({
    finePointer: matchMedia("(pointer: fine)").matches,
    hover: matchMedia("(hover: hover)").matches,
    coarsePointer: matchMedia("(pointer: coarse)").matches,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  })
}

function distanceToItem(x: number, y: number, item: InteractionTargetBounds) {
  const horizontalDistance = Math.max(item.left - x, 0, x - item.right)
  const verticalDistance = Math.max(item.top - y, 0, y - item.bottom)
  return Math.hypot(horizontalDistance, verticalDistance)
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function mountMotionSystem() {
  const root = document.documentElement
  const overlay = document.querySelector<HTMLElement>("[data-coordinate-overlay]")
  const readout = overlay?.querySelector<HTMLElement>("[data-coordinate-readout]")
  const canvas = document.querySelector<HTMLCanvasElement>("[data-wave-canvas]")
  const context = canvas?.getContext("2d")

  if (!overlay || !readout || !canvas || !context) {
    return () => undefined
  }

  const capabilities = readCapabilities()
  const abortController = new AbortController()
  const { signal } = abortController
  const targetResolver = new StableTargetResolver()
  const hoverProgress = new HoverProgressController()
  const interactionVisuals = createInteractionVisuals()
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  const renderedPointer = { ...pointer }
  let fieldPointerX = pointer.x
  let fieldPointerY = pointer.y
  let fieldPointerStrength = 0
  let pointerPresent = false
  let animationFrame = 0
  let resizeFrame = 0
  let visible = !document.hidden
  let canvasWidth = 1
  let canvasHeight = 1
  let canvasPageLeft = 0
  let canvasPageTop = 0
  let renderedScrollY = Number.NaN
  let lineColor = ""
  let accentColor = ""
  let contourGeometry = createContourGeometry(1, 1)
  let scrollElements: ScrollElement[] = []
  let magneticItems: MagneticItem[] = []
  let visualItem: MagneticItem | null = null
  let lastFrameTime = Number.NaN

  const revealElements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"))
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible")
          intersectionObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: "0px 0px -7%" },
  )

  revealElements.forEach((element) => intersectionObserver.observe(element))

  const updateCanvasColors = () => {
    const style = getComputedStyle(root)
    lineColor = style.getPropertyValue("--rule-strong").trim()
    accentColor = style.getPropertyValue("--oxide").trim()
  }

  const measureScrollElements = () => {
    scrollElements = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-motion]")).map(
      (element) => {
        const rect = element.getBoundingClientRect()
        const parsedFactor = Number(element.dataset.scrollFactor ?? "0.08")
        return {
          element,
          top: rect.top + window.scrollY,
          height: rect.height,
          factor: Number.isFinite(parsedFactor) ? parsedFactor : 0.08,
        }
      },
    )
  }

  const measureMagneticItems = () => {
    const nextItems: MagneticItem[] = []
    const elements = document.querySelectorAll<HTMLElement>(MAGNETIC_SELECTOR)
    const previousVisualElement = visualItem?.element

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0 || element.matches(":disabled, [aria-disabled='true']")) {
        return
      }

      const left = rect.left + window.scrollX
      const top = rect.top + window.scrollY
      const width = rect.width
      const height = rect.height
      const enterRange = clamp(Math.max(width, height) * 0.62, 48, 104)
      nextItems.push({
        element,
        variant: element.dataset.buttonVariant === "outline" ? "outline" : "filled",
        left,
        top,
        right: left + width,
        bottom: top + height,
        centerX: left + width / 2,
        centerY: top + height / 2,
        enterRange,
        exitRange: enterRange + 24,
      })
    })

    magneticItems = nextItems
    visualItem = previousVisualElement
      ? magneticItems.find((item) => item.element === previousVisualElement) ?? null
      : null
    targetResolver.clear()
    hoverProgress.setTarget(0)
    if (pointerPresent) {
      updateInteractionTarget()
    }
  }

  const handleAnimatedLayoutSettled = (event: AnimationEvent | TransitionEvent) => {
    if (event.target === event.currentTarget) {
      measureMagneticItems()
    }
  }

  revealElements.forEach((element) => {
    element.addEventListener("animationend", handleAnimatedLayoutSettled, { signal })
    element.addEventListener("transitionend", handleAnimatedLayoutSettled, { signal })
  })

  const clearItemStyles = (item: MagneticItem | null) => {
    if (!item) {
      return
    }
    item.element.style.removeProperty("--pointer-fill-opacity")
    item.element.style.removeProperty("--pointer-base-weight")
    item.element.style.removeProperty("--pointer-arrow-shift")
    item.element.style.removeProperty("--magnetic-content-x")
    item.element.style.removeProperty("--magnetic-content-y")
  }

  const selectVisualItem = (nextItem: MagneticItem | null) => {
    if (visualItem === nextItem) {
      return
    }
    clearItemStyles(visualItem)
    visualItem = nextItem
  }

  const updateInteractionTarget = () => {
    const pointerPageX = pointer.x + window.scrollX
    const pointerPageY = pointer.y + window.scrollY
    const itemIndex = targetResolver.resolve(pointerPageX, pointerPageY, magneticItems)
    if (itemIndex < 0) {
      hoverProgress.setTarget(0)
      return
    }

    const item = magneticItems[itemIndex]
    selectVisualItem(item)
    const proximityProgress = 0.62 * (1 - clamp(targetResolver.distance / item.exitRange, 0, 1))
    hoverProgress.setTarget(targetResolver.inside ? 1 : proximityProgress)
  }

  const drawSegment: SegmentVisitor = (x1, y1, x2, y2) => {
    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
  }

  const drawContours = (time: number, includePointer: boolean) => {
    populateContourField(
      contourGeometry,
      time + window.scrollY * 1.4,
      includePointer ? fieldPointerX : Number.NaN,
      includePointer ? fieldPointerY : Number.NaN,
      includePointer ? fieldPointerStrength : 0,
    )
    context.clearRect(0, 0, canvasWidth, canvasHeight)
    context.lineWidth = 1

    for (let levelIndex = 0; levelIndex < CONTOUR_THRESHOLDS.length; levelIndex += 1) {
      context.beginPath()
      context.strokeStyle = levelIndex === 4 ? accentColor : lineColor
      context.globalAlpha = levelIndex === 4 ? 0.36 : 0.56
      visitContourSegments(contourGeometry, CONTOUR_THRESHOLDS[levelIndex], drawSegment)
      context.stroke()
    }

    context.globalAlpha = 1
  }

  const resizeCanvas = () => {
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvasWidth = Math.max(1, rect.width)
    canvasHeight = Math.max(1, rect.height)
    canvasPageLeft = rect.left + window.scrollX
    canvasPageTop = rect.top + window.scrollY
    canvas.width = Math.round(canvasWidth * ratio)
    canvas.height = Math.round(canvasHeight * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    contourGeometry = createContourGeometry(canvasWidth, canvasHeight)
    renderedScrollY = Number.NaN
    measureScrollElements()
    measureMagneticItems()

    if (!capabilities.continuousMotion) {
      drawContours(0, false)
    }
  }

  const updateScrollMotion = () => {
    if (renderedScrollY === window.scrollY) {
      return
    }

    renderedScrollY = window.scrollY
    for (let index = 0; index < scrollElements.length; index += 1) {
      const { element, top, height, factor } = scrollElements[index]
      const progress = calculateScrollProgress(window.scrollY, window.innerHeight, top, height)
      const shift = (progress - 0.5) * window.innerHeight * factor
      element.style.setProperty("--scroll-shift", `${shift.toFixed(2)}px`)
    }
  }

  const applyInteractionVisuals = (progress: number) => {
    const outlineTarget = visualItem?.variant === "outline"
    const values = writeInteractionVisuals(
      progress,
      visualItem?.variant ?? "filled",
      interactionVisuals,
    )
    overlay.style.setProperty("--cross-scale", values[INTERACTION_VISUAL.crossScale].toFixed(4))
    overlay.style.setProperty("--cross-opacity", values[INTERACTION_VISUAL.crossOpacity].toFixed(4))
    overlay.style.setProperty("--diamond-scale", values[INTERACTION_VISUAL.diamondScale].toFixed(4))
    overlay.style.setProperty("--diamond-rotation", `${values[INTERACTION_VISUAL.diamondRotation].toFixed(2)}deg`)
    overlay.style.setProperty(
      "--diamond-fill-opacity",
      `${(values[INTERACTION_VISUAL.diamondFillOpacity] * 100).toFixed(2)}%`,
    )
    overlay.style.setProperty(
      "--diamond-active-color",
      outlineTarget ? "var(--inverse)" : "var(--oxide)",
    )
    overlay.style.setProperty(
      "--diamond-center-color",
      outlineTarget ? "var(--oxide)" : "var(--inverse)",
    )
    overlay.style.setProperty("--readout-opacity", values[INTERACTION_VISUAL.readoutOpacity].toFixed(4))

    if (!visualItem) {
      return
    }

    const magneticStrength = capabilities.magneticCursor
      ? values[INTERACTION_VISUAL.magneticStrength]
      : 0
    const pointerPageX = pointer.x + window.scrollX
    const pointerPageY = pointer.y + window.scrollY
    const contentShiftX = clamp((pointerPageX - visualItem.centerX) * 0.075, -5, 5) * magneticStrength
    const contentShiftY = clamp((pointerPageY - visualItem.centerY) * 0.075, -4, 4) * magneticStrength
    applyButtonInteractionStyles(visualItem.element, values, contentShiftX, contentShiftY)

    if (progress === 0 && targetResolver.index < 0) {
      selectVisualItem(null)
    }
  }

  const updateCursor = (deltaMs: number, immediate: boolean) => {
    let targetX = pointer.x
    let targetY = pointer.y

    if (capabilities.magneticCursor && visualItem) {
      const centerX = visualItem.centerX - window.scrollX
      const centerY = visualItem.centerY - window.scrollY
      const deltaX = centerX - pointer.x
      const deltaY = centerY - pointer.y
      const distance = Math.hypot(deltaX, deltaY)
      if (distance > 0) {
        const maximumShift = Math.min(18, distance * 0.22)
        const strength = interactionVisuals[INTERACTION_VISUAL.magneticStrength]
        targetX += (deltaX / distance) * maximumShift * strength
        targetY += (deltaY / distance) * maximumShift * strength
      }
    }

    if (immediate || !capabilities.magneticCursor) {
      renderedPointer.x = targetX
      renderedPointer.y = targetY
    } else {
      const smoothing = 1 - Math.exp(-18 * clamp(deltaMs, 0, 32) / 1_000)
      renderedPointer.x += (targetX - renderedPointer.x) * smoothing
      renderedPointer.y += (targetY - renderedPointer.y) * smoothing
    }

    const labelX = Math.min(window.innerWidth - 152, Math.max(8, renderedPointer.x + 16))
    const labelY = Math.min(window.innerHeight - 34, Math.max(8, renderedPointer.y + 16))
    overlay.style.setProperty("--cursor-x", `${renderedPointer.x.toFixed(2)}px`)
    overlay.style.setProperty("--cursor-y", `${renderedPointer.y.toFixed(2)}px`)
    overlay.style.setProperty("--cursor-label-x", `${labelX.toFixed(2)}px`)
    overlay.style.setProperty("--cursor-label-y", `${labelY.toFixed(2)}px`)
    readout.textContent = formatCoordinates(pointer.x, pointer.y)
  }

  const updateFieldPointer = () => {
    const targetX = pointer.x + window.scrollX - canvasPageLeft
    const targetY = pointer.y + window.scrollY - canvasPageTop
    fieldPointerX += (targetX - fieldPointerX) * 0.055
    fieldPointerY += (targetY - fieldPointerY) * 0.055
    fieldPointerStrength += ((pointerPresent ? 1 : 0) - fieldPointerStrength) * 0.05
  }

  const render = (time: number) => {
    if (!visible) {
      return
    }

    const deltaMs = Number.isFinite(lastFrameTime) ? clamp(time - lastFrameTime, 0, 32) : 16.67
    lastFrameTime = time
    const progress = hoverProgress.step(deltaMs)
    applyInteractionVisuals(progress)
    if (capabilities.coordinateCursor) {
      updateCursor(deltaMs, false)
    }
    if (capabilities.continuousMotion) {
      updateFieldPointer()
      drawContours(time, fieldPointerStrength > 0.001)
    }
    if (capabilities.parallax) {
      updateScrollMotion()
    }
    animationFrame = requestAnimationFrame(render)
  }

  const handlePointerMove = (event: PointerEvent) => {
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointerPresent = true
    updateInteractionTarget()

    if (!capabilities.continuousMotion && capabilities.coordinateCursor) {
      const progress = hoverProgress.step(0, true)
      applyInteractionVisuals(progress)
      updateCursor(0, true)
    }
  }

  const handlePointerLeave = (event: PointerEvent) => {
    if (event.relatedTarget) {
      return
    }
    pointerPresent = false
    targetResolver.clear()
    hoverProgress.setTarget(0)
    if (!capabilities.continuousMotion) {
      const progress = hoverProgress.step(0, true)
      applyInteractionVisuals(progress)
    }
  }

  const handleResize = () => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(resizeCanvas)
  }

  const handleVisibility = () => {
    visible = !document.hidden
    cancelAnimationFrame(animationFrame)
    animationFrame = 0
    if (visible && capabilities.continuousMotion) {
      lastFrameTime = Number.NaN
      animationFrame = requestAnimationFrame(render)
    }
  }

  const themeObserver = new MutationObserver(() => {
    updateCanvasColors()
    if (!capabilities.continuousMotion) {
      drawContours(0, false)
    }
  })

  themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] })
  root.classList.add("motion-enhanced")
  root.classList.toggle("motion-reduced", !capabilities.continuousMotion)
  updateCanvasColors()
  resizeCanvas()
  applyInteractionVisuals(0)

  if (capabilities.coordinateCursor) {
    root.classList.add("custom-cursor-ready")
    overlay.dataset.enabled = "true"
    updateCursor(0, true)
    window.addEventListener("pointermove", handlePointerMove, { signal, passive: true })
    window.addEventListener("pointerout", handlePointerLeave, { signal, passive: true })
  }

  window.addEventListener("resize", handleResize, { signal, passive: true })
  document.addEventListener("visibilitychange", handleVisibility, { signal })

  if (capabilities.continuousMotion) {
    animationFrame = requestAnimationFrame(render)
  } else {
    updateScrollMotion()
  }

  return () => {
    abortController.abort()
    intersectionObserver.disconnect()
    themeObserver.disconnect()
    cancelAnimationFrame(animationFrame)
    cancelAnimationFrame(resizeFrame)
    magneticItems.forEach((item) => clearItemStyles(item))
    targetResolver.clear()
    hoverProgress.reset()
    visualItem = null
    root.classList.remove("motion-enhanced", "motion-reduced", "custom-cursor-ready")
    delete overlay.dataset.enabled
    overlay.style.removeProperty("--cross-scale")
    overlay.style.removeProperty("--cross-opacity")
    overlay.style.removeProperty("--diamond-scale")
    overlay.style.removeProperty("--diamond-rotation")
    overlay.style.removeProperty("--diamond-fill-opacity")
    overlay.style.removeProperty("--diamond-active-color")
    overlay.style.removeProperty("--diamond-center-color")
    overlay.style.removeProperty("--readout-opacity")
    scrollElements.forEach(({ element }) => element.style.removeProperty("--scroll-shift"))
  }
}
