import { cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  useLocalRuntime,
} from "@assistant-ui/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { Thread, type ThreadProps } from "./thread";

const adapter: ChatModelAdapter = {
  async *run() {},
};

function TestThread(props: ThreadProps) {
  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread {...props} />
    </AssistantRuntimeProvider>
  );
}

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe("Thread", () => {
  it("focuses the composer by default", async () => {
    render(<TestThread />);

    const composer = screen.getByRole("textbox");
    await waitFor(() => expect(document.activeElement).toBe(composer));
  });

  it("keeps the page focus when autoFocus is false", () => {
    const pageControl = document.body.appendChild(
      document.createElement("button"),
    );
    pageControl.focus();

    render(<TestThread autoFocus={false} />);

    expect(document.activeElement).toBe(pageControl);
  });
});
