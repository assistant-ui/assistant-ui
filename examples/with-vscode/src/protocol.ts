import type { ProbeId, ProbeResult } from "./readiness/probes";
import type { Switchboard, SwitchboardKey } from "./switchboard";

export const TESTBED_CHANNEL = "aui-testbed";

/** `<body>` attribute that carries the JSON `WebviewBootConfig`. */
export const BOOT_ATTRIBUTE = "data-aui-testbed-boot";

export type WebviewBootConfig = {
  switchboard: Switchboard;
  unimplemented: { key: SwitchboardKey; value: string }[];
};

export type HostToWebviewMessage = {
  channel: typeof TESTBED_CHANNEL;
  type: "run-probe";
  requestId: string;
  probeId: ProbeId;
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
