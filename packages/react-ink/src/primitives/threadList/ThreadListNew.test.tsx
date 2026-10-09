import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "ink";
import { cleanup } from "ink-testing-library";
import { renderFrame } from "../../tests/helpers";
import { ThreadListNew } from "./ThreadListNew";

const h = vi.hoisted(() => ({
  switchToNewThread: vi.fn<() => void>(),
  state: { threads: { newThreadId: "new", mainThreadId: "other" } },
  renderState: null as unknown,
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    useThreadListNew: () => ({ switchToNewThread: h.switchToNewThread }),
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: <T,>(selector: (s: typeof h.state) => T) => selector(h.state),
  };
});

beforeEach(() => {
  h.switchToNewThread.mockReset();
  h.state.threads = { newThreadId: "new", mainThreadId: "other" };
  h.renderState = null;
});

afterEach(() => {
  cleanup();
});

describe("ThreadListNew", () => {
  it("passes isActive alongside pressable state when the new thread is current", async () => {
    h.state.threads = { newThreadId: "new", mainThreadId: "new" };

    const frame = await renderFrame(
      <ThreadListNew>
        {(state) => {
          h.renderState = state;
          return <Text>{state.isActive ? "current" : "not current"}</Text>;
        }}
      </ThreadListNew>,
    );

    expect(frame).toContain("current");
    expect(frame).not.toContain("not current");
    expect(h.renderState).toMatchObject({
      isActive: true,
      disabled: false,
    });
    expect(h.renderState).toHaveProperty("isFocused");
  });

  it("reports an inactive render state while another thread is current", async () => {
    const frame = await renderFrame(
      <ThreadListNew>
        {(state) => {
          h.renderState = state;
          return <Text>{state.isActive ? "current" : "not current"}</Text>;
        }}
      </ThreadListNew>,
    );

    expect(frame).toContain("not current");
    expect(h.renderState).toMatchObject({
      isActive: false,
      disabled: false,
    });
    expect(h.renderState).toHaveProperty("isFocused");
  });

  it("still renders plain children", async () => {
    const frame = await renderFrame(
      <ThreadListNew>
        <Text>new thread</Text>
      </ThreadListNew>,
    );

    expect(frame).toContain("new thread");
  });
});
