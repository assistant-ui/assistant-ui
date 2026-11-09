import { cleanup, render, screen, within } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  type ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { Thread } from "./thread.aui";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollTo ??= () => {};
});

afterEach(cleanup);

function RunStateThread({ error }: { error: ThreadMessageLike["status"] }) {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages: [
      { id: "u", role: "user", content: "hello" },
      { id: "a", role: "assistant", content: "Step one", status: error },
    ],
    convertMessage: (message) => message,
    onNew: async () => {},
    onReload: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread autoFocus={false} />
    </AssistantRuntimeProvider>
  );
}

describe("Thread run states", () => {
  it("shows an interrupted run as a warning with Resume", () => {
    render(
      <RunStateThread
        error={{
          type: "incomplete",
          reason: "error",
          error: { code: "run_stale", message: "Interrupted." },
        }}
      />,
    );
    const box = screen
      .getByText("Interrupted.")
      .closest<HTMLElement>(".aui-message-interrupted-root")!;
    expect(box).not.toBeNull();
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Resume" })
        .disabled,
    ).toBe(false);
    expect(document.querySelector(".aui-message-error-root")).toBeNull();
  });

  it("shows a run another tab drives as in progress with Refresh", () => {
    render(
      <RunStateThread
        error={{
          type: "incomplete",
          reason: "error",
          error: {
            code: "run_in_progress",
            message: "Running in another tab…",
          },
        }}
      />,
    );
    const box = screen
      .getByText("Running in another tab…")
      .closest<HTMLElement>(".aui-message-remote-run-root")!;
    expect(box.getAttribute("role")).toBe("status");
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Refresh" })
        .disabled,
    ).toBe(false);
    expect(screen.queryByRole("button", { name: "Resume" })).toBeNull();
    expect(document.querySelector(".aui-assistant-action-bar-root")).toBeNull();
  });

  it("keeps other errors in the error box", () => {
    render(
      <RunStateThread
        error={{ type: "incomplete", reason: "error", error: "Boom" }}
      />,
    );
    expect(
      screen.getByText("Boom").closest(".aui-message-error-root"),
    ).not.toBeNull();
    expect(document.querySelector(".aui-message-remote-run-root")).toBeNull();
    expect(document.querySelector(".aui-message-interrupted-root")).toBeNull();
  });
});
