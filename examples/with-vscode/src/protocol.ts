import type { ProbeId, ProbeResult } from "./readiness/probes";
import type { Switchboard, SwitchboardKey } from "./switchboard";

export const TESTBED_CHANNEL = "aui-testbed";

/** `<body>` attribute that carries the JSON `WebviewBootConfig`. */
export const BOOT_ATTRIBUTE = "data-aui-testbed-boot";

export type WebviewBootConfig = {
  switchboard: Switchboard;
  unimplemented: { key: SwitchboardKey; value: string }[];
};

/** A step a host probe runs in the webview, such as seeding a thread before a reload. */
export type WebviewTaskId = "seed-thread" | "find-thread";

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
