// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { SessionState } from "@/lib/session";

const useChatRuntime = vi.hoisted(() => vi.fn(() => ({ runtime: true })));
const mocks = vi.hoisted(() => ({
  session: { status: "loading" } as SessionState,
}));

vi.mock("@assistant-ui/ai-sdk", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useChatRuntime,
  AssistantChatTransport: class {
    options: unknown;
    constructor(options: unknown) {
      this.options = options;
    }
  },
}));

vi.mock("@/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/session")>()),
  useSession: () => mocks.session,
}));

const options = () =>
  useChatRuntime.mock.calls.at(-1)![0] as Record<string, unknown>;

afterEach(() => {
  useChatRuntime.mockClear();
  mocks.session = { status: "loading" };
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("switches cloud ownership only when signed-in history becomes available", async () => {
  vi.stubEnv("NEXT_PUBLIC_ASSISTANT_BASE_URL", "https://cloud.test");
  const { useDocsCloud } = await import("./chat-runtime");
  const { result, rerender } = renderHook(() => useDocsCloud());

  const anonymousCloud = result.current.cloud;
  expect(
    (
      anonymousCloud.threads as unknown as {
        cloud: { _auth: { strategy: string } };
      }
    ).cloud._auth.strategy,
  ).toBe("anon");

  mocks.session = { status: "anonymous" };
  rerender();
  expect(result.current.cloud).toBe(anonymousCloud);

  mocks.session = { status: "disabled" };
  rerender();
  expect(result.current.cloud).toBe(anonymousCloud);

  mocks.session = {
    status: "signed-in",
    cloudHistory: false,
    user: { name: "Ada", email: "ada@test", image: null },
  };
  rerender();
  expect(result.current.cloud).toBe(anonymousCloud);

  mocks.session = {
    status: "signed-in",
    cloudHistory: true,
    user: { name: "Ada", email: "ada@test", image: null },
  };
  rerender();

  const accountCloud = result.current.cloud;
  const strategy = (
    accountCloud.threads as unknown as {
      cloud: {
        _auth: {
          strategy: string;
          getAuthHeaders(): Promise<Record<string, string> | false>;
        };
      };
    }
  ).cloud._auth;
  expect(strategy.strategy).toBe("jwt");
  expect(accountCloud).not.toBe(anonymousCloud);

  const token = `${btoa("header")}.${btoa(
    JSON.stringify({ exp: 4_102_444_800 }),
  )}.signature`;
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ token }));
  vi.stubGlobal("fetch", fetchMock);

  await expect(strategy.getAuthHeaders()).resolves.toEqual({
    Authorization: `Bearer ${token}`,
  });
  expect(fetchMock).toHaveBeenCalledWith("/api/assistant-token", {
    cache: "no-store",
    credentials: "same-origin",
  });

  mocks.session = {
    status: "signed-in",
    cloudHistory: true,
    user: { name: "Grace", email: "grace@test", image: null },
  };
  rerender();
  expect(result.current.cloud).toBe(accountCloud);
});

it("omits sendAutomaticallyWhen unless the surface opts in", async () => {
  const { useDocsChatRuntime } = await import("./chat-runtime");

  useDocsChatRuntime();

  expect("sendAutomaticallyWhen" in options()).toBe(false);
});

it("sets sendAutomaticallyWhen for a surface that opts in", async () => {
  const { useDocsChatRuntime } = await import("./chat-runtime");

  useDocsChatRuntime({ sendAutomatically: true });

  expect(typeof options().sendAutomaticallyWhen).toBe("function");
});

it("omits api and cloud when the surface supplies neither", async () => {
  const { useDocsChatRuntime } = await import("./chat-runtime");

  useDocsChatRuntime();

  expect("cloud" in options()).toBe(false);
  expect(
    (options().transport as { options: { api?: string } }).options.api,
  ).toBe(undefined);
});

it("passes through the api, cloud and adapters a surface supplies", async () => {
  const { useDocsChatRuntime } = await import("./chat-runtime");
  const cloud = {} as never;
  const adapters = { feedback: {} } as never;

  useDocsChatRuntime({ api: "/api/doc/chat", cloud, adapters });

  expect(
    (options().transport as { options: { api?: string } }).options.api,
  ).toBe("/api/doc/chat");
  expect(options().cloud).toBe(cloud);
  expect(options().adapters).toBe(adapters);
});

it("asks for the conversation budget only when the surface opts in", async () => {
  const { useDocsChatRuntime } = await import("./chat-runtime");

  useDocsChatRuntime();
  const plain = options().transport as { options: { body?: unknown } };
  expect(plain.options.body).toBeUndefined();

  useDocsChatRuntime({ countConversations: true });
  const counted = options().transport as {
    options: { body?: Record<string, unknown> };
  };
  expect(counted.options.body).toEqual({ countConversations: true });

  useDocsChatRuntime({ searchDocs: true, countConversations: true });
  const both = options().transport as {
    options: { body?: Record<string, unknown> };
  };
  expect(both.options.body).toEqual({
    searchDocs: true,
    countConversations: true,
  });
});
