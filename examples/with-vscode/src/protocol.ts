import type { ProbeId, ProbeResult } from "./readiness/probes";
import type { Switchboard, SwitchboardKey } from "./switchboard";

export const TESTBED_CHANNEL = "aui-testbed";

/** `<body>` attribute that carries the JSON `WebviewBootConfig`. */
export const BOOT_ATTRIBUTE = "data-aui-testbed-boot";

export type WebviewBootConfig = {
  switchboard: Switchboard;
  unimplemented: { key: SwitchboardKey; value: string }[];
  /** Set for the component gallery panel, absent for the Assistant view. */
  gallery?: GalleryView;
};

/** What the component gallery shows. */
export type GalleryView = {
  /** Renders only this section, in isolation; `null` renders every section. */
  section: string | null;
  /** Forces each section card to this width in CSS pixels; `null` fills the panel. */
  width: number | null;
  /** Turns off animations and transitions, for screenshots and sweeps. */
  noMotion?: boolean;
};

/** The narrow width sections are checked and captured at: a sidebar. */
export const NARROW_WIDTH = 320;

/** A rectangle in the webview's viewport, in CSS pixels. */
export type ViewportRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** What `gallery-show` returns once the view has rendered and settled. */
export type GalleryShown = {
  /** The card of the shown section, or the whole gallery. */
  rect: ViewportRect | null;
  viewport: { width: number; height: number };
};

/** A gallery section as the host lists it. */
export type GallerySectionInfo = {
  id: string;
  title: string;
  category: string;
};

/**
 * A step a host probe or the screenshot run performs in a webview:
 * `seed-thread` and `find-thread` in the Assistant view (thread persistence),
 * `run-fixture` in the Assistant view (send a fixture prompt in a new thread),
 * `gallery-sections` and `gallery-show` in the gallery.
 */
export type WebviewTaskId =
  | "seed-thread"
  | "find-thread"
  | "run-fixture"
  | "gallery-sections"
  | "gallery-show";

/** What `seed-thread` returns and `find-thread` looks for. */
export type SeededThread = { remoteId: string; prompt: string };

export type TaskResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export type HostToWebviewMessage =
  | {
      channel: typeof TESTBED_CHANNEL;
      type: "run-probe";
      requestId: string;
      probeId: ProbeId;
    }
  | {
      channel: typeof TESTBED_CHANNEL;
      type: "run-task";
      requestId: string;
      task: WebviewTaskId;
      arg: unknown;
    };

export type WebviewToHostMessage =
  | {
      channel: typeof TESTBED_CHANNEL;
      type: "ready";
      implementedProbes: ProbeId[];
    }
  | {
      channel: typeof TESTBED_CHANNEL;
      type: "probe-result";
      requestId: string;
      result: ProbeResult;
    }
  | {
      channel: typeof TESTBED_CHANNEL;
      type: "task-result";
      requestId: string;
      result: TaskResult;
    };

export const isTestbedMessage = (
  data: unknown,
): data is { channel: typeof TESTBED_CHANNEL; type: string } =>
  typeof data === "object" &&
  data !== null &&
  (data as { channel?: unknown }).channel === TESTBED_CHANNEL;

export const CHAT_ROUTE = "/api/chat";
export const MODEL_ROUTE = "/api/model";
export const SERVED_REQUESTS_ROUTE = "/testbed/served-requests";
export const COLOR_THEME_ROUTE = "/testbed/color-theme";
export const OPEN_EXTERNAL_ROUTE = "/testbed/open-external";

/** `GET` answers the effective `workbench.colorTheme` and its user setting. */
export type ColorThemeState = { current: string; userValue: string | null };

/** `PUT` sets the user `workbench.colorTheme`; `null` clears it. */
export type ColorThemeUpdate = { theme: string | null };

/** A request a fixture route served over the fetch bridge. */
export type ServedRequest = {
  seq: number;
  path: string;
  prompt: string;
  toolResults: number;
  bytes: number;
  completed: boolean;
  aborted: boolean;
};

/** A URL the webview asked the host to open with `openExternal`. */
export type OpenedUrl = { seq: number; url: string; stubbed: boolean };

/** `GET` answers the log; `PUT` with `{ stub }` turns stubbing on or off. */
export type OpenExternalState = { stub: boolean; opened: OpenedUrl[] };
