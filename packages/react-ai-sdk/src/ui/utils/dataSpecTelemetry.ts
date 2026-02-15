import type { unstable_AISDKDataSpecTelemetryEvent } from "./convertMessage";

export type unstable_AISDKDataSpecTelemetryCounters = {
  staleSeqIgnored: number;
  malformedPatchDropped: number;
};

export type unstable_AISDKDataSpecTelemetrySink = {
  onTelemetry: (event: unstable_AISDKDataSpecTelemetryEvent) => void;
  getCounters: () => unstable_AISDKDataSpecTelemetryCounters;
  reset: () => void;
};

export type unstable_AISDKDataSpecTelemetrySinkOptions = {
  onEvent?:
    | ((
        event: unstable_AISDKDataSpecTelemetryEvent,
        counters: unstable_AISDKDataSpecTelemetryCounters,
      ) => void)
    | undefined;
};

export const unstable_createAISDKDataSpecTelemetrySink = (
  options: unstable_AISDKDataSpecTelemetrySinkOptions = {},
): unstable_AISDKDataSpecTelemetrySink => {
  const counters: unstable_AISDKDataSpecTelemetryCounters = {
    staleSeqIgnored: 0,
    malformedPatchDropped: 0,
  };

  return {
    onTelemetry: (event) => {
      if (event.type === "stale-seq-ignored") {
        counters.staleSeqIgnored += 1;
      } else {
        counters.malformedPatchDropped += 1;
      }

      options.onEvent?.(event, { ...counters });
    },
    getCounters: () => ({ ...counters }),
    reset: () => {
      counters.staleSeqIgnored = 0;
      counters.malformedPatchDropped = 0;
    },
  };
};
