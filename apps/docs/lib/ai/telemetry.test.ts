import { describe, expect, it } from "vitest";
import { posthogTelemetry } from "./telemetry";

describe("posthogTelemetry", () => {
  it("carries identity, span name, and source in the runtime context", () => {
    const { runtimeContext } = posthogTelemetry({
      distinctId: "anon_1.2.3.4",
      spanName: "general_chat",
      source: "general_chat",
    });

    expect(runtimeContext).toEqual({
      $ai_span_name: "general_chat",
      posthog_distinct_id: "anon_1.2.3.4",
      posthog_source: "general_chat",
    });
  });

  it("prefixes extra properties with posthog_", () => {
    const { runtimeContext } = posthogTelemetry({
      distinctId: "user_1",
      spanName: "xulux_chat",
      source: "xulux_chat",
      properties: { courseId: "generative-ui", lessonId: "02" },
    });

    expect(runtimeContext["posthog_courseId"]).toBe("generative-ui");
    expect(runtimeContext["posthog_lessonId"]).toBe("02");
  });

  it("opts every runtime context key into telemetry", () => {
    const { runtimeContext, telemetry } = posthogTelemetry({
      distinctId: "user_1",
      spanName: "docs_assistant_chat",
      source: "docs_assistant",
      properties: { page: "/docs" },
    });

    expect(telemetry.includeRuntimeContext).toEqual(
      Object.fromEntries(Object.keys(runtimeContext).map((key) => [key, true])),
    );
  });

  it("groups calls under the span name and provides an integration", () => {
    const { telemetry } = posthogTelemetry({
      distinctId: "user_1",
      spanName: "general_chat",
      source: "general_chat",
    });

    expect(telemetry.functionId).toBe("general_chat");
    expect(telemetry.integrations).toHaveLength(1);
  });
});
