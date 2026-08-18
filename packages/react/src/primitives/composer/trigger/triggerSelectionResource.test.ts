import { describe, expect, it, vi } from "vitest";
import { createTapRoot, flushTapSync, useResource } from "@assistant-ui/tap";
import type {
  Unstable_DirectiveFormatter,
  Unstable_TriggerItem,
} from "@assistant-ui/core";
import type { AssistantClient } from "@assistant-ui/store";
import { TriggerDetectionResource } from "./triggerDetectionResource";
import {
  TriggerSelectionResource,
  type TriggerBehavior,
} from "./triggerSelectionResource";

const item: Unstable_TriggerItem = {
  id: "file",
  type: "file",
  label: "file.txt",
};

const formatter: Unstable_DirectiveFormatter = {
  serialize: () => "@file.txt",
  parse: () => [],
};

const makeAui = (textRef: { value: string }) => {
  const setText = vi.fn((value: string) => {
    textRef.value = value;
  });

  return {
    aui: {
      composer: {
        getState: () => ({ text: textRef.value }),
        setText,
      },
    } as unknown as AssistantClient,
    setText,
  };
};

const render = ({
  behavior,
  text,
  trigger,
}: {
  behavior: TriggerBehavior;
  text: string;
  trigger: { offset: number; query: string };
}) => {
  const textRef = { value: text };
  const { aui, setText } = makeAui(textRef);
  const setCursorPosition = vi.fn();
  const onSelected = vi.fn();
  const root = createTapRoot(function Root() {
    return useResource(
      TriggerSelectionResource({
        behavior,
        trigger,
        aui,
        triggerChar: "@",
        setCursorPosition,
        onSelected,
      }),
    );
  });

  return { root, setText, setCursorPosition, onSelected };
};

describe("TriggerSelectionResource", () => {
  it("resynchronizes the cursor after inserting a directive", () => {
    const { root, setText, setCursorPosition, onSelected } = render({
      behavior: { kind: "directive", formatter },
      text: "@file tail",
      trigger: { offset: 0, query: "file" },
    });

    root.getValue().selectItem(item);

    expect(setText).toHaveBeenCalledWith("@file.txt tail");
    expect(setCursorPosition).toHaveBeenCalledWith("@file.txt".length + 1);
    expect(onSelected).toHaveBeenCalledOnce();
  });

  it("resynchronizes the cursor after removing an action", () => {
    const { root, setText, setCursorPosition } = render({
      behavior: {
        kind: "action",
        formatter,
        onExecute: vi.fn(),
        removeOnExecute: true,
      },
      text: "before @file tail",
      trigger: { offset: 7, query: "file" },
    });

    root.getValue().selectItem(item);

    expect(setText).toHaveBeenCalledWith("before tail");
    expect(setCursorPosition).toHaveBeenCalledWith(7);
  });

  it("does not rewrite composer text on a second select after insertion", () => {
    const textRef = { value: "@fil" };
    const { aui, setText } = makeAui(textRef);
    const onSelected = vi.fn();
    const root = createTapRoot(function Root() {
      const detection = useResource(
        TriggerDetectionResource({
          text: textRef.value,
          triggerChar: "@",
        }),
      );
      return useResource(
        TriggerSelectionResource({
          behavior: { kind: "directive", formatter },
          trigger: detection.trigger,
          aui,
          triggerChar: "@",
          setCursorPosition: detection.setCursorPosition,
          onSelected,
        }),
      );
    });

    flushTapSync(() => {
      root.getValue().selectItem(item);
    });
    root.getValue().selectItem(item);

    expect(setText).toHaveBeenCalledOnce();
    expect(setText).toHaveBeenCalledWith("@file.txt ");
    expect(textRef.value).toBe("@file.txt ");
  });
});
