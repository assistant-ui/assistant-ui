// @vitest-environment jsdom

import type { FC, PropsWithChildren } from "react";
import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { VoiceSampleThread } from "./voice-sample-thread";

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
});

it("keeps the welcome and suggestions stable while the thread loads during hydration", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

  const container = document.createElement("div");
  container.innerHTML = renderToString(<App isLoading={false} />);
  expect(container.querySelector(".aui-thread-welcome-root")).not.toBeNull();
  expect(
    container.querySelector(".aui-thread-welcome-suggestions"),
  ).not.toBeNull();
  expect(container.querySelector(".aui-thread-viewport-spacer")).not.toBeNull();

  const recoverableErrors: string[] = [];
  let root: Root;
  await act(async () => {
    root = hydrateRoot(container, <App isLoading={true} />, {
      onRecoverableError: (error) =>
        recoverableErrors.push(
          error instanceof Error ? error.message : String(error),
        ),
    });
  });

  expect(recoverableErrors).toEqual([]);
  expect(container.querySelector(".aui-thread-welcome-root")).toBeNull();
  expect(container.querySelector(".aui-thread-welcome-suggestions")).toBeNull();

  await act(async () => root.render(<App isLoading={false} />));

  expect(container.querySelector(".aui-thread-welcome-root")).not.toBeNull();
  expect(
    container.querySelector(".aui-thread-welcome-suggestions"),
  ).not.toBeNull();

  await act(async () => root.unmount());
});
