// @vitest-environment jsdom

import type { FC, PropsWithChildren } from "react";
import { act, Suspense } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  useAuiState,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { VoiceSampleThread } from "./voice-sample-thread";
import { DocsRuntimeProvider } from "@/runtimes/docs";

const compilerStubs = vi.hoisted(() => ({
  humanTool: () => undefined,
  defineGenerativeComponents: () => ({}),
}));

vi.mock("@assistant-ui/react-generative-ui", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@assistant-ui/react-generative-ui")
  >()),
  defineGenerativeComponents: compilerStubs.defineGenerativeComponents,
}));
vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  humanTool: compilerStubs.humanTool,
}));

const EMPTY_MESSAGES: ThreadMessageLike[] = [];

const RuntimeProvider: FC<PropsWithChildren<{ isLoading: boolean }>> = ({
  isLoading,
  children,
}) => {
  const runtime = useExternalStoreRuntime({
    messages: EMPTY_MESSAGES,
    isLoading,
    convertMessage: (message) => message,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const App: FC<{ isLoading: boolean }> = ({ isLoading }) => (
  <RuntimeProvider isLoading={isLoading}>
    <VoiceSampleThread
      welcomeTitle="Voice Input Demo"
      welcomeSubtitle="Click the mic button to speak"
    />
  </RuntimeProvider>
);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it.each([
  { serverLoading: false, clientLoading: true },
  { serverLoading: true, clientLoading: false },
])(
  "keeps hydration stable when loading changes from $serverLoading to $clientLoading",
  async ({ serverLoading, clientLoading }) => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    const container = document.createElement("div");
    container.innerHTML = renderToString(<App isLoading={serverLoading} />);
    expect(container.querySelector(".aui-thread-welcome-root")).toBeNull();
    expect(
      container.querySelector(".aui-thread-welcome-suggestions"),
    ).toBeNull();
    expect(
      container.querySelector(".aui-thread-viewport-spacer"),
    ).not.toBeNull();

    const recoverableErrors: string[] = [];
    let root: Root;
    await act(async () => {
      root = hydrateRoot(container, <App isLoading={clientLoading} />, {
        onRecoverableError: (error) =>
          recoverableErrors.push(
            error instanceof Error ? error.message : String(error),
          ),
      });
    });

    expect(recoverableErrors).toEqual([]);
    expect(container.querySelector(".aui-thread-welcome-root") !== null).toBe(
      !clientLoading,
    );
    expect(
      container.querySelector(".aui-thread-welcome-suggestions") !== null,
    ).toBe(!clientLoading);

    await act(async () => root.render(<App isLoading={false} />));

    expect(container.querySelector(".aui-thread-welcome-root")).not.toBeNull();
    expect(
      container.querySelector(".aui-thread-welcome-suggestions"),
    ).not.toBeNull();

    await act(async () => root.unmount());
  },
);

it("hydrates the sample after the docs provider has settled a failed Cloud request", async () => {
  vi.stubEnv("NEXT_PUBLIC_ASSISTANT_BASE_URL", "https://docs-cloud.test");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({}, { status: 503 })),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(console, "error").mockImplementation(() => {});

  let isClient = false;
  let ready = false;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let loadFailed = false;
  const snapshots: { client: boolean; messages: number; loading: boolean }[] =
    [];

  function ObserveFailure() {
    loadFailed = useAuiState((s) => !!s.threads.loadError);
    return null;
  }

  function Sample() {
    const thread = useAuiState((s) => s.thread);
    snapshots.push({
      client: isClient,
      messages: thread.messages.length,
      loading: thread.isLoading,
    });
    return (
      <VoiceSampleThread
        welcomeTitle="Voice Input Demo"
        welcomeSubtitle="Click the mic button to speak"
      />
    );
  }

  function DeferredSample() {
    if (isClient && !ready) throw pending;
    return <Sample />;
  }

  function DocsApp() {
    return (
      <DocsRuntimeProvider devtools={false}>
        <ObserveFailure />
        <Suspense fallback={null}>
          <DeferredSample />
        </Suspense>
      </DocsRuntimeProvider>
    );
  }

  const container = document.createElement("div");
  container.innerHTML = renderToString(<DocsApp />);
  expect(snapshots[0]).toEqual({ client: false, messages: 0, loading: true });
  expect(container.querySelector(".aui-thread-welcome-root")).toBeNull();
  const recoverableErrors: unknown[] = [];
  let root: Root | undefined;
  try {
    isClient = true;
    await act(async () => {
      root = hydrateRoot(container, <DocsApp />, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });
    await waitFor(() => expect(loadFailed).toBe(true));
    await act(async () => {
      ready = true;
      release();
    });
    expect(snapshots.find((snapshot) => snapshot.client)).toEqual({
      client: true,
      messages: 0,
      loading: false,
    });
    expect(recoverableErrors).toEqual([]);
    expect(container.querySelector(".aui-thread-welcome-root")).not.toBeNull();
    expect(
      container.querySelector(".aui-thread-welcome-suggestions"),
    ).not.toBeNull();
  } finally {
    await act(async () => root?.unmount());
  }
});
