import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { Text } from "ink";
import { ScrollRoot } from "../primitives/scroll/ScrollRoot";
import { ScrollIndicator } from "../primitives/scroll/ScrollIndicator";

const mockUseInput = vi.fn();
const mockUseBoxMetrics = vi.fn();

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    useInput: (
      handler: Parameters<typeof actual.useInput>[0],
      options?: Parameters<typeof actual.useInput>[1],
    ) => mockUseInput(handler, options),
    useBoxMetrics: (...args: Parameters<typeof actual.useBoxMetrics>) =>
      mockUseBoxMetrics(...args),
  };
});

const createMetrics = (height: number) => ({
  height,
  width: 10,
  left: 0,
  top: 0,
  hasMeasured: true,
});

const tick = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const renderFrame = async (node: ReactElement) => {
  const instance = render(node);
  await tick();
  return instance;
};

const getInputHandler = () => {
  return mockUseInput.mock.calls.at(-1)?.[0] as
    | ((input: string, key: Record<string, boolean>) => void)
    | undefined;
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ScrollRoot", () => {
  it("renders the visible slice for the provided height", async () => {
    mockUseBoxMetrics.mockReturnValue(createMetrics(1));

    const rendered = await renderFrame(
      <ScrollRoot
        items={["one", "two", "three", "four"]}
        height={3}
        initialScrollToBottom={false}
        renderItem={(item) => <Text>{item}</Text>}
      >
        <ScrollIndicator />
      </ScrollRoot>,
    );

    const frame = rendered.lastFrame() ?? "";
    expect(frame).toContain("one");
    expect(frame).toContain("two");
    expect(frame).toContain("[3/4]");
  });

  it("handles PgDn, PgUp, Home, and End", async () => {
    mockUseBoxMetrics.mockReturnValue(createMetrics(1));

    const rendered = await renderFrame(
      <ScrollRoot
        items={["one", "two", "three", "four", "five", "six"]}
        height={2}
        initialScrollToBottom={false}
        stickToBottomThreshold={0}
        renderItem={(item) => <Text>{item}</Text>}
      >
        <ScrollIndicator />
      </ScrollRoot>,
    );

    const handler = getInputHandler();
    expect(handler).toBeTypeOf("function");

    handler?.("", { pageDown: true });
    await tick();
    expect(rendered.lastFrame() ?? "").toContain("[4/6]");

    handler?.("", { pageUp: true });
    await tick();
    expect(rendered.lastFrame() ?? "").toContain("[2/6]");

    handler?.("", { end: true });
    await tick();
    expect(rendered.lastFrame() ?? "").toContain("[6/6]");

    handler?.("", { home: true });
    await tick();
    expect(rendered.lastFrame() ?? "").toContain("[2/6]");
  });

  it("does not bind arrow keys by default", async () => {
    mockUseBoxMetrics.mockReturnValue(createMetrics(1));

    const rendered = await renderFrame(
      <ScrollRoot
        items={["one", "two", "three", "four"]}
        height={2}
        initialScrollToBottom={false}
        renderItem={(item) => <Text>{item}</Text>}
      >
        <ScrollIndicator />
      </ScrollRoot>,
    );

    const handler = getInputHandler();
    const before = rendered.lastFrame() ?? "";

    handler?.("", { upArrow: true });
    await tick();

    expect(rendered.lastFrame() ?? "").toBe(before);
  });

  it("enables arrow keys when line bindings are provided", async () => {
    mockUseBoxMetrics.mockReturnValue(createMetrics(1));

    const rendered = await renderFrame(
      <ScrollRoot
        items={["one", "two", "three", "four", "five", "six"]}
        height={2}
        initialScrollToBottom={false}
        keybindings={{ lineDown: "downArrow", lineUp: "upArrow" }}
        renderItem={(item) => <Text>{item}</Text>}
      >
        <ScrollIndicator />
      </ScrollRoot>,
    );

    const handler = getInputHandler();
    handler?.("", { downArrow: true });
    await tick();
    expect(rendered.lastFrame() ?? "").toContain("[3/6]");

    handler?.("", { upArrow: true });
    await tick();
    expect(rendered.lastFrame() ?? "").toContain("[2/6]");
  });

  it("does not subscribe to input when keybindings are disabled", async () => {
    mockUseBoxMetrics.mockReturnValue(createMetrics(1));

    await renderFrame(
      <ScrollRoot
        items={["one", "two"]}
        height={2}
        keybindings={false}
        renderItem={(item) => <Text>{item}</Text>}
      />,
    );

    expect(mockUseInput).not.toHaveBeenCalled();
  });

  it("auto-scrolls new items when already at the bottom", async () => {
    mockUseBoxMetrics.mockReturnValue(createMetrics(1));

    const rendered = await renderFrame(
      <ScrollRoot
        items={["one", "two"]}
        height={2}
        renderItem={(item) => <Text>{item}</Text>}
      >
        <ScrollIndicator />
      </ScrollRoot>,
    );

    rendered.rerender(
      <ScrollRoot
        items={["one", "two", "three"]}
        height={2}
        renderItem={(item) => <Text>{item}</Text>}
      >
        <ScrollIndicator />
      </ScrollRoot>,
    );

    await tick();

    const frame = rendered.lastFrame() ?? "";
    expect(frame).toContain("three");
    expect(frame).toContain("[3/3]");
    expect(frame).not.toContain("[paused");
  });

  it("shows the paused hint when new content arrives while scrolled up", async () => {
    mockUseBoxMetrics.mockReturnValue(createMetrics(1));

    const rendered = await renderFrame(
      <ScrollRoot
        items={["one", "two", "three", "four", "five", "six"]}
        height={2}
        stickToBottomThreshold={0}
        renderItem={(item) => <Text>{item}</Text>}
      >
        <ScrollIndicator />
      </ScrollRoot>,
    );

    const handler = getInputHandler();
    handler?.("", { pageUp: true });
    await tick();

    rendered.rerender(
      <ScrollRoot
        items={["one", "two", "three", "four", "five", "six", "seven"]}
        height={2}
        stickToBottomThreshold={0}
        renderItem={(item) => <Text>{item}</Text>}
      >
        <ScrollIndicator />
      </ScrollRoot>,
    );

    await tick();

    expect(rendered.lastFrame() ?? "").toContain(
      "[paused | End to resume | 3 new below]",
    );
  });

  it("does not show the paused hint on first render when initialScrollToBottom is false", async () => {
    mockUseBoxMetrics.mockReturnValue(createMetrics(1));

    const rendered = await renderFrame(
      <ScrollRoot
        items={["one", "two", "three", "four"]}
        height={2}
        initialScrollToBottom={false}
        renderItem={(item) => <Text>{item}</Text>}
      >
        <ScrollIndicator />
      </ScrollRoot>,
    );

    expect(rendered.lastFrame() ?? "").not.toContain("[paused");
  });

  it("suppresses the paused hint when renderPausedHint is false", async () => {
    mockUseBoxMetrics.mockReturnValue(createMetrics(1));

    const rendered = await renderFrame(
      <ScrollRoot
        items={["one", "two", "three"]}
        height={2}
        initialScrollToBottom={false}
        renderPausedHint={false}
        renderItem={(item) => <Text>{item}</Text>}
      />,
    );

    rendered.rerender(
      <ScrollRoot
        items={["one", "two", "three", "four"]}
        height={2}
        initialScrollToBottom={false}
        renderPausedHint={false}
        renderItem={(item) => <Text>{item}</Text>}
      />,
    );

    await tick();

    expect(rendered.lastFrame() ?? "").not.toContain("[paused");
  });

  it("re-measures streaming growth for an existing key", async () => {
    let rowHeight = 1;
    mockUseBoxMetrics.mockImplementation(() => createMetrics(rowHeight));

    const rendered = await renderFrame(
      <ScrollRoot
        items={["stream"]}
        height={2}
        keyExtractor={(item) => item}
        renderItem={(item) => <Text>{item}</Text>}
      >
        <ScrollIndicator
          format={({ scrollOffset, maxScrollOffset }) =>
            `${scrollOffset}:${maxScrollOffset}`
          }
        />
      </ScrollRoot>,
    );

    expect(rendered.lastFrame() ?? "").toContain("0:0");

    rowHeight = 3;
    rendered.rerender(
      <ScrollRoot
        items={["stream"]}
        height={2}
        keyExtractor={(item) => item}
        renderItem={(item) => <Text>{item}</Text>}
      >
        <ScrollIndicator
          format={({ scrollOffset, maxScrollOffset }) =>
            `${scrollOffset}:${maxScrollOffset}`
          }
        />
      </ScrollRoot>,
    );

    await tick();
    await tick();
    await tick();
    await tick();

    expect(rendered.lastFrame() ?? "").toContain("1:1");
  });

  it("renders zero items without crashing", async () => {
    mockUseBoxMetrics.mockReturnValue(createMetrics(1));

    const rendered = await renderFrame(
      <ScrollRoot
        items={[]}
        height={2}
        renderItem={(item) => <Text>{String(item)}</Text>}
      >
        <ScrollIndicator />
      </ScrollRoot>,
    );

    expect(rendered.lastFrame() ?? "").toContain("[0/0]");
  });
});
