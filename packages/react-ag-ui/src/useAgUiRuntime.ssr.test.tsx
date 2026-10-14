import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import type { HttpAgent } from "@ag-ui/client";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { useAgUiRuntime } from "./useAgUiRuntime";

const agent = {
  runAgent: vi.fn(),
  abortRun: vi.fn(),
} as unknown as HttpAgent;

const App = () => {
  const runtime = useAgUiRuntime({ agent });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <span>chat</span>
    </AssistantRuntimeProvider>
  );
};

afterEach(() => {
  vi.restoreAllMocks();
});

it("does not warn about layout effects during server rendering", () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});

  renderToString(<App />);

  expect(errors.mock.calls.flat().join(" ")).not.toMatch(
    /useLayoutEffect does nothing on the server/,
  );
});
