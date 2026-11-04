import {
  isInitializeRequest,
  type InitializeRequest,
} from "@assistant-ui/remote-components-protocol";

export interface FrameRegistration {
  /** The frame's current window (iframe.contentWindow). */
  window: () => Window | null;
  /** Exact expected origin of the remote, or "null" for opaque (sandboxed without allow-same-origin) frames. */
  origin: string;
  onInitialize: (event: MessageEvent, request: InitializeRequest) => void;
}

const frames = new Set<FrameRegistration & { nonce: string; win: Window }>();
/** Windows with our listener: one per window, so remotes portaled into another window (a pop-out) keep working. */
const installed = new Set<Window>();

function onMessage(event: MessageEvent): void {
  const data: unknown = event.data;
  if (!isInitializeRequest(data)) return;
  if (event.source === null) return;
  // The message must come from the exact window we created, with the exact
  // origin we loaded into it, and carry the nonce we gave it ("" for
  // documents that cannot see the URL fragment, e.g. SCF blob documents).
  for (const reg of frames) {
    if (event.source !== reg.window()) continue;
    if (event.origin !== reg.origin || data.params.nonce !== reg.nonce) return;
    reg.onInitialize(event, data);
    return;
  }
}

/**
 * Registers a frame for the handshake. One `message` listener per window
 * serves every instance in that window; it is removed with the window's
 * last frame.
 */
export function registerFrame(
  nonce: string,
  reg: FrameRegistration,
  win: Window = window,
): () => void {
  const entry = { ...reg, nonce, win };
  if (!installed.has(win)) {
    win.addEventListener("message", onMessage);
    installed.add(win);
  }
  frames.add(entry);
  return () => {
    frames.delete(entry);
    if (![...frames].some((f) => f.win === win)) {
      win.removeEventListener("message", onMessage);
      installed.delete(win);
    }
  };
}

/** 128-bit random nonce, base64url. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
