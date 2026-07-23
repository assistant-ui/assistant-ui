// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatModelAdapter } from "../../runtime/utils/chat-model-adapter";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useLocalRuntime } from "./useLocalRuntime";

const chatModel: ChatModelAdapter = {
  run: async () => ({ content: [] }),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useLocalRuntime", () => {
  it("handles rejected history loads", async () => {
    const error = new Error("history unavailable");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const history = {
      load: vi.fn().mockRejectedValue(error),
      append: vi.fn().mockResolvedValue(undefined),
    };

    const App = () => {
      const runtime = useLocalRuntime(chatModel, { adapters: { history } });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };

    const renderApp = () => (
      <StrictMode>
        <App />
      </StrictMode>
    );
    const { rerender } = render(renderApp());

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] local thread history load failed:",
        error,
      );
    });

    rerender(renderApp());
    expect(history.load).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});
