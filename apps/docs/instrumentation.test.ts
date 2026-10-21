import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assistantCloudExporterConfig,
  axiomExporterConfig,
  isAiSpan,
  onRequestError,
} from "./instrumentation";

const posthogServer = vi.hoisted(() => ({
  captureRequestError: vi.fn(async () => {}),
}));

vi.mock("./lib/posthog-server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/posthog-server")>()),
  captureRequestError: posthogServer.captureRequestError,
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

function span(name: string, attributes: Record<string, unknown> = {}) {
  return { name, attributes } as unknown as ReadableSpan;
}

describe("isAiSpan", () => {
  it("accepts a span whose name carries an AI prefix", () => {
    expect(isAiSpan(span("ai.streamText"))).toBe(true);
    expect(isAiSpan(span("gen_ai.client"))).toBe(true);
  });

  it("accepts a span whose attributes carry an AI prefix", () => {
    expect(
      isAiSpan(
        span("chat gpt-6-luna", {
          "ai.settings.context.posthog_distinct_id": "user_1",
        }),
      ),
    ).toBe(true);
  });

  it("drops an ordinary request span", () => {
    expect(
      isAiSpan(
        span("GET /docs/[[...slug]]", {
          "http.method": "GET",
          "next.route": "/docs/[[...slug]]",
        }),
      ),
    ).toBe(false);
  });
});

describe("axiomExporterConfig", () => {
  const creds = { AXIOM_TOKEN: "xaat-test", AXIOM_DATASET: "traces" };

  it("returns null unless both credentials are present", () => {
    expect(axiomExporterConfig({})).toBeNull();
    expect(axiomExporterConfig({ AXIOM_TOKEN: "xaat-test" })).toBeNull();
    expect(axiomExporterConfig({ AXIOM_DATASET: "traces" })).toBeNull();
  });

  it("defaults to the US host when the domain is unset or blank", () => {
    expect(axiomExporterConfig(creds)?.url).toBe(
      "https://api.axiom.co/v1/traces",
    );
    expect(axiomExporterConfig({ ...creds, AXIOM_DOMAIN: "" })?.url).toBe(
      "https://api.axiom.co/v1/traces",
    );
  });

  it("honours an explicit region", () => {
    expect(
      axiomExporterConfig({ ...creds, AXIOM_DOMAIN: "api.eu.axiom.co" })?.url,
    ).toBe("https://api.eu.axiom.co/v1/traces");
  });

  it("carries the token and dataset headers", () => {
    expect(axiomExporterConfig(creds)?.headers).toEqual({
      Authorization: "Bearer xaat-test",
      "X-Axiom-Dataset": "traces",
    });
  });
});

describe("assistantCloudExporterConfig", () => {
  it("returns null without an API key", () => {
    expect(assistantCloudExporterConfig({})).toBeNull();
    expect(assistantCloudExporterConfig({ ASSISTANT_API_KEY: "" })).toBeNull();
  });

  it("returns the API key with the default backend", () => {
    expect(
      assistantCloudExporterConfig({ ASSISTANT_API_KEY: "aask-test" }),
    ).toEqual({
      apiKey: "aask-test",
      baseUrl: undefined,
    });
  });

  it("uses a configured backend URL", () => {
    expect(
      assistantCloudExporterConfig({
        ASSISTANT_API_KEY: "aask-test",
        ASSISTANT_BACKEND_URL: "https://staging.assistant-api.com",
      }),
    ).toEqual({
      apiKey: "aask-test",
      baseUrl: "https://staging.assistant-api.com",
    });
  });

  it("falls back to the default backend when its URL is blank", () => {
    expect(
      assistantCloudExporterConfig({
        ASSISTANT_API_KEY: "aask-test",
        ASSISTANT_BACKEND_URL: "",
      }),
    ).toEqual({
      apiKey: "aask-test",
      baseUrl: undefined,
    });
  });
});

describe("onRequestError", () => {
  const args = [
    new Error("boom"),
    { path: "/api/chat", method: "POST", headers: {} },
    {
      routerKind: "App Router",
      routePath: "/api/chat",
      routeType: "route",
      revalidateReason: undefined,
    },
  ] as const;

  it("reports server errors from the Node.js runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");

    await onRequestError(...args);

    expect(posthogServer.captureRequestError).toHaveBeenCalledExactlyOnceWith(
      ...args,
    );
  });

  it("skips the edge runtime, where posthog-node cannot run", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");

    await onRequestError(...args);

    expect(posthogServer.captureRequestError).not.toHaveBeenCalled();
  });
});
