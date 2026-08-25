import { describe, expect, it } from "vitest";
import { AssistantCloud } from "../AssistantCloud";
import type { AssistantCloudTelemetryConfig } from "../AssistantCloudAPI";

const createCloud = (
  telemetry?: ConstructorParameters<typeof AssistantCloud>[0]["telemetry"],
) =>
  new AssistantCloud({
    apiKey: "test-key",
    userId: "user-id",
    workspaceId: "workspace-id",
    ...(telemetry !== undefined ? { telemetry } : {}),
  });

describe("AssistantCloud telemetry config", () => {
  it("defaults to enabled", () => {
    expect(createCloud().telemetry.enabled).toBe(true);
    expect(createCloud(true).telemetry.enabled).toBe(true);
  });

  it("disables when configured off", () => {
    expect(createCloud(false).telemetry.enabled).toBe(false);
    expect(createCloud({ enabled: false }).telemetry.enabled).toBe(false);
  });

  it("stays enabled when the config object carries an undefined enabled", () => {
    const beforeReport: NonNullable<
      AssistantCloudTelemetryConfig["beforeReport"]
    > = (report) => report;
    // JS consumers (and TS apps without exactOptionalPropertyTypes) can pass
    // an explicitly-undefined enabled, e.g. { enabled: cfg.enabled }.
    const telemetry = createCloud({
      enabled: undefined,
      beforeReport,
    } as unknown as AssistantCloudTelemetryConfig).telemetry;
    expect(telemetry.enabled).toBe(true);
    expect(telemetry.beforeReport).toBe(beforeReport);
  });
});
