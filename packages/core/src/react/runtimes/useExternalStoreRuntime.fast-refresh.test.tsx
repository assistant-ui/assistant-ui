// @vitest-environment jsdom

import { act } from "react";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { ThreadMessage } from "../../types/message";

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
const { cleanup, render } = await import("@testing-library/react");
const { useExternalStoreRuntime } = await import("./useExternalStoreRuntime");

afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

const disconnect = vi.fn();
const session: RealtimeVoiceAdapter.Session = {
  status: { type: "running" },
  isMuted: false,
  disconnect,
  mute: vi.fn(),
  unmute: vi.fn(),
  onStatusChange: () => () => {},
  onTranscript: () => () => {},
  onModeChange: () => () => {},
  onVolumeChange: () => () => {},
};
const store = {
  messages: [] as ThreadMessage[],
  onNew: async () => {},
  adapters: { voice: { connect: () => session } },
};

let runtime: AssistantRuntime | undefined;
let rendered: "before" | "after" | undefined;
const Before = () => {
  rendered = "before";
  runtime = useExternalStoreRuntime<ThreadMessage>(store);
  return null;
};
const After = () => {
  rendered = "after";
  runtime = useExternalStoreRuntime<ThreadMessage>(store);
  return null;
};

it("keeps the call across a Fast Refresh of its host and ends it on unmount", async () => {
  const view = render(<Before />);
  act(() => runtime!.thread.connectVoice());

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
  await act(async () => {});
  expect(rendered).toBe("after");
  expect(disconnect).not.toHaveBeenCalled();
  expect(runtime!.thread.getState().voice).toBeDefined();

  view.unmount();
  await act(async () => {});
  expect(disconnect).toHaveBeenCalledOnce();
});
