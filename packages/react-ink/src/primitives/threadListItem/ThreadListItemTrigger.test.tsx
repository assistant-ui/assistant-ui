import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "ink";
import { cleanup } from "ink-testing-library";
import { renderFrame } from "../../tests/helpers";
import { ThreadListItemTrigger } from "./ThreadListItemTrigger";

type InputHandler = (input: string, key: { return?: boolean }) => void;

const h = vi.hoisted(() => ({
  switchTo: vi.fn<() => void>(),
  state: {
    threads: { mainThreadId: "thread-1" },
    threadListItem: { id: "thread-1" },
  },
  renderState: null as unknown,
  inputHandler: null as InputHandler | null,
}));

vi.mock("@assistant-ui/core/react", () => ({
  useThreadListItemTrigger: () => ({ switchTo: h.switchTo }),
}));

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: <T,>(selector: (s: typeof h.state) => T) => selector(h.state),
  };
});

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    useFocus: () => ({ isFocused: true }),
    useInput: (handler: InputHandler) => {
      h.inputHandler = handler;
    },
  };
});

beforeEach(() => {
  h.switchTo.mockReset();
  h.state.threads.mainThreadId = "thread-1";
  h.state.threadListItem.id = "thread-1";
  h.renderState = null;
  h.inputHandler = null;
});

afterEach(() => {
  cleanup();
});

describe("ThreadListItemTrigger", () => {
  it("passes active state alongside focus and disabled state", async () => {
    const frame = await renderFrame(
      <ThreadListItemTrigger>
        {(state) => {
          h.renderState = state;
          return <Text>{state.isActive ? "current" : "not current"}</Text>;
        }}
      </ThreadListItemTrigger>,
    );

    expect(frame).toContain("current");
    expect(h.renderState).toMatchObject({
      isActive: true,
      isFocused: true,
      disabled: false,
    });
  });

  it("reports inactive state for another thread", async () => {
    h.state.threads.mainThreadId = "thread-2";

    const frame = await renderFrame(
      <ThreadListItemTrigger>
        {(state) => {
          h.renderState = state;
          return <Text>{state.isActive ? "current" : "not current"}</Text>;
        }}
      </ThreadListItemTrigger>,
    );

    expect(frame).toContain("not current");
    expect(h.renderState).toMatchObject({
      isActive: false,
      isFocused: true,
      disabled: false,
    });
  });

  it("preserves plain children and switches on press", async () => {
    const frame = await renderFrame(
      <ThreadListItemTrigger>
        <Text>thread</Text>
      </ThreadListItemTrigger>,
    );

    h.inputHandler?.("", { return: true });

    expect(frame).toContain("thread");
    expect(h.switchTo).toHaveBeenCalledTimes(1);
  });
});
