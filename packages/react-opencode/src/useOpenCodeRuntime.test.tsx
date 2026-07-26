// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import type { createOpencodeClient } from "@opencode-ai/sdk/v2/client";

const { ponyfillCalls } = vi.hoisted(() => ({
  ponyfillCalls: { count: 0 },
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffectEvent: undefined,
}));

vi.mock("use-effect-event", async (importOriginal) => {
  const mod = await importOriginal<typeof import("use-effect-event")>();
  return {
    ...mod,
    useEffectEvent: ((fn: never) => {
      ponyfillCalls.count += 1;
      return mod.useEffectEvent(fn);
    }) as typeof mod.useEffectEvent,
  };
});

import { useOpenCodeRuntime } from "./useOpenCodeRuntime";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const stubClient = {
  experimental: {
    session: {
      list: () => Promise.resolve({ data: [] }),
    },
  },
} as unknown as ReturnType<typeof createOpencodeClient>;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
});

describe("useOpenCodeRuntime", () => {
  it("mounts on React versions without a native useEffectEvent", async () => {
    const App = () => {
      const runtime = useOpenCodeRuntime({ client: stubClient });
      return createElement(AssistantRuntimeProvider, { runtime });
    };
    const container = document.createElement("div");
    root = createRoot(container);
    await act(async () => {
      root!.render(createElement(App));
    });
    expect(ponyfillCalls.count).toBeGreaterThan(0);
  });
});
