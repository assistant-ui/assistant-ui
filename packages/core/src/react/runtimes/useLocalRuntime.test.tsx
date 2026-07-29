// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
import type { ChatModelAdapter } from "../../runtime/utils/chat-model-adapter";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useLocalRuntime } from "./useLocalRuntime";

const chatModel: ChatModelAdapter = {
  run: async () => ({ content: [] }),
};

const makeCloud = () =>
  ({
    threads: {
      list: vi.fn().mockResolvedValue({ threads: [] }),
    },
  }) as unknown as AssistantCloud;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useLocalRuntime", () => {
  it("keeps the Cloud thread list loaded across unrelated rerenders", async () => {
    const firstCloud = makeCloud();
    const secondCloud = makeCloud();

    const App = ({
      cloud,
      label,
    }: {
      cloud: AssistantCloud;
      label: string;
    }) => {
      const runtime = useLocalRuntime(chatModel, { cloud });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div>{label}</div>
        </AssistantRuntimeProvider>
      );
    };

    const { rerender } = render(<App cloud={firstCloud} label="first" />);

    await waitFor(() => {
      expect(firstCloud.threads.list).toHaveBeenCalledOnce();
    });

    rerender(<App cloud={firstCloud} label="second" />);
    expect(firstCloud.threads.list).toHaveBeenCalledOnce();

    rerender(<App cloud={secondCloud} label="third" />);
    await waitFor(() => {
      expect(secondCloud.threads.list).toHaveBeenCalledOnce();
    });
    expect(firstCloud.threads.list).toHaveBeenCalledOnce();
  });

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
