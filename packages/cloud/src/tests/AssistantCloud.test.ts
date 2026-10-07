import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantCloud } from "../AssistantCloud";
import type { AssistantCloudTelemetryConfig } from "../AssistantCloudAPI";

const createAccessToken = (subject: string) =>
  `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: 4102444800, sub: subject })).toString("base64url")}.sig`;

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
    vi.useRealTimers();
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

  it.each(["enabled", "events"] as const)(
    "does not resume pending events after telemetry %s is disabled",
    async (property) => {
      vi.useFakeTimers();
      const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline"));
      vi.stubGlobal("fetch", fetchMock);
      const cloud = createCloud();

      for (let index = 0; index < 20; index++) {
        cloud.events.track({ kind: "message_sent" });
      }
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

      cloud.telemetry[property] = false;
      cloud.telemetry[property] = true;
      await vi.runAllTimersAsync();

      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

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

describe("AssistantCloud auth", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("invalidates the cached token when the provider identity changes", async () => {
    const userAToken = createAccessToken("user-a");
    const userBToken = createAccessToken("user-b");
    let currentToken = userAToken;
    const authToken = vi.fn(async () => currentToken);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          Authorization: `Bearer ${createAccessToken("internal-user-a")}`,
        }),
        text: vi.fn().mockResolvedValue(JSON.stringify({ threads: [] })),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(JSON.stringify({ threads: [] })),
      } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    const cloud = new AssistantCloud({
      baseUrl: "https://test.example.com",
      authToken,
    });

    await cloud.threads.list();
    currentToken = userBToken;
    cloud.auth.invalidate();
    await cloud.threads.list();

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: `Bearer ${userAToken}`,
    });
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      Authorization: `Bearer ${userBToken}`,
    });
    expect(authToken).toHaveBeenCalledTimes(2);
  });

  it("discards pending engagement events when auth is invalidated", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const cloud = new AssistantCloud({
      baseUrl: "https://test.example.com",
      authToken: async () => createAccessToken("user-a"),
    });

    cloud.events.track({ kind: "message_sent" });
    cloud.auth.invalidate();
    await vi.runAllTimersAsync();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
