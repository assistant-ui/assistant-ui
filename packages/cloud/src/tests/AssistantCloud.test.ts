import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to enabled", () => {
    expect(createCloud().telemetry.enabled).toBe(true);
    expect(createCloud(true).telemetry.enabled).toBe(true);
  });

  it("disables when configured off", () => {
    expect(createCloud(false).telemetry.enabled).toBe(false);
    expect(createCloud({ enabled: false }).telemetry.enabled).toBe(false);
  });

  it("can disable engagement events without disabling run reports", () => {
    expect(createCloud({ events: false }).telemetry).toEqual({
      enabled: true,
      events: false,
    });
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

  it("preserves configured run report dimensions", () => {
    expect(
      createCloud({
        release: "web-2026.09.08",
        environment: "production",
        tags: ["region:sg", "tier:paid"],
      }).telemetry,
    ).toEqual({
      enabled: true,
      release: "web-2026.09.08",
      environment: "production",
      tags: ["region:sg", "tier:paid"],
    });
  });

  it("forwards registered SDK identities to requests and stream options", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue(JSON.stringify({ threads: [] })),
    });
    vi.stubGlobal("fetch", fetchMock);

    const cloud = createCloud();
    cloud.registerSdk({ name: "@assistant-ui/core", version: "0.3.18" });

    await cloud.threads.list();

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers).toMatchObject({
      "Aui-Sdk": expect.stringMatching(
        /^assistant-cloud\/.* @assistant-ui\/core\/0\.3\.18$/,
      ),
    });
    await expect(
      cloud.runs.__internal_getAssistantOptions("assistant-id").headers(),
    ).resolves.toMatchObject({
      "Aui-Sdk": expect.stringMatching(
        /^assistant-cloud\/.* @assistant-ui\/core\/0\.3\.18$/,
      ),
    });
  });
});
