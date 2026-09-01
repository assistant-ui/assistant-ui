// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { startTransition, Suspense, type FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { useAdkRuntime } from "./useAdkRuntime";
import type { AdkMessage, AdkThreadSnapshot } from "./types";

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "adk-1",
        externalId: "adk-1",
        title: "Existing ADK session",
      },
    ],
  })),
  initialize: vi.fn(async () => ({
    remoteId: "adk-1",
    externalId: "adk-1",
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream() as never),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "adk-1",
    externalId: "adk-1",
    title: "Existing ADK session",
  })),
});

const aiMessage = (id: string, text: string): AdkMessage => ({
  id,
  type: "ai",
  content: [{ type: "text", text }],
});

type Load = (
  threadId: string,
  options?: { signal?: AbortSignal | undefined },
) => Promise<AdkThreadSnapshot>;

describe("useAdkRuntime committed refs", () => {
  it("refetches through the committed load after an abandoned render", async () => {
    const loadA = vi.fn(async () => ({
      messages: [aiMessage("m-1", "from A")],
    })) as unknown as Load;
    const loadB = vi.fn(async () => ({
      messages: [aiMessage("m-2", "from B")],
    })) as unknown as Load;
    const streamMock = vi.fn(async function* () {});
    const sessionAdapter = makeThreadListAdapter();

    const pending = new Promise<never>(() => {});
    let blocked = false;
    const interruptedRender = vi.fn();
    const Blocker = () => {
      if (blocked) {
        interruptedRender();
        throw pending;
      }
      return null;
    };

    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const Inner: FC<{ load: Load }> = ({ load }) => {
      const runtime = useAdkRuntime({
        stream: streamMock as never,
        load,
        sessionAdapter,
      });
      capture.runtime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    const Tree: FC<{ load: Load }> = ({ load }) => (
      <Suspense fallback={null}>
        <Inner load={load} />
        <Blocker />
      </Suspense>
    );

    let view!: ReturnType<typeof render>;
    await act(async () => {
      view = render(<Tree load={loadA} />);
    });
    await waitFor(() => expect(capture.runtime).not.toBeNull());

    await act(async () => {
      await capture.runtime!.threads.switchToThread("adk-1");
    });
    await waitFor(() => expect(loadA).toHaveBeenCalledTimes(1));

    act(() => {
      blocked = true;
      startTransition(() => view.rerender(<Tree load={loadB} />));
    });
    expect(interruptedRender).toHaveBeenCalled();

    await act(async () => {
      await capture.runtime!.threads.reloadMainThread();
    });

    expect(loadA).toHaveBeenCalledTimes(2);
    expect(loadB).not.toHaveBeenCalled();

    await act(async () => {
      blocked = false;
      view.rerender(<Tree load={loadB} />);
    });
    await act(async () => {
      await capture.runtime!.threads.reloadMainThread();
    });
    expect(loadB).toHaveBeenCalledTimes(1);

    view.unmount();
  });
});
