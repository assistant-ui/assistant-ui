// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { describe, expect, it, vi } from "vitest";
import { useAdkAppState } from "./hooks";
import type { AdkEvent } from "./types";
import { useAdkRuntime } from "./useAdkRuntime";

describe("ADK state hook rendering", () => {
  it("keeps app state stable across unrelated store updates", async () => {
    const deltas = [
      {
        "app:visible": 1,
        "app:__proto__": { source: "provider" },
      },
      { unrelated: true },
      { "app:visible": 2 },
    ];
    const stream = vi.fn(async function* () {
      const call = stream.mock.calls.length - 1;
      yield {
        id: `event-${call}`,
        author: "agent",
        actions: { stateDelta: deltas[call] },
        turnComplete: true,
      } satisfies AdkEvent;
    });

    let runtime: AssistantRuntime | undefined;
    let appState: Record<string, unknown> | undefined;

    const Probe = () => {
      appState = useAdkAppState();
      return null;
    };

    const App = () => {
      runtime = useAdkRuntime({
        stream,
        create: async () => ({ externalId: "thread-1" }),
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Probe />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    const send = (text: string) =>
      act(async () => {
        await runtime!.thread.append({
          role: "user",
          content: [{ type: "text", text }],
        });
      });

    await send("first");
    await waitFor(() => expect(appState?.visible).toBe(1));

    const initial = appState;
    expect(Object.hasOwn(initial!, "__proto__")).toBe(true);
    expect(initial?.["__proto__"]).toEqual({ source: "provider" });

    await send("second");
    expect(appState).toBe(initial);

    await send("third");
    await waitFor(() => expect(appState?.visible).toBe(2));
    expect(appState).not.toBe(initial);
  });
});
