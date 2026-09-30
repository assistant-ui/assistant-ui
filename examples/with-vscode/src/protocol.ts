import type { ProbeId, ProbeResult } from "./readiness/probes";
import type { Switchboard, SwitchboardKey } from "./switchboard";

export const TESTBED_CHANNEL = "aui-testbed";

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
