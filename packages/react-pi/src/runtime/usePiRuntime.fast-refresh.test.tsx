// @vitest-environment jsdom

import { Activity, act, type ReactNode, version } from "react";
import type { Root } from "react-dom/client";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import type { PiClient } from "../types";

type Family = { current: unknown };
type RendererInternals = {
  setRefreshHandler: (resolve: (type: unknown) => Family | undefined) => void;
  scheduleRefresh: (
    root: unknown,
    update: { staleFamilies: Set<Family>; updatedFamilies: Set<Family> },
  ) => void;
};

const { rendererState, fiberRoots } = vi.hoisted(() => {
  const rendererState = { current: undefined as RendererInternals | undefined };
  const fiberRoots = new Set<unknown>();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("__REACT_DEVTOOLS_GLOBAL_HOOK__", {
    supportsFiber: true,
    inject: (internals: RendererInternals) => {
      rendererState.current = internals;
      return 1;
    },
    onScheduleFiberRoot: () => {},
    onCommitFiberRoot: (_id: number, root: unknown) => fiberRoots.add(root),
    onCommitFiberUnmount: () => {},
  });
  return { rendererState, fiberRoots };
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

const mocks = vi.hoisted(() => ({
  adapters: [] as unknown[],
  reloads: 0,
  controllers: [] as Array<{
    client: unknown;
    connect: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }>,
  state: undefined as unknown,
  repository: undefined as unknown,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAui: () => ({ threadListItem: { initialize: vi.fn() } }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({
      threadListItem: { id: "t1", remoteId: "t1", externalId: "t1" },
      threads: { mainThreadId: "t1" },
    }),
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

vi.mock("./ThreadController", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./ThreadController")>()),
  PiThreadController: class {
    client: unknown;
    connect = vi.fn(() => this.disconnect);
    disconnect = vi.fn();
    dispose = vi.fn();
    load = vi.fn().mockResolvedValue(undefined);
    constructor(client: unknown) {
      this.client = client;
      mocks.controllers.push(this);
    }
    getState = () => mocks.state;
    getStateSnapshot = () => mocks.state;
    getMessageRepository = () => mocks.repository;
    subscribe = () => () => {};
    subscribeMetadata = () => () => {};
    subscribeMessages = () => () => {};
  },
}));

import { ExportedMessageRepository } from "@assistant-ui/react";
import { createPiThreadState } from "./threadState";
import { usePiRuntime } from "./usePiRuntime";

const onReact18 = version.startsWith("18.");

mocks.state = { ...createPiThreadState("t1"), runStatus: "running" };
mocks.repository = ExportedMessageRepository.fromArray([]);

const refresh = async (Before: unknown, After: unknown) => {
  const family: Family = { current: After };
  rendererState.current!.setRefreshHandler((type) =>
    type === Before || type === After ? family : undefined,
  );
  await act(async () => {
    for (const root of fiberRoots) {
      rendererState.current!.scheduleRefresh(root, {
        staleFamilies: new Set(),
        updatedFamilies: new Set([family]),
      });
    }
  });
  await act(async () => {});
};

afterEach(() => {
  for (const root of roots) act(() => root.unmount());
  roots.clear();
  mocks.adapters.length = 0;
  mocks.controllers.length = 0;
  mocks.reloads = 0;
  fiberRoots.clear();
});
afterAll(() => vi.unstubAllGlobals());

const listThreadsA = vi.fn().mockResolvedValue([]);
const listThreadsB = vi.fn().mockResolvedValue([]);
const clientA = { listThreads: listThreadsA } as unknown as PiClient;
const clientB = { listThreads: listThreadsB } as unknown as PiClient;

it("keeps the registry, thread list, and live controller connection through Fast Refresh", async () => {
  const Before = () => {
    usePiRuntime({
      client: clientA,
      workspacePath: "/one",
      includeArchived: true,
    });
    return null;
  };
  const After = () => {
    usePiRuntime({
      client: clientA,
      workspacePath: "/one",
      includeArchived: true,
    });
    return null;
  };
  const view = render(<Before />);
  const controller = mocks.controllers[0]!;
  const adapter = mocks.adapters[0];
  expect(controller.connect).toHaveBeenCalledOnce();
  expect(controller.load).toHaveBeenCalledOnce();

  await refresh(Before, After);

  expect(mocks.controllers).toHaveLength(1);
  expect(mocks.adapters.at(-1)).toBe(adapter);
  expect(mocks.reloads).toBe(1);
  expect(controller.connect).toHaveBeenCalledOnce();
  expect(controller.load).toHaveBeenCalledOnce();
  expect(controller.disconnect).not.toHaveBeenCalled();
  expect(controller.dispose).not.toHaveBeenCalled();

  view.unmount();
  await act(async () => {});
  expect(controller.disconnect).toHaveBeenCalledOnce();
  expect(controller.dispose).toHaveBeenCalledOnce();
});

it("replaces only the thread list when its scope changes and replaces the registry for a new client", async () => {
  const App = ({
    client,
    workspacePath,
    includeArchived,
  }: {
    client: PiClient;
    workspacePath: string;
    includeArchived: boolean;
  }) => {
    usePiRuntime({ client, workspacePath, includeArchived });
    return null;
  };
  const view = render(
    <App client={clientA} workspacePath="/one" includeArchived={false} />,
  );
  const controller = mocks.controllers[0]!;
  const firstAdapter = mocks.adapters.at(-1);
  const list = () =>
    (mocks.adapters.at(-1) as { list: () => Promise<unknown> }).list();

  await list();
  expect(listThreadsA).toHaveBeenLastCalledWith({
    workspacePath: "/one",
    includeArchived: false,
  });

  view.rerender(
    <App client={clientA} workspacePath="/two" includeArchived={false} />,
  );
  await act(async () => {});
  expect(mocks.adapters.at(-1)).not.toBe(firstAdapter);
  expect(mocks.controllers).toHaveLength(1);
  expect(controller.dispose).not.toHaveBeenCalled();
  await list();
  expect(listThreadsA).toHaveBeenLastCalledWith({
    workspacePath: "/two",
    includeArchived: false,
  });

  const secondAdapter = mocks.adapters.at(-1);
  view.rerender(<App client={clientA} workspacePath="/two" includeArchived />);
  await act(async () => {});
  expect(mocks.adapters.at(-1)).not.toBe(secondAdapter);
  expect(mocks.controllers).toHaveLength(1);
  await list();
  expect(listThreadsA).toHaveBeenLastCalledWith({
    workspacePath: "/two",
    includeArchived: true,
  });

  view.rerender(<App client={clientB} workspacePath="/two" includeArchived />);
  await act(async () => {});
  expect(mocks.controllers[1]!.client).toBe(clientB);
  expect(mocks.controllers[1]!.load).toHaveBeenCalledOnce();
  expect(controller.dispose).toHaveBeenCalledOnce();
  expect(controller.disconnect).toHaveBeenCalledOnce();
  await list();
  expect(listThreadsB).toHaveBeenLastCalledWith({
    workspacePath: "/two",
    includeArchived: true,
  });
});

// Activity is React 19 only.
it.skipIf(onReact18)(
  "disconnects the controller and disposes the registry when Activity hides it",
  async () => {
    const Host = () => {
      usePiRuntime({ client: clientA });
      return null;
    };
    const App = ({ mode }: { mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <Host />
      </Activity>
    );
    const view = render(<App mode="visible" />);
    const controller = mocks.controllers[0]!;

    view.rerender(<App mode="hidden" />);
    await act(async () => {});
    expect(controller.disconnect).toHaveBeenCalledOnce();
    expect(controller.dispose).toHaveBeenCalledOnce();
  },
);
