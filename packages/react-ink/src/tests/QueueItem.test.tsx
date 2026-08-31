import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { Box, Text } from "ink";

const remove = vi.fn();
const steer = vi.fn();

const mockUseAui = vi.fn(() => ({
  composer: {
    queueItem: ({ index }: { index: number }) => ({
      getState: () => ({
        id: `queue-item-${index}`,
        prompt: `prompt ${index}`,
      }),
    }),
  },
  queueItem: { remove, steer },
}));
const mockUseAuiState = vi.fn();

type UseAuiStateSelector = Parameters<
  (typeof import("@assistant-ui/store"))["useAuiState"]
>[0];

type InputHandler = (
  input: string,
  key: { return?: boolean; ctrl?: boolean; shift?: boolean; meta?: boolean },
) => void;

const inputHandlers: InputHandler[] = [];

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => mockUseAui(),
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    useFocus: () => ({ isFocused: true }),
    useInput: (handler: InputHandler, opts?: { isActive?: boolean }) => {
      if (opts?.isActive !== false) inputHandlers.push(handler);
    },
  };
});

import { ComposerQueue } from "../primitives/composer/ComposerQueue";
import { QueueItemRemove } from "../primitives/queueItem/QueueItemRemove";
import { QueueItemSteer } from "../primitives/queueItem/QueueItemSteer";
import { QueueItemText } from "../primitives/queueItem/QueueItemText";

const mockQueueItemParts = (parts: Array<{ type: string; text?: string }>) =>
  mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
    selector({
      queueItem: { parts },
    } as unknown as Parameters<UseAuiStateSelector>[0]),
  );

const pressEnter = () => {
  for (const handler of inputHandlers) handler("", { return: true });
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  inputHandlers.length = 0;
});

describe("QueueItemPrimitive.Text", () => {
  it("renders only text parts from queueItem state", () => {
    mockQueueItemParts([
      { type: "text", text: "hello world" },
      { type: "file", text: "not-a-text-part" },
    ]);

    const { lastFrame } = render(<QueueItemText />);

    expect(lastFrame()).toContain("hello world");
    expect(lastFrame()).not.toContain("not-a-text-part");
  });

  it("renders children when provided", () => {
    mockQueueItemParts([{ type: "text", text: "hello world" }]);

    const { lastFrame } = render(<QueueItemText>override</QueueItemText>);

    expect(lastFrame()).toContain("override");
    expect(lastFrame()).not.toContain("hello world");
  });

  it("forwards Ink Text props", () => {
    mockQueueItemParts([{ type: "text", text: "colored" }]);

    const { lastFrame } = render(<QueueItemText color="cyan" />);

    expect(lastFrame()).toContain("colored");
  });
});

describe("QueueItemPrimitive.Remove", () => {
  it("calls aui.queueItem().remove() on Enter", () => {
    render(
      <QueueItemRemove>
        <Text>[x]</Text>
      </QueueItemRemove>,
    );

    pressEnter();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("does not call remove() when disabled", () => {
    render(
      <QueueItemRemove disabled>
        <Text>[x]</Text>
      </QueueItemRemove>,
    );

    pressEnter();

    expect(remove).not.toHaveBeenCalled();
  });
});

describe("QueueItemPrimitive.Steer", () => {
  it("calls aui.queueItem().steer() on Enter", () => {
    render(
      <QueueItemSteer>
        <Text>[run]</Text>
      </QueueItemSteer>,
    );

    pressEnter();

    expect(steer).toHaveBeenCalledTimes(1);
  });

  it("does not call steer() when disabled", () => {
    render(
      <QueueItemSteer disabled>
        <Text>[run]</Text>
      </QueueItemSteer>,
    );

    pressEnter();

    expect(steer).not.toHaveBeenCalled();
  });
});

describe("ComposerPrimitive.Queue", () => {
  it("renders children once per queued item with the queueItem state", () => {
    mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
      selector({
        composer: {
          queue: Array.from({ length: 3 }, (_, index) => ({
            id: `queue-item-${index}`,
          })),
        },
        queueItem: { prompt: "p" },
      } as never),
    );
    const renderItem = vi.fn(() => (
      <Box>
        <Text>item</Text>
      </Box>
    ));

    render(<ComposerQueue>{renderItem}</ComposerQueue>);

    expect(renderItem).toHaveBeenCalledTimes(3);
    for (let index = 0; index < 3; index++) {
      const arg = (
        renderItem.mock.calls[index] as unknown as [
          { queueItem: { id: string; prompt: string } },
        ]
      )[0]!;
      expect(arg.queueItem).toEqual({
        id: `queue-item-${index}`,
        prompt: `prompt ${index}`,
      });
    }
  });

  it("does not call children when the queue is empty", () => {
    mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
      selector({
        composer: { queue: [] },
        queueItem: { prompt: "" },
      } as never),
    );
    const renderItem = vi.fn(() => (
      <Box>
        <Text>item</Text>
      </Box>
    ));

    render(<ComposerQueue>{renderItem}</ComposerQueue>);

    expect(renderItem).not.toHaveBeenCalled();
  });
});
