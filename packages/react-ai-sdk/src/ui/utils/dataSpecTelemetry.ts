import type { AISDKDataSpecTelemetryEvent } from "./convertMessage";

export type AISDKDataSpecTelemetryCounters = {
  staleSeqIgnored: number;
  malformedPatchDropped: number;
};

export type AISDKDataSpecTelemetrySink = {
  onTelemetry: (event: AISDKDataSpecTelemetryEvent) => void;
  getCounters: () => AISDKDataSpecTelemetryCounters;
  reset: () => void;
};

export type CreateAISDKDataSpecTelemetrySinkOptions = {
  onEvent?:
    | ((
        event: AISDKDataSpecTelemetryEvent,
        counters: AISDKDataSpecTelemetryCounters,
      ) => void)
    | undefined;
};

export const createAISDKDataSpecTelemetrySink = (
  options: CreateAISDKDataSpecTelemetrySinkOptions = {},
): AISDKDataSpecTelemetrySink => {
  const counters: AISDKDataSpecTelemetryCounters = {
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
