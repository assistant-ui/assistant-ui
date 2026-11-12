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

function RunStateThread({ messages }: { messages: ThreadMessageLike[] }) {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    convertMessage: (message) => message,
    onNew: async () => {},
    onReload: async () => {},
    setMessages: () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread autoFocus={false} />
    </AssistantRuntimeProvider>
  );
}

const replyWith = (
  content: string,
  status: ThreadMessageLike["status"],
): ThreadMessageLike[] => [
  { id: "u", role: "user", content: "hello" },
  { id: "a", role: "assistant", content, status },
];

const stale = {
  type: "incomplete",
  reason: "error",
  error: { code: "run_stale", message: "Interrupted." },
} as const;

const regenerate = () => {
  const bar = document.querySelector<HTMLElement>(
    ".aui-assistant-action-bar-root",
  );
  return bar
    ? within(bar).queryByRole<HTMLButtonElement>("button", { name: "Refresh" })
    : null;
};

const errorBox = (text: string) =>
  screen.getByText(text).closest<HTMLElement>(".aui-message-error-root")!;

describe("Thread run states", () => {
  it("shows an interrupted reply that wrote nothing as a warning with Resume", () => {
    render(<RunStateThread messages={replyWith("", stale)} />);
    const box = errorBox("Interrupted.");
    expect(box.dataset.runState).toBe("stale");
    expect(box.getAttribute("role")).toBe("alert");
    const resume = within(box).getByRole<HTMLButtonElement>("button", {
      name: "Resume",
    });
    expect(resume.disabled).toBe(false);
    expect(resume.checkVisibility?.() ?? true).toBe(true);
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Refresh" })
        .disabled,
    ).toBe(true);
  });

  it("shows an interrupted reply with content as a regular error with Regenerate", () => {
    render(<RunStateThread messages={replyWith("Step one", stale)} />);
    const box = errorBox("Interrupted.");
    expect(box.dataset.runState).toBeUndefined();
    expect(box.getAttribute("role")).toBe("alert");
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Resume" })
        .disabled,
    ).toBe(true);
    expect(regenerate()?.disabled).toBe(false);
  });

  it("shows a run another tab drives as in progress with Refresh, and no Regenerate or Resume", () => {
    render(
      <RunStateThread
        messages={replyWith("Step one", {
          type: "incomplete",
          reason: "error",
          error: {
            code: "run_in_progress",
            message: "Running in another tab…",
          },
        })}
      />,
    );
    const box = errorBox("Running in another tab…");
    expect(box.dataset.runState).toBe("in-progress");
    expect(box.getAttribute("role")).toBe("status");
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Refresh" })
        .disabled,
    ).toBe(false);
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Resume" })
        .disabled,
    ).toBe(true);
    expect(document.querySelector(".aui-assistant-action-bar-root")).toBeNull();
  });

  it("keeps other errors in the error box", () => {
    render(
      <RunStateThread
        messages={replyWith("Step one", {
          type: "incomplete",
          reason: "error",
          error: "Boom",
        })}
      />,
    );
    const box = errorBox("Boom");
    expect(box.dataset.runState).toBeUndefined();
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Resume" })
        .disabled,
    ).toBe(true);
    expect(regenerate()?.disabled).toBe(false);
  });
});
