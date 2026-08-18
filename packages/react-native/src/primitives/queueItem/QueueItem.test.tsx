import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "react-native";
import { QueueItemRemove } from "./QueueItemRemove";
import { QueueItemSteer } from "./QueueItemSteer";
import { QueueItemText } from "./QueueItemText";

const h = vi.hoisted(() => ({
  parts: [] as Array<{ type: "text" | "file"; text?: string }>,
  remove: vi.fn<() => void>(),
  steer: vi.fn<() => void>(),
}));

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({ queueItem: { remove: h.remove, steer: h.steer } }),
  useAuiState: <T,>(selector: (state: { queueItem: typeof h }) => T) =>
    selector({ queueItem: h }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("Queue item primitives", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.parts = [];
    h.remove.mockReset();
    h.steer.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const render = async (element: React.ReactElement) => {
    await act(async () => {
      root.render(element);
    });
  };

  const press = async (testID: string) => {
    const element = container.querySelector(`[data-testid="${testID}"]`);
    expect(element).not.toBeNull();
    await act(async () => {
      element!.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
  };

  it("renders only text parts and supports child overrides", async () => {
    h.parts = [
      { type: "text", text: "hello" },
      { type: "file", text: "not rendered" },
      { type: "text", text: "world" },
    ];
    await render(<QueueItemText testID="text" />);
    expect(container.querySelector('[data-testid="text"]')?.textContent).toBe(
      "hello\n\nworld",
    );

    await render(
      <QueueItemText testID="text">
        <Text>override</Text>
      </QueueItemText>,
    );
    expect(container.querySelector('[data-testid="text"]')?.textContent).toBe(
      "override",
    );
  });

  it("removes a queue item when pressed", async () => {
    await render(<QueueItemRemove testID="remove">remove</QueueItemRemove>);
    await press("remove");
    expect(h.remove).toHaveBeenCalledTimes(1);
  });

  it("steers a queue item when pressed", async () => {
    await render(<QueueItemSteer testID="steer">steer</QueueItemSteer>);
    await press("steer");
    expect(h.steer).toHaveBeenCalledTimes(1);
  });
});
