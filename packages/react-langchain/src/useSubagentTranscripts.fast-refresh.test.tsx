// @vitest-environment jsdom

import { act, useMemo } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { UIMessage } from "./types";

type Family = { current: unknown };
type RendererInternals = {
  setRefreshHandler: (resolve: (type: unknown) => Family | undefined) => void;
  scheduleRefresh: (
    root: unknown,
    update: { staleFamilies: Set<Family>; updatedFamilies: Set<Family> },
  ) => void;
};

const { streamController } = vi.hoisted(() => ({
  streamController: Symbol("STREAM_CONTROLLER"),
}));

vi.mock("@langchain/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@langchain/react")>()),
  STREAM_CONTROLLER: streamController,
}));

let renderer: RendererInternals | undefined;
const fiberRoots = new Set<unknown>();
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
vi.stubGlobal("__REACT_DEVTOOLS_GLOBAL_HOOK__", {
  supportsFiber: true,
  inject: (internals: RendererInternals) => {
    renderer = internals;
    return 1;
  },
  onScheduleFiberRoot: () => {},
  onCommitFiberRoot: (_id: number, root: unknown) => fiberRoots.add(root),
  onCommitFiberUnmount: () => {},
});
const { cleanup, render, waitFor } = await import("@testing-library/react");
const { useSubagentTranscripts } = await import("./useSubagentTranscripts");

afterEach(() => {
  cleanup();
  renderer?.setRefreshHandler(() => undefined);
  fiberRoots.clear();
});
afterAll(() => vi.unstubAllGlobals());

it("keeps a live subagent projection and namespace request through Fast Refresh, then disposes on unmount", async () => {
  const listeners = new Set<() => void>();
  let messages = [
    { id: "message-one", _getType: () => "ai", content: "partial" },
  ];
  const store = {
    getSnapshot: () => messages,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const release = vi.fn();
  const acquire = vi.fn(() => ({ store, release }));
  let settleFirst!: () => void;
  const pending = new Promise<void>((resolve) => {
    settleFirst = resolve;
  });
  const resolveSubagentNamespace = vi
    .fn<() => Promise<void>>()
    .mockReturnValueOnce(pending)
    .mockResolvedValue(undefined);
  const snapshot = (status: "running" | "complete") => ({
    id: "task-one",
    namespace: ["tools:task-one"],
    status,
    parentId: null,
    depth: 1,
    startedAt: new Date(1_000),
    completedAt: status === "complete" ? new Date(4_000) : null,
  });
  const stream = {
    subagents: new Map([["task-one", snapshot("running")]]),
    [streamController]: {
      registry: { acquire },
      resolveSubagentNamespace,
    },
  };
  const uiMaps = new Set<Map<string, UIMessage[]>>();
  let transcript: ReturnType<typeof useSubagentTranscripts> | undefined;
  let rendered: string | undefined;
  const host = (name: string) => () => {
    const uiMessagesByParent = useMemo(
      () => new Map<string, UIMessage[]>(),
      [],
    );
    uiMaps.add(uiMessagesByParent);
    rendered = name;
    transcript = useSubagentTranscripts(stream as never, uiMessagesByParent);
    return null;
  };
  const Before = host("before");
  const After = host("after");
  const view = render(<Before />);

  await waitFor(() => expect(transcript?.has("task-one")).toBe(true));
  expect(resolveSubagentNamespace).toHaveBeenCalledOnce();
  expect(listeners.size).toBe(1);
  await act(async () => {
    messages = [
      { id: "message-one", _getType: () => "ai", content: "partial answer" },
    ];
    for (const listener of listeners) listener();
  });

  const family: Family = { current: After };
  renderer!.setRefreshHandler((type) =>
    type === Before || type === After ? family : undefined,
  );
  await act(async () => {
    for (const root of fiberRoots) {
      renderer!.scheduleRefresh(root, {
        staleFamilies: new Set(),
        updatedFamilies: new Set([family]),
      });
    }
  });
  await act(async () => {});

  expect(rendered).toBe("after");
  expect(uiMaps.size).toBeGreaterThan(1);
  expect(release).not.toHaveBeenCalled();
  expect(acquire).toHaveBeenCalledOnce();
  expect(listeners.size).toBe(1);
  expect(resolveSubagentNamespace).toHaveBeenCalledOnce();

  stream.subagents = new Map([["task-one", snapshot("complete")]]);
  view.rerender(<After />);
  await waitFor(() =>
    expect(
      transcript?.get("task-one")?.messages[0]?.metadata?.timing,
    ).toMatchObject({
      totalChunks: 2,
    }),
  );
  await act(async () => settleFirst());
  await waitFor(() =>
    expect(resolveSubagentNamespace).toHaveBeenCalledTimes(2),
  );

  view.unmount();
  await act(async () => {});
  expect(release).toHaveBeenCalledOnce();
  expect(listeners.size).toBe(0);
});
