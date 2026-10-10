// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { LOCAL_THREAD_ID_PREFIX } from "../../runtimes/remote-thread-list/remote-thread-state";
import {
  makeAdapter,
  actSettled,
} from "../../tests/remote-thread-list-test-helpers";
import type { ThreadMessage } from "../../types/message";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const adapter = makeAdapter();
const EMPTY_MESSAGES: readonly ThreadMessage[] = [];

const useThreadRuntime = () =>
  useExternalStoreRuntime<ThreadMessage>({
    messages: EMPTY_MESSAGES,
    onNew: async () => {},
  });

const App = ({
  onRuntime,
}: {
  onRuntime?: (runtime: AssistantRuntime) => void;
}) => {
  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: useThreadRuntime,
  });
  onRuntime?.(runtime);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <p>chat</p>
    </AssistantRuntimeProvider>
  );
};

const renderOnServer = (node: ReactNode) => {
  vi.stubGlobal("document", undefined);
  try {
    return renderToString(node);
  } finally {
    vi.unstubAllGlobals();
  }
};

const localIdPattern = new RegExp(`^${LOCAL_THREAD_ID_PREFIX}`);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("prerenders a remote thread list without reading Math.random", () => {
  const random = vi.spyOn(Math, "random");
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  let serverRuntime: AssistantRuntime | undefined;

  renderOnServer(
    <App
      onRuntime={(value) => {
        serverRuntime = value;
      }}
    />,
  );

  expect(random).not.toHaveBeenCalled();
  expect(errors.mock.calls.flat().join(" ")).not.toMatch(
    /useLayoutEffect does nothing on the server/,
  );
  expect(serverRuntime!.threads.getState().mainThreadId).toMatch(
    localIdPattern,
  );
});

it("gives two server rendered runtimes distinct initial ids", () => {
  const ids: string[] = [];
  const collect = (value: AssistantRuntime) => {
    ids.push(value.threads.getState().mainThreadId);
  };

  renderOnServer(
    <>
      <App onRuntime={collect} />
      <App onRuntime={collect} />
    </>,
  );

  expect(ids).toHaveLength(2);
  expect(ids[0]).toMatch(localIdPattern);
  expect(ids[1]).toMatch(localIdPattern);
  expect(ids[0]).not.toBe(ids[1]);
});

it("hydrates without a mismatch and names the client's first thread randomly", async () => {
  let serverId: string | undefined;
  const container = document.createElement("div");
  container.innerHTML = renderOnServer(
    <App
      onRuntime={(value) => {
        serverId = value.threads.getState().mainThreadId;
      }}
    />,
  );
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const random = vi.spyOn(Math, "random");
  let clientRuntime: AssistantRuntime | undefined;
  let root: ReturnType<typeof hydrateRoot>;

  await act(async () => {
    root = hydrateRoot(
      container,
      <App
        onRuntime={(value) => {
          clientRuntime = value;
        }}
      />,
    );
  });

  const clientId = clientRuntime!.threads.getState().mainThreadId;
  expect(errors).not.toHaveBeenCalled();
  expect(random).toHaveBeenCalled();
  expect(clientId).toMatch(localIdPattern);
  expect(clientId).not.toBe(serverId);

  await act(async () => root.unmount());
});

it("generates a fresh id after switching to a new thread", async () => {
  let runtime: AssistantRuntime | undefined;
  const view = render(
    <App
      onRuntime={(value) => {
        runtime = value;
      }}
    />,
  );
  const initialId = runtime!.threads.getState().mainThreadId;

  await actSettled(() => runtime!.threads.mainItem.initialize());
  const random = vi.spyOn(Math, "random");
  await actSettled(() => runtime!.threads.switchToNewThread());

  expect(random).toHaveBeenCalled();
  expect(runtime!.threads.getState().mainThreadId).not.toBe(initialId);
  expect(runtime!.threads.getState().mainThreadId).toMatch(localIdPattern);
  view.unmount();
});
