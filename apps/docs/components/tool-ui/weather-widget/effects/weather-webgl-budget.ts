// WebGL contexts are a limited resource and creating too many can cause
// unpredictable "context lost" behavior or black canvases.
//
// We default to a conservative budget and allow sandbox tooling (tuning studio)
// to raise it temporarily when rendering many previews at once.
let maxConcurrentWeatherWebglCanvases = 8;
const allocatedWeatherWebglCanvases = new Set<HTMLCanvasElement>();

export function getMaxConcurrentWeatherWebglCanvases(): number {
  return maxConcurrentWeatherWebglCanvases;
}

export function setMaxConcurrentWeatherWebglCanvases(value: number): void {
  if (!Number.isFinite(value)) return;
  const next = Math.max(1, Math.min(64, Math.floor(value)));
  maxConcurrentWeatherWebglCanvases = next;
}

export function getAllocatedWeatherWebglCanvasCount(): number {
  return allocatedWeatherWebglCanvases.size;
}

export function __resetWeatherWebglCanvasBudgetForTests(): void {
  maxConcurrentWeatherWebglCanvases = 8;
  allocatedWeatherWebglCanvases.clear();
}

export function tryAcquireWeatherWebglCanvasBudgetSlot(
  canvas: HTMLCanvasElement,
): boolean {
  if (allocatedWeatherWebglCanvases.has(canvas)) return true;
  if (allocatedWeatherWebglCanvases.size >= maxConcurrentWeatherWebglCanvases)
    return false;
  allocatedWeatherWebglCanvases.add(canvas);
  return true;
}

export function releaseWeatherWebglCanvasBudgetSlot(
  canvas: HTMLCanvasElement,
): void {
  allocatedWeatherWebglCanvases.delete(canvas);
}

export function releaseWeatherWebglBudgetSlotOnInitFailure(
  canvas: HTMLCanvasElement,
  hadBudgetSlot: boolean | null,
): boolean | null {
  if (hadBudgetSlot) {
    releaseWeatherWebglCanvasBudgetSlot(canvas);
    return null;
  }
  return hadBudgetSlot;
}
