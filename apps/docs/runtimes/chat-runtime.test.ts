// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { SessionState } from "@/lib/session";
import { useDocsChatRuntime, useDocsCloud } from "./chat-runtime";

const useChatRuntime = vi.hoisted(() => vi.fn(() => ({ runtime: true })));
const refreshDemoUsage = vi.hoisted(() => vi.fn());
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

vi.mock("@/lib/demo-usage-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/demo-usage-client")>()),
  refreshDemoUsage,
}));

const baseUrl = "https://cloud.test";
const refreshTokenKey = `aui:refresh_token:${baseUrl}`;

const installLocalStorage = (withRefreshToken: boolean) => {
  const values = new Map<string, string>();
  if (withRefreshToken) {
    values.set(
      refreshTokenKey,
      JSON.stringify({ token: "anonymous-refresh", expires_at: "2099-01-01" }),
    );
  }
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  } as Storage);
};

const signedInSession = (cloudHistory = true): SessionState => ({
  status: "signed-in",
  cloudHistory,
  user: { name: "Ada", email: "ada@test", image: null },
});

const cloudStrategy = (cloud: ReturnType<typeof useDocsCloud>["cloud"]) =>
  (
    cloud.threads as unknown as {
      cloud: { _auth: { strategy: string } };
    }
  ).cloud._auth.strategy;

const options = () =>
  useChatRuntime.mock.calls.at(-1)![0] as Record<string, unknown>;

afterEach(() => {
  useChatRuntime.mockClear();
  refreshDemoUsage.mockClear();
  mocks.session = { status: "loading" };
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("switches cloud ownership only when signed-in history becomes available", async () => {
  vi.stubEnv("NEXT_PUBLIC_ASSISTANT_BASE_URL", baseUrl);
  installLocalStorage(false);
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

it("claims a stored anonymous token while switching to account history", async () => {
  vi.stubEnv("NEXT_PUBLIC_ASSISTANT_BASE_URL", baseUrl);
  installLocalStorage(true);
  mocks.session = signedInSession();
  let resolveClaim!: (response: Response) => void;
  const claimResponse = new Promise<Response>((resolve) => {
    resolveClaim = resolve;
  });
  const fetchMock = vi.fn().mockReturnValue(claimResponse);
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useDocsCloud());

  expect(cloudStrategy(result.current.cloud)).toBe("jwt");
  expect(result.current.claims).toBe(0);
  expect(fetchMock).toHaveBeenCalledWith("/api/demo/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: "anonymous-refresh" }),
    credentials: "same-origin",
  });

  resolveClaim(Response.json({ moved: 2 }));
  await waitFor(() => expect(result.current.claims).toBe(1));

  expect(refreshDemoUsage).toHaveBeenCalledOnce();
  expect(fetchMock).toHaveBeenCalledOnce();
});

it("switches without a claim when no anonymous token is stored", () => {
  vi.stubEnv("NEXT_PUBLIC_ASSISTANT_BASE_URL", baseUrl);
  installLocalStorage(false);
  mocks.session = signedInSession();
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useDocsCloud());

  expect(cloudStrategy(result.current.cloud)).toBe("jwt");
  expect(fetchMock).not.toHaveBeenCalled();
});

it("refreshes the budget without a reload after a claim that moved nothing", async () => {
  vi.stubEnv("NEXT_PUBLIC_ASSISTANT_BASE_URL", baseUrl);
  installLocalStorage(true);
  mocks.session = signedInSession();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json({ moved: 0 }))),
  );

  const { result } = renderHook(() => useDocsCloud());

  await waitFor(() => expect(refreshDemoUsage).toHaveBeenCalledOnce());
  expect(result.current.claims).toBe(0);
  expect(cloudStrategy(result.current.cloud)).toBe("jwt");
});

it.each([
  ["network rejection", () => Promise.reject(new Error("network failure"))],
  [
    "bad gateway response",
    () => Promise.resolve(new Response(null, { status: 502 })),
  ],
])(
  "stays on account history after a failed claim from a %s",
  async (_name, response) => {
    vi.stubEnv("NEXT_PUBLIC_ASSISTANT_BASE_URL", baseUrl);
    installLocalStorage(true);
    mocks.session = signedInSession();
    const fetchMock = vi.fn(response);
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(() => useDocsCloud());

    expect(cloudStrategy(result.current.cloud)).toBe("jwt");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 20));
    rerender();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.current.claims).toBe(0);
    expect(refreshDemoUsage).not.toHaveBeenCalled();
  },
);

it("does not claim without signed-in cloud history", () => {
  vi.stubEnv("NEXT_PUBLIC_ASSISTANT_BASE_URL", baseUrl);
  installLocalStorage(true);
  mocks.session = signedInSession(false);
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useDocsCloud());

  expect(cloudStrategy(result.current.cloud)).toBe("anon");
  expect(fetchMock).not.toHaveBeenCalled();
});

it("omits sendAutomaticallyWhen unless the surface opts in", async () => {
  useDocsChatRuntime();

  expect("sendAutomaticallyWhen" in options()).toBe(false);
});

it("sets sendAutomaticallyWhen for a surface that opts in", async () => {
  useDocsChatRuntime({ sendAutomatically: true });

  expect(typeof options().sendAutomaticallyWhen).toBe("function");
});

it("omits api and cloud when the surface supplies neither", async () => {
  useDocsChatRuntime();

  expect("cloud" in options()).toBe(false);
  expect(
    (options().transport as { options: { api?: string } }).options.api,
  ).toBe(undefined);
});

it("passes through the api, cloud and adapters a surface supplies", async () => {
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
