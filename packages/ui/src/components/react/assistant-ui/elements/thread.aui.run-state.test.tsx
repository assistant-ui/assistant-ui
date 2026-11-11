import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  type ThreadMessageLike,
  useAui,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { setThreadReplyState } from "@assistant-ui/core/store/internal";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { useState } from "react";

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
  error,
  content = "Step one",
  onReload = async () => {},
}: {
  error: ThreadMessageLike["status"];
  content?: ThreadMessageLike["content"];
  onReload?: (parentId: string | null) => Promise<void>;
}) {
  const [messages, setMessages] = useState<readonly ThreadMessageLike[]>([
    { id: "u", role: "user", content: "hello" },
    { id: "a", role: "assistant", content, status: error },
  ]);
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    setMessages,
    convertMessage: (message) => message,
    onNew: async () => {},
    onReload,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread autoFocus={false} />
    </AssistantRuntimeProvider>
  );
}

function UnansweredThread({
  onReload,
  onThreadItemId,
}: {
  onReload: (parentId: string | null) => Promise<void>;
  onThreadItemId: (id: string) => void;
}) {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages: [{ id: "u", role: "user", content: "hello" }],
    convertMessage: (message) => message,
    onNew: async () => {},
    onReload,
  });
  const ReadId = () => {
    onThreadItemId(useAui().threadListItem.getState().id);
    return null;
  };
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ReadId />
      <Thread autoFocus={false} />
    </AssistantRuntimeProvider>
  );
}

describe("Thread run states", () => {
  it("shows a stale reply that stored content as an ordinary error, with Regenerate and no Resume", () => {
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
      .closest<HTMLElement>(".aui-message-error-root")!;
    expect(box.dataset.runState).toBeUndefined();
    expect(box.getAttribute("role")).toBe("alert");
    expect(within(box).queryByRole("button", { name: "Resume" })).toBeNull();
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Refresh" })
        .disabled,
    ).toBe(true);
    expect(
      document.querySelector(".aui-assistant-action-bar-root"),
    ).not.toBeNull();
  });

  it("resumes an empty stale assistant reply in place", async () => {
    const onReload = vi.fn(async (_parentId: string | null) => {});
    render(
      <RunStateThread
        content=""
        onReload={onReload}
        error={{
          type: "incomplete",
          reason: "error",
          error: { code: "run_stale", message: "Interrupted." },
        }}
      />,
    );
    const box = screen
      .getByText("Interrupted.")
      .closest<HTMLElement>(".aui-message-error-root")!;
    expect(box.dataset.runState).toBe("stale");
    expect(document.querySelector(".aui-thread-reply-status")).toBeNull();
    const resume = within(box).getByRole<HTMLButtonElement>("button", {
      name: "Resume",
    });
    expect(resume.disabled).toBe(false);
    fireEvent.click(resume);
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce());
    expect(onReload.mock.calls[0]![0]).toBe("u");
    expect(screen.queryByText("Interrupted.")).toBeNull();
  });

  it("shows a stored reply another tab drives as in progress with Refresh", () => {
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
      .closest<HTMLElement>(".aui-message-error-root")!;
    expect(box.dataset.runState).toBe("in-progress");
    expect(box.getAttribute("role")).toBe("status");
    expect(
      within(box).getByRole<HTMLButtonElement>("button", { name: "Refresh" })
        .disabled,
    ).toBe(false);
    expect(document.querySelector(".aui-assistant-action-bar-root")).toBeNull();
  });

  it("keeps other errors in the error box", () => {
    render(
      <RunStateThread
        error={{ type: "incomplete", reason: "error", error: "Boom" }}
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
  });

  it("shows a thread whose reply another tab is generating, with no Resume", () => {
    let id = "";
    render(
      <UnansweredThread
        onReload={async () => {}}
        onThreadItemId={(next) => {
          id = next;
        }}
      />,
    );
    expect(document.querySelector(".aui-thread-reply-status")).toBeNull();
    act(() => setThreadReplyState(id, "in-progress"));
    const bar = screen
      .getByText("Generating in another tab…")
      .closest<HTMLElement>(".aui-thread-reply-status")!;
    expect(bar.getAttribute("role")).toBe("status");
    expect(screen.queryByRole("button", { name: "Resume" })).toBeNull();
    act(() => setThreadReplyState(id, undefined));
  });

  it("shows an interrupted thread as a warning at its end; Resume runs from the user's message", async () => {
    let id = "";
    const onReload = vi.fn(async (_parentId: string | null) => {});
    render(
      <UnansweredThread
        onReload={onReload}
        onThreadItemId={(next) => {
          id = next;
        }}
      />,
    );
    act(() => setThreadReplyState(id, "interrupted"));
    const bar = screen
      .getByText("This response was interrupted before it finished.")
      .closest<HTMLElement>(".aui-thread-reply-status")!;
    expect(bar.getAttribute("role")).toBe("alert");
    const resume = within(bar).getByRole<HTMLButtonElement>("button", {
      name: "Resume",
    });
    expect(resume.disabled).toBe(false);
    fireEvent.click(resume);
    await waitFor(() => expect(onReload).toHaveBeenCalled());
    expect(onReload.mock.calls[0]![0]).toBe("u");
    act(() => setThreadReplyState(id, undefined));
  });
});
