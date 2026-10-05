// @vitest-environment jsdom

import { Activity, act, type ReactNode, version } from "react";
import type { Root } from "react-dom/client";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { OpencodeClient } from "@opencode-ai/sdk/v2/client";

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
const { createRoot } = await import("react-dom/client");
const roots = new Set<Root>();
const render = (element: ReactNode) => {
  const root = createRoot(document.createElement("div"));
  roots.add(root);
  act(() => root.render(element));
  return {
    rerender: (next: ReactNode) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      roots.delete(root);
    },
  };
};
const cleanup = () => {
  for (const root of roots) act(() => root.unmount());
  roots.clear();
};

const mocks = vi.hoisted(() => ({
  adapters: [] as unknown[],
  reloads: 0,
  controllers: [] as Array<{
    client: unknown;
    load: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }>,
  sources: [] as Array<{
    subscribe: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }>,
  state: undefined as unknown,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAui: () => ({ threadListItem: { initialize: vi.fn() } }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({ threadListItem: { remoteId: "session-1" } }),
  useCloudThreadListAdapter: () => ({}),
  useExternalStoreRuntime: () => ({}),
  useRemoteThreadListRuntime: (options: {
    adapter: unknown;
    runtimeHook: () => unknown;
  }) => {
    if (mocks.adapters.at(-1) !== options.adapter) mocks.reloads++;
    mocks.adapters.push(options.adapter);
    return options.runtimeHook();
  },
}));

vi.mock("./useOpenCodeControllerState", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useOpenCodeControllerState")>()),
  useOpenCodeControllerState: () => mocks.state,
}));

vi.mock("./OpenCodeEventSource", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./OpenCodeEventSource")>()),
  OpenCodeEventSource: class {
    dispose = vi.fn();
    subscribe = vi.fn(() => () => {});
    constructor() {
      mocks.sources.push(this);
    }
  },
}));

vi.mock("./OpenCodeThreadController", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./OpenCodeThreadController")>()),
  OpenCodeThreadController: class {
    client: unknown;
    dispose = vi.fn();
    load = vi.fn().mockResolvedValue(undefined);
    constructor(client: unknown, getSource: () => { subscribe: () => void }) {
      this.client = client;
      getSource().subscribe();
      mocks.controllers.push(this);
    }
  },
}));

import { EMPTY_OPENCODE_THREAD_STATE } from "./openCodeThreadState";
import { useOpenCodeRuntime } from "./useOpenCodeRuntime";

const onReact18 = version.startsWith("18.");

// Fails on React 18: TypeError: useEffectEvent is not a function (useOpenCodeRuntime imports useEffectEvent from react, which React 18 does not export). Shipped React 18 incompatibility, so on React 18 these tests assert that error, and fail once it's fixed.
const itBrokenOnReact18 = (
  name: string,
  fn: () => void | Promise<void>,
  timeout?: number,
) =>
  onReact18
    ? it(
        name,
        () =>
          expect(Promise.resolve().then(fn)).rejects.toThrow(
            /useEffectEvent\)? is not a function/,
          ),
        timeout,
      )
    : it(name, fn, timeout);

mocks.state = EMPTY_OPENCODE_THREAD_STATE;

const refresh = async (Before: unknown, After: unknown) => {
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
};

afterEach(() => {
  cleanup();
  mocks.adapters.length = 0;
  mocks.controllers.length = 0;
  mocks.sources.length = 0;
  mocks.reloads = 0;
  fiberRoots.clear();
});
afterAll(() => vi.unstubAllGlobals());

itBrokenOnReact18(
  "keeps the client, registry, thread list, and event source through Fast Refresh",
  async () => {
    const Before = () => {
      useOpenCodeRuntime({ baseUrl: "http://localhost:4096" });
      return null;
    };
    const After = () => {
      useOpenCodeRuntime({ baseUrl: "http://localhost:4096" });
      return null;
    };
    const view = render(<Before />);
    const client = mocks.controllers[0]!.client;
    const controller = mocks.controllers[0]!;
    expect(controller.load).toHaveBeenCalledOnce();
    const source = mocks.sources[0]!;
    const adapter = mocks.adapters[0];

    await refresh(Before, After);

    expect(mocks.controllers).toHaveLength(1);
    expect(mocks.controllers[0]!.client).toBe(client);
    expect(mocks.sources).toHaveLength(1);
    expect(source.subscribe).toHaveBeenCalledOnce();
    expect(mocks.adapters.at(-1)).toBe(adapter);
    expect(mocks.reloads).toBe(1);
    expect(controller.dispose).not.toHaveBeenCalled();
    expect(controller.load).toHaveBeenCalledOnce();
    expect(source.dispose).not.toHaveBeenCalled();

    view.unmount();
    await act(async () => {});
    expect(controller.dispose).toHaveBeenCalledOnce();
    expect(source.dispose).toHaveBeenCalledOnce();
  },
);

itBrokenOnReact18(
  "replaces the client, registry, and thread list when baseUrl changes",
  async () => {
    const App = ({ baseUrl }: { baseUrl: string }) => {
      useOpenCodeRuntime({ baseUrl });
      return null;
    };
    const view = render(<App baseUrl="http://localhost:4096" />);
    const oldController = mocks.controllers[0]!;
    const oldSource = mocks.sources[0]!;
    const oldAdapter = mocks.adapters.at(-1);

    view.rerender(<App baseUrl="http://localhost:4097" />);
    await act(async () => {});

    expect(mocks.controllers[1]!.client).not.toBe(oldController.client);
    expect(mocks.controllers[1]!.load).toHaveBeenCalledOnce();
    expect(mocks.adapters.at(-1)).not.toBe(oldAdapter);
    expect(mocks.reloads).toBe(2);
    expect(oldController.dispose).toHaveBeenCalledOnce();
    expect(oldSource.dispose).toHaveBeenCalledOnce();
  },
);

// Activity is React 19 only.
it.skipIf(onReact18)(
  "replaces the registry when the explicit client changes and disposes on Activity hide",
  async () => {
    const clientA = {} as OpencodeClient;
    const clientB = {} as OpencodeClient;
    const App = ({
      client,
      mode,
    }: {
      client: OpencodeClient;
      mode: "visible" | "hidden";
    }) => (
      <Activity mode={mode}>
        <Host client={client} />
      </Activity>
    );
    const Host = ({ client }: { client: OpencodeClient }) => {
      useOpenCodeRuntime({ client });
      return null;
    };
    const view = render(<App client={clientA} mode="visible" />);
    const oldController = mocks.controllers[0]!;

    view.rerender(<App client={clientB} mode="visible" />);
    await act(async () => {});
    expect(mocks.controllers[1]!.client).toBe(clientB);
    expect(oldController.dispose).toHaveBeenCalledOnce();

    view.rerender(<App client={clientB} mode="hidden" />);
    await act(async () => {});
    expect(mocks.controllers[1]!.dispose).toHaveBeenCalledOnce();
  },
);
