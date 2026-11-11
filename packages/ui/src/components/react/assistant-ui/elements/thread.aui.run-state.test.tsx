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

function RunStateThread({
  messages,
  canResume = false,
}: {
  messages: ThreadMessageLike[];
  canResume?: boolean;
}) {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    convertMessage: (message) => message,
    onNew: async () => {},
    onReload: async () => {},
    canResume,
    onResume: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread autoFocus={false} />
    </AssistantRuntimeProvider>
  );
}

const replyWith = (
  status: ThreadMessageLike["status"],
): ThreadMessageLike[] => [
  { id: "u", role: "user", content: "hello" },
  { id: "a", role: "assistant", content: "Step one", status },
];

const regenerate = () => {
  const bar = document.querySelector<HTMLElement>(
    ".aui-assistant-action-bar-root",
  );
  return bar
    ? within(bar).queryByRole<HTMLButtonElement>("button", { name: "Refresh" })
    : null;
};

describe("Thread run states", () => {
  it("shows an interrupted reply with content as an error with Regenerate", () => {
    render(
      <RunStateThread
        messages={replyWith({
          type: "incomplete",
          reason: "error",
          error: { code: "run_stale", message: "Interrupted." },
        })}
      />,
    );
    const box = screen
      .getByText("Interrupted.")
      .closest<HTMLElement>(".aui-message-error-root")!;
    expect(box.dataset.runState).toBe("stale");
    expect(box.getAttribute("role")).toBe("alert");
    expect(within(box).queryByRole("button", { name: "Resume" })).toBeNull();
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Refresh" })
        .disabled,
    ).toBe(true);
    expect(regenerate()?.disabled).toBe(false);
    expect(
      screen.queryByRole("button", { name: "Resume generating" }),
    ).toBeNull();
  });

  it("shows a run another tab drives as in progress with Refresh and no Regenerate", () => {
    render(
      <RunStateThread
        messages={replyWith({
          type: "incomplete",
          reason: "error",
          error: {
            code: "run_in_progress",
            message: "Running in another tab…",
          },
        })}
      />,
    );
    const box = screen
      .getByText("Running in another tab…")
      .closest<HTMLElement>(".aui-message-error-root")!;
    expect(box.dataset.runState).toBe("in-progress");
    expect(box.getAttribute("role")).toBe("status");
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Refresh" })
        .disabled,
    ).toBe(false);
    expect(document.querySelector(".aui-assistant-action-bar-root")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Resume generating" }),
    ).toBeNull();
  });

  it("shows an interrupted reply that had no content as a warning with Resume", () => {
    render(
      <RunStateThread
        messages={[{ id: "u", role: "user", content: "hello" }]}
        canResume
      />,
    );
    const box = screen
      .getByText("This response was interrupted before it finished.")
      .closest<HTMLElement>(".aui-interrupted-reply-root")!;
    expect(box.getAttribute("role")).toBe("alert");
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Resume" })
        .disabled,
    ).toBe(false);
    expect(
      screen.queryByRole("button", { name: "Resume generating" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Send message" })).toBeTruthy();
    expect(document.querySelector(".aui-message-error-root")).toBeNull();
  });

  it("keeps the composer's Resume for a resumable run that ends on an assistant message", () => {
    render(<RunStateThread messages={replyWith(undefined)} canResume />);
    expect(document.querySelector(".aui-interrupted-reply-root")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Resume generating" }),
    ).toBeTruthy();
  });

  it("keeps other errors in the error box", () => {
    render(
      <RunStateThread
        messages={replyWith({
          type: "incomplete",
          reason: "error",
          error: "Boom",
        })}
      />,
    );
    const box = screen
      .getByText("Boom")
      .closest<HTMLElement>(".aui-message-error-root")!;
    expect(box.dataset.runState).toBeUndefined();
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Refresh" })
        .disabled,
    ).toBe(true);
    expect(regenerate()?.disabled).toBe(false);
  });
});
