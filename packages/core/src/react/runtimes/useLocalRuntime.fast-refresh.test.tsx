// @vitest-environment jsdom

import { Activity, act, type FC, type ReactNode, version } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { ChatModelAdapter } from "../../runtime/utils/chat-model-adapter";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { ThreadMessage } from "../../types/message";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { ThreadListItemRuntimeProvider } from "../providers/ThreadListItemRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useLocalRuntime } from "./useLocalRuntime";

const onReact18 = version.startsWith("18.");

const Visibility: FC<{ mode: "visible" | "hidden"; children: ReactNode }> =
  onReact18 ? ({ children }) => <>{children}</> : Activity;

type Family = { current: unknown };
type RendererInternals = {
  setRefreshHandler: (resolve: (type: unknown) => Family | undefined) => void;
  scheduleRefresh: (
    root: unknown,
    update: { staleFamilies: Set<Family>; updatedFamilies: Set<Family> },
  ) => void;
};

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

afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

it.for(["unmount", "Activity hide"])(
  "keeps a local run through Fast Refresh and detaches on %s",
  async (end, { skip }) => {
    // Activity is React 19 only.
    skip(onReact18 && end === "Activity hide");
    let signal: AbortSignal | undefined;
    const run = vi.fn<ChatModelAdapter["run"]>(async ({ abortSignal }) => {
      signal = abortSignal;
      await new Promise<void>((resolve) => {
        abortSignal.addEventListener("abort", () => resolve(), { once: true });
      });
      return { content: [] };
    });
    const model: ChatModelAdapter = { run };
    let runtime!: AssistantRuntime;
    const Before = () => {
      runtime = useLocalRuntime(model);
      return null;
    };
    const After = () => {
      runtime = useLocalRuntime(model);
      return null;
    };
    const Outer = ({ mode }: { mode: "visible" | "hidden" }) => {
      const host = useExternalStoreRuntime<ThreadMessage>({
        messages: [],
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={host}>
          <ThreadListItemRuntimeProvider runtime={host.threads.mainItem}>
            <Visibility mode={mode}>
              <Before />
            </Visibility>
          </ThreadListItemRuntimeProvider>
        </AssistantRuntimeProvider>
      );
    };
    const tree = (mode: "visible" | "hidden") => <Outer mode={mode} />;
    const view = render(tree("visible"));
    act(() => {
      void runtime.thread.append("hello");
    });
    await waitFor(() => expect(run).toHaveBeenCalledOnce());
    const initialSignal = signal!;
    const family: Family = { current: After };
    renderer!.setRefreshHandler((type) =>
      type === Before || type === After ? family : undefined,
    );
    await act(async () => {
      for (const fiberRoot of fiberRoots) {
        renderer!.scheduleRefresh(fiberRoot, {
          staleFamilies: new Set(),
          updatedFamilies: new Set([family]),
        });
      }
    });
    expect(initialSignal.aborted).toBe(false);
    expect(runtime.thread.getState().isRunning).toBe(true);

    if (end === "unmount") view.unmount();
    else act(() => view.rerender(tree("hidden")));
    expect(initialSignal.aborted).toBe(false);
    await act(async () => {});
    expect(initialSignal.aborted).toBe(true);
  },
);
