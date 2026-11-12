import type { Encoded, EncodedProps, Path } from "./codec.js";
import type { SerializedError } from "./errors.js";

/* ------------------------------------------------------------------------ */
/* Versioning                                                               */
/* ------------------------------------------------------------------------ */

/** Current protocol version spoken by this package. */
export const PROTOCOL_VERSION = 3;
/** Oldest protocol version this package can still speak. */
export const MIN_PROTOCOL_VERSION = 3;

export interface VersionRange {
  min: number;
  max: number;
}

export const SUPPORTED_VERSIONS: VersionRange = {
  min: MIN_PROTOCOL_VERSION,
  max: PROTOCOL_VERSION,
};

/** Highest version in both ranges, or `null` if they do not overlap. */
export function negotiateVersion(
  a: VersionRange,
  b: VersionRange,
): number | null {
  const hi = Math.min(a.max, b.max);
  const lo = Math.max(a.min, b.min);
  return hi >= lo ? hi : null;
}

/* ------------------------------------------------------------------------ */
/* Envelope (JSON-RPC 2.0 shaped, MCP Apps style)                           */
/* ------------------------------------------------------------------------ */

/**
 * Every message is a JSON-RPC 2.0 object: a request (`id` + `method`), a
 * response (`id` + `result` or `error`), or a notification (`method`, no
 * `id`). Method names are slash-namespaced under `rc/`, notifications
 * under `rc/notifications/`, like MCP Apps' `ui/…`. `params` and `result`
 * go through the structured clone algorithm (functions are encoded, §6), so
 * they may hold values JSON cannot (Date, Map, undefined, …).
 */
export interface RequestMessage<M extends string = string, P = unknown> {
  jsonrpc: "2.0";
  id: number | string;
  method: M;
  params: P;
}

export interface NotificationMessage<M extends string = string, P = unknown> {
  jsonrpc: "2.0";
  method: M;
  params: P;
}

/**
 * JSON-RPC error. `code` is the JSON-RPC number (-32601 for `unsupported`,
 * -32600 for `protocol`, -32000 otherwise); `data` is the full error, with
 * the remote-components code (`stale-function`, …) in `data.code`.
 */
export interface ErrorObject {
  code: number;
  message: string;
  data: SerializedError;
}

export type ResponseMessage =
  | { jsonrpc: "2.0"; id: number | string; result: unknown }
  | { jsonrpc: "2.0"; id: number | string; error: ErrorObject };

/* ------------------------------------------------------------------------ */
/* Handshake (window.postMessage)                                           */
/* ------------------------------------------------------------------------ */

/**
 * Name of the URL fragment parameter the host appends to `src`. The fragment
 * is never sent to the server, so the nonce does not appear in request logs
 * or Referer headers.
 */
export const NONCE_PARAM = "rc-nonce";

/**
 * `rc/initialize` (remote → parent, targetOrigin "*"; it carries nothing
 * secret). Repeated every 100ms, with the same `id`, until answered (the
 * host may register the frame late, e.g. when Safe Content Frame creates it).
 */
export interface InitializeParams {
  /** The `rc-nonce` from the URL fragment, or "" when the document has none (SCF blob documents). */
  nonce: string;
  /** Random per document. Repeats share it; a new value means the document reloaded. */
  session: string;
  protocol: VersionRange;
  /** Runtime package version, informational. */
  runtime: string;
}

/** `id` is the session (a string), the same on every repeat. */
export type InitializeRequest = RequestMessage<
  "rc/initialize",
  InitializeParams
> & { id: string };

/** The `rc/initialize` result (host → remote, targetOrigin = remote origin), transferring the channel port. */
export interface InitializeResult {
  nonce: string;
  protocol: number;
  init: InitPayload;
}

/** `rc/initialize` refused (no common protocol version): a JSON-RPC error whose `data` carries this. */
export interface InitializeRefusal extends SerializedError {
  nonce: string;
  supported: VersionRange;
}

export type InitializeResponse =
  | { jsonrpc: "2.0"; id: string; result: InitializeResult }
  | {
      jsonrpc: "2.0";
      id: string;
      error: { code: number; message: string; data: InitializeRefusal };
    };

export interface InitPayload {
  /** The remote's URL as the host knows it (base for relative overlay URLs); "" for HTML the host rendered itself. */
  src: string;
  props: EncodedProps;
  theme: ThemeSnapshot;
  layout: LayoutInfo;
  /** Overlay remotes get this so they know they are rendered inside a host overlay. */
  overlay?: { kind: OverlayKind };
}

/* ------------------------------------------------------------------------ */
/* Payload types                                                            */
/* ------------------------------------------------------------------------ */

export interface ThemeSnapshot {
  /** Inherited CSS properties read from the host slot's computed style (allowlisted). */
  inherited: Record<string, string>;
  /** Custom properties (`--*`) from the slot's computed style, filtered by the host. */
  vars: Record<string, string>;
  /** `@font-face` rules the remote should register. */
  fonts: FontFaceSpec[];
  /** Document language (`lang`) at the slot, or "" if none. */
  lang: string;
  /** Computed font-size of the host's root element, so `rem` units match. */
  rootFontSize: string;
}

export interface FontFaceSpec {
  family: string;
  /** CSS `src` descriptor with absolute URLs, e.g. `url("https://…/inter.woff2") format("woff2")`. */
  src: string;
  weight?: string;
  style?: string;
  stretch?: string;
  display?: string;
  unicodeRange?: string;
}

/** What the host knows about the slot's size. */
export interface LayoutInfo {
  /** Exact (fractional) content-box width of the slot in CSS px. */
  width: number;
  /**
   * Exact content-box height when the host constrains the height (explicit
   * height, flex stretch, aspect-ratio, …), or `null` when the slot is
   * auto-height (height comes from the remote).
   */
  height: number | null;
  /**
   * Sub-pixel position of the slot: how far (in CSS px, |v| < 1 device
   * pixel) the slot's content box is from the device-pixel position the
   * browser snaps the iframe to. The remote offsets its root by this so text
   * lands on the same sub-pixel positions as it would inline.
   */
  offsetX: number;
  offsetY: number;
  /**
   * The slot's nearest query containers (nearest first, at most 2), so
   * container queries and container units in the remote resolve against
   * the host's containers.
   */
  containers?: ContainerInfo[];
  /**
   * Height of the host's own viewport in CSS px. With an auto slot height,
   * `vh` lengths that do not size the root use it (SPEC §7.4).
   */
  viewportHeight?: number;
}

export interface ContainerInfo {
  /** Content-box size in CSS px. */
  width: number;
  /** Content-box height for `size` containers, else null. */
  height: number | null;
  /** `container-name` ("" for none). */
  name: string;
  type: "inline-size" | "size";
}

/** Remote measurement of its content. */
export interface SizeReport {
  /** The root width (from LayoutInfo) the height was measured at. */
  width: number;
  /** Content height at `width` with height auto. */
  height: number;
  /** min-content width of the content. */
  minContent: number;
  /** max-content width of the content. */
  maxContent: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type OverlayKind = "popover" | "dialog";
export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";
export interface Placement {
  side: Side;
  align: Align;
}

/**
 * Overlay content: a URL (resolved against the requesting remote's URL by
 * the runtime), or an HTML document the host renders like the `html` prop.
 */
export type OverlayContent =
  | { src: string; props: Encoded }
  | { html: string; props: Encoded };

export interface OverlayOpenParams {
  id: string;
  kind: OverlayKind;
  content: OverlayContent;
  /** Anchor rect in the requesting remote's root coordinates (required for popovers). */
  anchor?: Rect;
  placement?: Placement;
  /** Gap between anchor and overlay in px. */
  offset?: number;
  /** Accessible label for dialogs. */
  label?: string;
  /** Match the anchor's width (dropdowns). */
  matchAnchorWidth?: boolean;
}

export interface OverlayUpdateParams {
  id: string;
  anchor?: Rect;
  props?: Encoded;
  /** Options changed while the overlay is open. */
  placement?: Placement;
  offset?: number;
  label?: string;
  matchAnchorWidth?: boolean;
}

export type DismissReason = "escape" | "outside" | "host" | "error" | "unmount";

export interface FnRef {
  /** "props" for host props; "overlay:<id>" for props a remote passed to an overlay. */
  scope: string;
  path: Path;
}

/* ------------------------------------------------------------------------ */
/* Channel methods (MessagePort)                                            */
/* ------------------------------------------------------------------------ */

/** Notifications the host sends to the remote. */
export interface HostNotifications {
  "rc/notifications/props-changed": {
    seq: number;
    set: EncodedProps;
    del: string[];
  };
  "rc/notifications/theme-changed": { theme: ThemeSnapshot };
  "rc/notifications/layout-changed": { layout: LayoutInfo };
  "rc/notifications/overlay-dismissed": { id: string; reason: DismissReason };
  /** The caller gave up on a request (AbortSignal in its arguments). Both directions. */
  "rc/notifications/cancelled": { requestId: number };
}

/** Notifications the remote sends to the host. */
export interface RemoteNotifications {
  /** Once per document: rendered, with the first size. */
  "rc/notifications/ready": { size: SizeReport };
  "rc/notifications/size-changed": { size: SizeReport };
  /** An uncaught error or unhandled rejection in the remote (never fatal). */
  "rc/notifications/error": { error: SerializedError };
  "rc/notifications/overlay-anchor-changed": { id: string; anchor: Rect };
  /** Pointer went down in the remote; ids of its open overlays whose anchor contains the target. */
  "rc/notifications/pointer-down": { insideAnchorOf: string[] };
  /** Escape pressed in the remote and not handled (defaultPrevented) by the page. */
  "rc/notifications/escape-pressed": Record<string, never>;
  /** Tab left the remote's first/last tab stop; the host moves focus to its adjacent stop. */
  "rc/notifications/focus-exit": { direction: "next" | "previous" };
  /** The remote document gained focus with nothing focused in it (e.g. Firefox's frame tab stop). */
  "rc/notifications/focus-enter": Record<string, never>;
  /** An element in the remote got focus (not from a click); the host scrolls its own scrollers so `rect` is visible. */
  "rc/notifications/focus-changed": { rect: Rect };
  "rc/notifications/cancelled": { requestId: number };
}

/** Requests the remote makes of the host: method → [params, result]. */
export interface HostMethods {
  "rc/call": [{ ref: FnRef; args: Encoded }, Encoded];
  "rc/overlay/open": [OverlayOpenParams, null];
  "rc/overlay/update": [OverlayUpdateParams, null];
  "rc/overlay/close": [{ id: string }, null];
}

/** Requests the host makes of the remote. */
export interface RemoteMethods {
  "rc/call": [{ ref: FnRef; args: Encoded }, Encoded];
  /**
   * Move focus into the remote. `focusVisible`: show the focus ring (true:
   * keyboard navigation, false: pointer); absent leaves it to the browser.
   */
  "rc/focus": [
    { target: "first" | "last" | "restore"; focusVisible?: boolean },
    null,
  ];
}
