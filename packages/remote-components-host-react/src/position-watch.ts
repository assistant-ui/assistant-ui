/**
 * Sub-pixel position tracking for slots.
 *
 * A slot can move without resizing (content above it grows, a sibling
 * changes), and no observer reports pure position changes. Remotes need the
 * sub-pixel remainder of their position (LayoutInfo.offsetX/Y), so this
 * runs one shared requestAnimationFrame loop for a short burst after any
 * layout activity in the document: slot resizes (`poke()` from each
 * RemoteComponent), DOM mutations, window resizes and devicePixelRatio
 * changes. Outside a burst it
 * costs nothing.
 */
type Check = () => void;

const BURST_MS = 500;
const checks = new Set<Check>();
let until = 0;
let frame = 0;
let mo: MutationObserver | null = null;

function loop(): void {
  frame = 0;
  for (const c of [...checks]) c();
  if (performance.now() < until && checks.size > 0)
    frame = requestAnimationFrame(loop);
}

/** Starts (or extends) a tracking burst. */
export function poke(): void {
  if (typeof window === "undefined") return;
  until = performance.now() + BURST_MS;
  if (frame === 0) frame = requestAnimationFrame(loop);
}

const onResize = (): void => poke();

// devicePixelRatio changes (browser zoom, moving to another screen) move the
// device-pixel grid without resizing anything: re-place every slot.
let dprQuery: MediaQueryList | null = null;
function watchDpr(): void {
  dprQuery?.removeEventListener("change", onDpr);
  dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  dprQuery.addEventListener("change", onDpr);
}
function onDpr(): void {
  watchDpr();
  poke();
}

export function watchPosition(check: Check): () => void {
  checks.add(check);
  if (checks.size === 1 && typeof window !== "undefined") {
    mo = new MutationObserver(poke);
    mo.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    window.addEventListener("resize", onResize);
    watchDpr();
  }
  poke();
  return () => {
    checks.delete(check);
    if (checks.size === 0) {
      mo?.disconnect();
      mo = null;
      window.removeEventListener("resize", onResize);
      dprQuery?.removeEventListener("change", onDpr);
      dprQuery = null;
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}
