// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { FC } from "react";
import { expect, it, vi } from "vitest";
import type { ChatModelAdapter } from "@assistant-ui/core";
import { useLocalRuntime } from "@assistant-ui/core/react";
import { DevToolsHooks } from "../devtools/DevToolsHooks";
import { AssistantRuntimeProvider } from "./AssistantRuntimeProvider";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

it("registers the runtime with devtools when process is absent", () => {
  const apiCountBefore = DevToolsHooks.getApis().size;

  const App: FC = () => {
    const runtime = useLocalRuntime(noOpAdapter);
    return <AssistantRuntimeProvider runtime={runtime} />;
  };

  let unmount = () => {};
  vi.stubGlobal("process", undefined);
  try {
    ({ unmount } = render(<App />));
    expect(DevToolsHooks.getApis().size).toBe(apiCountBefore + 1);
  } finally {
    vi.unstubAllGlobals();
    unmount();
  }
});
