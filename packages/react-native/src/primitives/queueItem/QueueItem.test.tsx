import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "react-native";
import { QueueItemRemove } from "./QueueItemRemove";
import { QueueItemSteer } from "./QueueItemSteer";
import { QueueItemText } from "./QueueItemText";

const h = vi.hoisted(() => ({
  parts: [] as Array<{ type: "text" | "file"; text?: string }> | undefined,
  remove: vi.fn<() => void>(),
  steer: vi.fn<() => void>(),
}));

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => ({ queueItem: { remove: h.remove, steer: h.steer } }),
    useAuiState: <T,>(selector: (state: { queueItem: typeof h }) => T) =>
      selector({ queueItem: h }),
  };
});

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

  const render = async (element: ReactElement) => {
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

  it("renders nothing extra when queue item parts are missing", async () => {
    h.parts = undefined;
    await render(<QueueItemText testID="text" />);
    expect(container.querySelector('[data-testid="text"]')?.textContent).toBe(
      "",
    );
  });

  it("passes the Pressable press state to function children", async () => {
    await render(
      <QueueItemRemove testID="remove">
        {({ pressed }) => (pressed ? "pressed" : "idle")}
      </QueueItemRemove>,
    );
    expect(container.querySelector('[data-testid="remove"]')?.textContent).toBe(
      "idle",
    );

    await render(
      <QueueItemRemove testID="remove" testOnly_pressed>
        {({ pressed }) => (pressed ? "pressed" : "idle")}
      </QueueItemRemove>,
    );
    expect(container.querySelector('[data-testid="remove"]')?.textContent).toBe(
      "pressed",
    );

    await render(
      <QueueItemSteer testID="steer" testOnly_pressed>
        {({ pressed }) => (pressed ? "pressed" : "idle")}
      </QueueItemSteer>,
    );
    expect(container.querySelector('[data-testid="steer"]')?.textContent).toBe(
      "pressed",
    );
  });
});
