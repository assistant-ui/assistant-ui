// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  state: {
    mainThreadId: "one",
    threadIds: ["one", "two"],
    threadItems: [
      {
        id: "one",
        title: "First thread",
        status: "regular",
        custom: {} as Record<string, unknown>,
        lastMessageAt: undefined as Date | undefined,
      },
      {
        id: "two",
        title: "Second thread",
        status: "regular",
        custom: {} as Record<string, unknown>,
        lastMessageAt: undefined as Date | undefined,
      },
    ],
  },
  switchToThread: vi.fn(),
  switchToNewThread: vi.fn(),
  rename: vi.fn(),
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAui: () => ({
    threads: {
      getState: () => mocks.state,
      switchToThread: mocks.switchToThread,
      switchToNewThread: mocks.switchToNewThread,
      item: () => ({ rename: mocks.rename }),
    },
  }),
  useAuiState: (
    selector: (state: { threads: typeof mocks.state }) => unknown,
  ) => selector({ threads: mocks.state }),
}));
vi.mock("./thread", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./thread")>()),
  Thread: () => <textarea aria-label="Message" data-composer-input />,
}));
vi.mock("./sidebar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sidebar")>()),
  Sidebar: () => <button type="button">Sidebar thread</button>,
}));
vi.mock("./commands", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./commands")>()),
  CommandInstructions: () => null,
}));
vi.mock("./memory", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./memory")>()),
  MemoryView: () => <p>Memory</p>,
}));

import { DemoShell } from "./shell";

afterEach(cleanup);

const create = () => {
  const onViewChange = vi.fn();
  render(
    <DemoShell
      view="thread"
      onViewChange={onViewChange}
      sidebarCollapsed={false}
      onSidebarCollapsedChange={vi.fn()}
    />,
  );
  return { onViewChange };
};

describe("demo thread controls", () => {
  it.each([false, true])(
    "focuses the composer with Alt+Shift+C (mobile sidebar: %s)",
    async (mobile) => {
      const { onViewChange } = create();
      const openButton = screen.getByRole("button", { name: "Open threads" });
      openButton.focus();
      let target: HTMLElement = openButton;
      if (mobile) {
        fireEvent.click(openButton);
        target = await screen.findByRole("dialog", { name: "Threads" });
        await waitFor(() =>
          expect(target.contains(document.activeElement)).toBe(true),
        );
      }
      fireEvent.keyDown(target, {
        key: "Ç",
        code: "KeyC",
        altKey: true,
        shiftKey: true,
      });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(onViewChange).toHaveBeenCalledWith("thread");
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole("textbox", { name: "Message" }),
        ),
      );

      openButton.focus();
      fireEvent.click(openButton);
      const dialog = await screen.findByRole("dialog", { name: "Threads" });
      fireEvent.keyDown(dialog, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(openButton));
    },
  );

  it.each(["pinned", "activity"])(
    "navigates in the sidebar's %s order",
    async (order) => {
      const first = mocks.state.threadItems[0]!;
      const second = mocks.state.threadItems[1]!;
      if (order === "pinned") second.custom = { pinned: "true" };
      else {
        first.lastMessageAt = new Date("2020-01-01");
        second.lastMessageAt = new Date("2020-01-02");
      }
      try {
        create();
        fireEvent.keyDown(screen.getByRole("textbox"), {
          key: "ArrowUp",
          altKey: true,
        });
        await waitFor(() =>
          expect(mocks.switchToThread).toHaveBeenCalledWith("two"),
        );
      } finally {
        second.custom = {};
        first.lastMessageAt = undefined;
        second.lastMessageAt = undefined;
      }
    },
  );

  it("switches to the adjacent thread from the composer", async () => {
    const { onViewChange } = create();
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "ArrowDown",
      altKey: true,
    });
    await waitFor(() =>
      expect(mocks.switchToThread).toHaveBeenCalledWith("two"),
    );
    expect(onViewChange).toHaveBeenCalledWith("thread");
  });

  it("keeps the rename input focused after choosing the menu action", async () => {
    create();
    fireEvent.click(screen.getByRole("button", { name: "Demo options" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /Rename thread/ }),
    );
    const input = await screen.findByRole("textbox", { name: "Rename thread" });
    await waitFor(() => expect(document.activeElement).toBe(input));
    fireEvent.change(input, { target: { value: "Updated title" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() =>
      expect(mocks.rename).toHaveBeenCalledWith("Updated title"),
    );
  });

  it("handles new-thread shortcuts from the mobile sidebar portal", async () => {
    create();
    fireEvent.click(screen.getByRole("button", { name: "Open threads" }));
    const dialog = await screen.findByRole("dialog", { name: "Threads" });
    fireEvent.keyDown(dialog, {
      key: "Ø",
      code: "KeyO",
      altKey: true,
      shiftKey: true,
    });
    await waitFor(() => expect(mocks.switchToNewThread).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it.each(["R", "‰"])(
    "focuses the rename editor after closing the mobile sidebar with key %s",
    async (key) => {
      create();
      fireEvent.click(screen.getByRole("button", { name: "Open threads" }));
      const dialog = await screen.findByRole("dialog", { name: "Threads" });
      fireEvent.keyDown(dialog, {
        key,
        code: "KeyR",
        altKey: true,
        shiftKey: true,
      });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      const input = await screen.findByRole("textbox", {
        name: "Rename thread",
      });
      await waitFor(() => expect(document.activeElement).toBe(input));
      fireEvent.change(input, { target: { value: "Mobile title" } });
      fireEvent.submit(input.closest("form")!);
      await waitFor(() =>
        expect(mocks.rename).toHaveBeenCalledWith("Mobile title"),
      );
    },
  );

  it("restores normal sidebar focus after a mobile rename is canceled", async () => {
    create();
    const openButton = screen.getByRole("button", { name: "Open threads" });
    fireEvent.click(openButton);
    const dialog = await screen.findByRole("dialog", { name: "Threads" });
    fireEvent.keyDown(dialog, {
      key: "‰",
      code: "KeyR",
      altKey: true,
      shiftKey: true,
    });
    const input = await screen.findByRole("textbox", { name: "Rename thread" });
    await waitFor(() => expect(document.activeElement).toBe(input));
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: "Rename thread" }),
      ).toBeNull(),
    );

    openButton.focus();
    fireEvent.click(openButton);
    await screen.findByRole("dialog", { name: "Threads" });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(openButton));
    expect(mocks.rename).not.toHaveBeenCalled();
  });
});
