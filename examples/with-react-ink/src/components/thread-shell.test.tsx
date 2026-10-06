import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { Text } from "ink";

const mocks = vi.hoisted(() => ({
  state: {
    mainThreadId: "one",
    threadIds: ["one", "two"],
    archivedThreadIds: ["old"],
    threadItems: [
      {
        id: "one",
        title: "First thread",
        status: "regular",
        custom: {} as Record<string, unknown>,
      },
      {
        id: "two",
        title: "Second thread",
        status: "regular",
        custom: {} as Record<string, unknown>,
      },
      {
        id: "old",
        title: "Old thread",
        status: "archived",
        custom: {} as Record<string, unknown>,
      },
    ],
    isLoading: false,
    hasMore: false,
    loadError: undefined,
  },
  switchToThread: vi.fn(),
  switchToNewThread: vi.fn(),
  item: vi.fn(),
  rename: vi.fn(),
  archive: vi.fn(),
  unarchive: vi.fn(),
  delete: vi.fn(),
  updateCustom: vi.fn(),
}));

vi.mock("@assistant-ui/react-ink", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react-ink")>()),
  useAui: () => ({ threads: { ...mocks } }),
  useAuiState: (
    selector: (state: { threads: typeof mocks.state }) => unknown,
  ) => selector({ threads: mocks.state }),
}));

import { ThreadShell } from "./thread-shell";

const settle = () => new Promise((resolve) => setTimeout(resolve, 40));
const create = async () => {
  const result = render(
    <ThreadShell>
      {({ isComposing }) => (
        <Text>{isComposing ? "Composer active" : "Composer paused"}</Text>
      )}
    </ThreadShell>,
  );
  await settle();
  const press = async (key: string) => {
    result.stdin.write(key);
    await settle();
  };
  return { ...result, press };
};

beforeEach(() => {
  mocks.item.mockReturnValue({
    rename: mocks.rename,
    archive: mocks.archive,
    unarchive: mocks.unarchive,
    delete: mocks.delete,
    updateCustom: mocks.updateCustom,
  });
  mocks.rename.mockReset();
});
afterEach(cleanup);

describe("terminal thread controls", () => {
  it.each([null, "/", "?"])(
    "returns to composer with Ctrl+G from %s",
    async (mode) => {
      const { press, lastFrame } = await create();
      await press("\x07");
      if (mode) await press(mode);
      await press("\x07");
      expect(lastFrame()).toContain("Composer active");
    },
  );

  it.each([
    { key: "r", prompt: "Rename thread" },
    { key: "d", prompt: "This cannot be undone" },
  ])("keeps $prompt open on Ctrl+G", async ({ key, prompt }) => {
    const { press, lastFrame } = await create();
    await press("\x07");
    await press(key);
    await press("\x07");
    expect(lastFrame()).toContain(prompt);
    expect(lastFrame()).not.toContain("Composer active");
    expect(mocks.rename).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it.each([
    { main: "one", key: "\x1b[1;3A", target: "two" },
    { main: "two", key: "\x1b[1;3B", target: "one" },
  ])(
    "navigates from $main to $target in pinned order",
    async ({ main, key, target }) => {
      mocks.state.threadItems[1]!.custom = { pinned: "true" };
      mocks.state.mainThreadId = main;
      try {
        const { press, lastFrame } = await create();
        expect(lastFrame()!.indexOf("Second thread")).toBeLessThan(
          lastFrame()!.indexOf("First thread"),
        );
        await press(key);
        expect(mocks.switchToThread).toHaveBeenCalledWith(target);
      } finally {
        mocks.state.threadItems[1]!.custom = {};
        mocks.state.mainThreadId = "one";
      }
    },
  );

  it("switches between the sidebar and composer after a narrow resize", async () => {
    const { stdout, press, lastFrame } = await create();
    expect(lastFrame()).toContain("First thread");
    const columns = vi.spyOn(stdout, "columns", "get").mockReturnValue(42);
    stdout.emit("resize");
    await settle();
    expect(lastFrame()).not.toContain("First thread");
    expect(lastFrame()).toContain("Composer active");
    await press("\x07");
    expect(lastFrame()).toContain("First thread");
    expect(lastFrame()).not.toContain("Composer active");
    await press("\x1b");
    expect(lastFrame()).toContain("Composer active");
    columns.mockRestore();
  });

  it("resizes sidebar pages when only the terminal height changes", async () => {
    const previous = {
      ids: mocks.state.threadIds,
      items: mocks.state.threadItems,
    };
    mocks.state.threadItems = Array.from({ length: 16 }, (_, index) => ({
      id: `t${index}`,
      title: `Thread ${String(index).padStart(2, "0")}`,
      status: "regular",
      custom: {},
    }));
    mocks.state.threadIds = mocks.state.threadItems.map((item) => item.id);
    try {
      const { stdout, lastFrame, press } = await create();
      Object.assign(stdout, { rows: 40 });
      stdout.emit("resize");
      await press("\x07");
      await press("\x1b[B");
      await press("\x1b[B");
      expect(lastFrame()).toContain("Thread 15");

      Object.assign(stdout, { rows: 18 });
      stdout.emit("resize");
      await vi.waitFor(() => {
        expect(lastFrame()).not.toContain("Thread 15");
        expect(lastFrame()).toContain("Thread 02");
        expect(lastFrame()).toContain("12 more");
      });

      Object.assign(stdout, { rows: 40 });
      stdout.emit("resize");
      await vi.waitFor(() => expect(lastFrame()).toContain("Thread 15"));
      await press("\r");
      expect(mocks.switchToThread).toHaveBeenCalledWith("t2", {
        unarchive: false,
      });
    } finally {
      mocks.state.threadIds = previous.ids;
      mocks.state.threadItems = previous.items;
    }
  });

  it("navigates and opens a selected thread without leaving the sidebar input active", async () => {
    const { press, lastFrame } = await create();
    await press("\x07");
    expect(lastFrame()).toContain("Threads");
    await press("\x1b[B");
    await press("\r");
    expect(mocks.switchToThread).toHaveBeenCalledWith("two", {
      unarchive: false,
    });
    expect(lastFrame()).toContain("Composer active");
  });

  it("searches, renames the selected thread, and cancels without saving", async () => {
    const { press, lastFrame } = await create();
    await press("\x07");
    await press("/");
    await press("Second");
    await press("\r");
    expect(lastFrame()).not.toContain("First thread");
    await press("r");
    await press("\x15");
    await press("Renamed");
    await press("\r");
    expect(mocks.item).toHaveBeenCalledWith({ id: "two" });
    expect(mocks.rename).toHaveBeenCalledWith("Renamed");
    await press("r");
    await press("\x1b");
    expect(mocks.rename).toHaveBeenCalledTimes(1);
  });

  it("offers archive, restore, and pin through the existing item actions", async () => {
    const { press } = await create();
    await press("\x07");
    await press("p");
    expect(mocks.updateCustom).toHaveBeenCalledWith({ pinned: "true" });
    await press("a");
    expect(mocks.archive).toHaveBeenCalledOnce();
    await press("x");
    await press("a");
    expect(mocks.item).toHaveBeenCalledWith({ id: "old" });
    expect(mocks.unarchive).toHaveBeenCalledOnce();
  });

  it("requires confirmation for deletion and accepts cancellation", async () => {
    const { press, lastFrame } = await create();
    await press("\x07");
    await press("d");
    expect(lastFrame()).toContain("This cannot be undone");
    expect(mocks.delete).not.toHaveBeenCalled();
    await press("n");
    expect(mocks.delete).not.toHaveBeenCalled();
    await press("d");
    await press("y");
    expect(mocks.delete).toHaveBeenCalledOnce();
  });

  it.each(["archive", "delete"] as const)(
    "clears selection when %s removes the selected thread",
    async (action) => {
      const previousIds = mocks.state.threadIds;
      mocks[action].mockImplementationOnce(() => {
        mocks.state.threadIds = ["one"];
      });
      try {
        const { press, lastFrame } = await create();
        await press("\x07");
        await press("\x1b[B");
        if (action === "archive") await press("a");
        else {
          await press("d");
          await press("y");
        }
        expect(mocks.item).toHaveBeenLastCalledWith({ id: "two" });
        expect(lastFrame()).not.toContain("Second thread");
        const calls = mocks.item.mock.calls.length;

        await press("a");
        await press("d");
        expect(mocks.item).toHaveBeenCalledTimes(calls);
        expect(lastFrame()).not.toContain("This cannot be undone");

        await press("\x1b[B");
        await press("r");
        expect(mocks.item).toHaveBeenLastCalledWith({ id: "one" });
        expect(lastFrame()).toContain("Rename thread");
      } finally {
        mocks.state.threadIds = previousIds;
      }
    },
  );

  it("retains a failed rename and prevents duplicate saves while pending", async () => {
    let reject!: (error: Error) => void;
    mocks.rename.mockImplementationOnce(
      () =>
        new Promise((_, rejectPromise) => {
          reject = rejectPromise;
        }),
    );
    const { press, lastFrame } = await create();
    await press("\x12");
    await press("\r");
    await press("\r");
    expect(mocks.rename).toHaveBeenCalledOnce();
    expect(lastFrame()).toContain("Saving");
    reject(new Error("offline"));
    await settle();
    expect(lastFrame()).toContain("Could not complete");
    expect(lastFrame()).toContain("First thread");
    await press("\r");
    expect(mocks.rename).toHaveBeenCalledTimes(2);
  });

  it.each(["archived", "filtered"])(
    "shows the selected active thread after navigating from %s results",
    async (view) => {
      const { press, lastFrame } = await create();
      await press("\x07");
      if (view === "archived") await press("x");
      await press("/");
      await press(view === "archived" ? "Old" : "First");
      await press("\r");
      await press("\x1b[1;3B");
      await vi.waitFor(() => {
        expect(mocks.switchToThread).toHaveBeenCalledWith("two");
        expect(lastFrame()).toContain("Second thread");
        expect(lastFrame()).not.toContain("Search:");
        expect(lastFrame()).toContain("Composer active");
      });
      expect(lastFrame()).not.toContain("Old thread");
    },
  );

  it("supports new and adjacent thread shortcuts", async () => {
    const { press } = await create();
    await press("\x1b[1;3B");
    expect(mocks.switchToThread).toHaveBeenCalledWith("two");
    await press("\x0e");
    expect(mocks.switchToNewThread).toHaveBeenCalledOnce();
  });
});
