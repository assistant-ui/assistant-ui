/**
 * @vitest-environment jsdom
 */
import { act, useEffect, type FC } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalEditor,
} from "lexical";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  useLocalRuntime,
  type AssistantRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import type {
  Unstable_TriggerAdapter,
  Unstable_TriggerItem,
} from "@assistant-ui/core";
import { LexicalComposerInput } from "./LexicalComposerInput";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const weather: Unstable_TriggerItem = {
  id: "get_weather",
  type: "tool",
  label: "Weather",
};

const triggerAdapter: Unstable_TriggerAdapter = {
  categories: () => [],
  categoryItems: () => [],
  search: () => [weather],
};

describe("LexicalComposerInput directive triggers", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: LexicalEditor;
  let runtime: AssistantRuntime;
  let textSeenBy: Record<string, string>;
  // The runtime state updates synchronously; useAui snapshots wait for React.
  const composerText = () => runtime.thread.composer.getState().text;

  const EditorProbe: FC = () => {
    const [lexicalEditor] = useLexicalComposerContext();
    useEffect(() => {
      editor = lexicalEditor;
    }, [lexicalEditor]);
    return null;
  };

  const Composer: FC = () => (
    <ComposerPrimitive.TriggerPopoverRoot>
      <ComposerPrimitive.Root>
        <LexicalComposerInput
          aria-label="Message"
          directivePluginProps={{
            onDirectiveSelect: () => {
              textSeenBy.onDirectiveSelect = composerText();
            },
          }}
        >
          <EditorProbe />
        </LexicalComposerInput>
        <ComposerPrimitive.TriggerPopover char="@" adapter={triggerAdapter}>
          <ComposerPrimitive.TriggerPopover.Directive
            onInserted={() => {
              textSeenBy.onInserted = composerText();
            }}
          />
          <ComposerPrimitive.TriggerPopoverItems>
            {(items) =>
              items.map((item) => (
                <ComposerPrimitive.TriggerPopoverItem key={item.id} item={item}>
                  {item.label}
                </ComposerPrimitive.TriggerPopoverItem>
              ))
            }
          </ComposerPrimitive.TriggerPopoverItems>
        </ComposerPrimitive.TriggerPopover>
      </ComposerPrimitive.Root>
    </ComposerPrimitive.TriggerPopoverRoot>
  );

  const App: FC = () => {
    runtime = useLocalRuntime(noOpAdapter);
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Composer />
      </AssistantRuntimeProvider>
    );
  };

  beforeEach(async () => {
    textSeenBy = {};
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<App />);
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it.each([
    [
      "clicking an option",
      (container: HTMLElement) => {
        const option = Array.from(
          container.querySelectorAll<HTMLElement>('[role="option"]'),
        ).find((element) => element.textContent === "Weather");
        option!.click();
      },
    ],
    [
      "pressing Enter",
      (container: HTMLElement) => {
        container
          .querySelector('[role="textbox"][aria-label="Message"]')!
          .dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              bubbles: true,
              cancelable: true,
            }),
          );
      },
    ],
  ])(
    "reports the insertion after the composer text holds the directive when %s",
    async (_, select) => {
      await act(async () => {
        editor.update(() => {
          const text = $createTextNode("ask @wea");
          $getRoot().clear().append($createParagraphNode().append(text));
          text.select();
        });
      });

      await act(async () => {
        select(container);
      });

      const expected = "ask :tool[Weather]{name=get_weather}";
      expect(textSeenBy).toEqual({
        onInserted: expected,
        onDirectiveSelect: expected,
      });
    },
  );
});
