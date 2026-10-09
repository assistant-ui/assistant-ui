import { OpenTelemetry } from "@ai-sdk/otel";
import type { TelemetryOptions } from "ai";

const integration = new OpenTelemetry({ runtimeContext: true });

type PosthogTelemetryOptions = {
  distinctId: string;
  spanName: string;
  source: string;
  properties?: Record<string, string>;
};

type PosthogRuntimeContext = Record<string, string>;

// PostHog's OTLP ingestion resolves the event identity from the
// posthog_distinct_id context key, promotes posthog_-prefixed keys to event
// properties with the prefix stripped, and lets $ai_span_name override the
// span name on every span of the call.
export function posthogTelemetry({
  distinctId,
  spanName,
  source,
  properties = {},
}: PosthogTelemetryOptions): {
  runtimeContext: PosthogRuntimeContext;
  telemetry: TelemetryOptions<PosthogRuntimeContext>;
} {
  const runtimeContext: PosthogRuntimeContext = {
    $ai_span_name: spanName,
    posthog_distinct_id: distinctId,
    posthog_source: source,
    ...Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        `posthog_${key}`,
        value,
      ]),
    ),
  };

  return {
    runtimeContext,
    telemetry: {
      functionId: spanName,
      includeRuntimeContext: Object.fromEntries(
        Object.keys(runtimeContext).map((key) => [key, true]),
      ),
      integrations: [integration],
    },
  };
}
