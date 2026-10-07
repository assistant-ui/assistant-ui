import { Box, Text } from "ink";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import type { ThreadListItemPrimitive } from "../index";
import { Title as ThreadListItemTitle } from "../primitives/threadListItem";
import { renderFrame, type UseAuiStateSelector } from "./helpers";

const fallbackProps: ThreadListItemPrimitive.Title.Props = {
  fallback: "New chat",
};

const h = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let state = { threadListItem: { title: undefined as string | undefined } };
  return {
    captured: { textProps: null as Record<string, unknown> | null },
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setTitle: (title: string | undefined) => {
      state = { threadListItem: { title } };
      listeners.forEach((listener) => listener());
    },
  };
});

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  const React = await import("react");
  const TextMock = (props: Record<string, unknown>) => {
    h.captured.textProps = props;
    return React.createElement(
      actual.Text as unknown as React.ElementType,
      props,
    );
  };
  return { ...actual, Text: TextMock };
});

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  const { useSyncExternalStore } = await import("react");
  return {
    ...actual,
    useAuiState: (selector: UseAuiStateSelector) =>
      selector(useSyncExternalStore(h.subscribe, h.getState) as never),
  };
});

afterEach(() => {
  cleanup();
  h.setTitle(undefined);
  h.captured.textProps = null;
});

describe("ThreadListItemTitle", () => {
  it("renders the title inside a Box parent", async () => {
    h.setTitle("My thread");

    const frame = await renderFrame(
      <Box>
        <ThreadListItemTitle />
      </Box>,
    );

    expect(frame).toContain("My thread");
  });

  it("forwards host Text props the public type exposes", async () => {
    h.setTitle("My thread");

    const frame = await renderFrame(
      <Box>
        <ThreadListItemTitle dimColor wrap="truncate" />
      </Box>,
    );

    expect(h.captured.textProps).toMatchObject({
      dimColor: true,
      wrap: "truncate",
    });
    expect(frame).toContain("My thread");
  });

  it("renders the fallback when the thread has no title", async () => {
    const frame = await renderFrame(
      <Box>
        <ThreadListItemTitle {...fallbackProps} />
      </Box>,
    );

    expect(frame).toContain("New chat");
  });

  it("renders an empty title with the fallback", async () => {
    h.setTitle("");

    const frame = await renderFrame(
      <Box>
        <ThreadListItemTitle {...fallbackProps} />
      </Box>,
    );

    expect(frame).toContain("New chat");
  });

  it("renders nothing without a title or fallback", async () => {
    const frame = await renderFrame(
      <Box>
        <ThreadListItemTitle dimColor />
      </Box>,
    );

    expect(frame).toBe("");
  });

  it("renders an element fallback outside Text", async () => {
    const frame = await renderFrame(
      <Box>
        <ThreadListItemTitle
          fallback={
            <Box>
              <Text>Untitled</Text>
            </Box>
          }
        />
      </Box>,
    );

    expect(frame).toContain("Untitled");
  });

  it("updates the title while mounted", async () => {
    const instance = render(
      <Box>
        <ThreadListItemTitle {...fallbackProps} />
      </Box>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(instance.lastFrame()).toContain("New chat");

    h.setTitle("First title");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(instance.lastFrame()).toContain("First title");

    h.setTitle("Updated title");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(instance.lastFrame()).toContain("Updated title");
  });
});
