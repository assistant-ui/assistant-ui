/**
 * @vitest-environment jsdom
 */
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $setSelection,
  DELETE_CHARACTER_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  type LexicalEditor,
  type NodeKey,
} from "lexical";
import { LexicalComposerInput } from "../LexicalComposerInput";
import {
  $createDirectiveNode,
  type DirectiveNode,
} from "../nodes/DirectiveNode";

const setText = vi.fn<(text: string) => void>();
const sendSpy = vi.fn<(options?: { steer?: boolean }) => void>();
const cancelSpy = vi.fn<() => void>();

const composerState = {
  isEditing: true,
  text: "",
  type: "thread" as const,
  isEmpty: true,
  canCancel: false,
  canSend: true,
  dictation: undefined as undefined | { inputDisabled: boolean },
};

const threadState = {
  isDisabled: false,
  isRunning: false,
};

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  const aui = {
    composer: () => ({
      setText,
      getState: () => composerState,
      cancel: cancelSpy,
      send: sendSpy,
    }),
    thread: () => ({
      getState: () => threadState,
    }),
    on: () => () => {},
  };
  type Selector<T> = (s: {
    composer: typeof composerState;
    thread: typeof threadState;
  }) => T;
  return {
    ...actual,
    useAui: () => aui,
    useAuiState: <T,>(selector: Selector<T>) =>
      selector({ composer: composerState, thread: threadState }),
  };
});

type FixtureNodes = {
  paragraph: ReturnType<typeof $createParagraphNode>;
  before: ReturnType<typeof $createTextNode>;
  directive: DirectiveNode;
  after: ReturnType<typeof $createTextNode>;
};

type FixtureKeys = {
  before: NodeKey;
  directive: NodeKey;
};

function $createFixture(
  select: (nodes: FixtureNodes) => void,
  beforeText = "before",
): FixtureKeys {
  const paragraph = $createParagraphNode();
  const before = $createTextNode(beforeText);
  const directive = $createDirectiveNode({
    id: "weather",
    type: "tool",
    label: "Weather",
  });
  const after = $createTextNode("after");

  paragraph.append(before, directive, after);
  $getRoot().clear();
  $getRoot().append(paragraph);
  select({ paragraph, before, directive, after });

  return {
    before: before.getKey(),
    directive: directive.getKey(),
  };
}

function ProbePlugin({
  capture,
}: {
  capture: (editor: LexicalEditor) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    capture(editor);
  }, [capture, editor]);

  return null;
}

function modifySelection(
  this: Selection,
  alter: string,
  direction: string,
): void {
  if (this.rangeCount === 0 || alter !== "extend") return;

  const range = this.getRangeAt(0).cloneRange();
  if (direction === "backward") {
    range.setStart(range.startContainer, range.startOffset - 1);
  } else {
    range.setEnd(range.endContainer, range.endOffset + 1);
  }
  this.removeAllRanges();
  this.addRange(range);
}

describe("DirectivePlugin", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: LexicalEditor;
  let selectionModifyDescriptor: PropertyDescriptor | undefined;

  beforeEach(async () => {
    setText.mockReset();
    sendSpy.mockReset();
    cancelSpy.mockReset();
    composerState.isEditing = true;
    composerState.text = "";
    composerState.isEmpty = true;
    composerState.canSend = true;
    composerState.dictation = undefined;
    threadState.isDisabled = false;
    threadState.isRunning = false;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    selectionModifyDescriptor = Object.getOwnPropertyDescriptor(
      window.Selection.prototype,
      "modify",
    );
    Object.defineProperty(window.Selection.prototype, "modify", {
      configurable: true,
      value: modifySelection,
    });

    await act(async () => {
      root.render(
        <LexicalComposerInput>
          <ProbePlugin
            capture={(capturedEditor) => {
              editor = capturedEditor;
            }}
          />
        </LexicalComposerInput>,
      );
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    if (selectionModifyDescriptor) {
      Object.defineProperty(
        window.Selection.prototype,
        "modify",
        selectionModifyDescriptor,
      );
    } else {
      Reflect.deleteProperty(window.Selection.prototype, "modify");
    }
    vi.restoreAllMocks();
  });

  it("deletes a directive forward from a text-node edge", async () => {
    let keys!: FixtureKeys;
    await act(async () => {
      editor.update(() => {
        keys = $createFixture(({ before }) => {
          before.select(
            before.getTextContentSize(),
            before.getTextContentSize(),
          );
        });
      });
    });

    const event = new KeyboardEvent("keydown", {
      key: "Delete",
      cancelable: true,
    });
    await act(async () => {
      editor.dispatchCommand(KEY_DELETE_COMMAND, event);
    });

    editor.getEditorState().read(() => {
      expect($getNodeByKey(keys.directive)).toBeNull();
      expect($getRoot().getTextContent()).toBe("beforeafter");
    });
  });

  it("deletes a directive forward from an element anchor", async () => {
    let keys!: FixtureKeys;
    await act(async () => {
      editor.update(() => {
        keys = $createFixture(({ paragraph }) => {
          paragraph.select(1, 1);
        });
      });
    });

    await act(async () => {
      editor.dispatchCommand(DELETE_CHARACTER_COMMAND, false);
    });

    editor.getEditorState().read(() => {
      expect($getNodeByKey(keys.directive)).toBeNull();
    });
  });

  it("deletes a node-selected directive with forward Delete", async () => {
    let keys!: FixtureKeys;
    await act(async () => {
      editor.update(() => {
        keys = $createFixture(({ directive }) => {
          const selection = $createNodeSelection();
          selection.add(directive.getKey());
          $setSelection(selection);
        });
      });
    });

    const event = new KeyboardEvent("keydown", {
      key: "Delete",
      cancelable: true,
    });
    await act(async () => {
      editor.dispatchCommand(KEY_DELETE_COMMAND, event);
    });

    expect(event.defaultPrevented).toBe(true);
    editor.getEditorState().read(() => {
      expect($getNodeByKey(keys.directive)).toBeNull();
    });
  });

  it("deletes a directive backward from a text-node edge", async () => {
    let keys!: FixtureKeys;
    await act(async () => {
      editor.update(() => {
        keys = $createFixture(({ after }) => {
          after.select(0, 0);
        });
      });
    });

    const event = new KeyboardEvent("keydown", {
      key: "Backspace",
      cancelable: true,
    });
    await act(async () => {
      editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event);
    });

    editor.getEditorState().read(() => {
      expect($getNodeByKey(keys.directive)).toBeNull();
      expect($getRoot().getTextContent()).toBe("beforeafter");
    });
  });

  it("deletes a directive backward from an element anchor", async () => {
    let keys!: FixtureKeys;
    await act(async () => {
      editor.update(() => {
        keys = $createFixture(({ paragraph }) => {
          paragraph.select(2, 2);
        });
      });
    });

    await act(async () => {
      editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
    });

    editor.getEditorState().read(() => {
      expect($getNodeByKey(keys.directive)).toBeNull();
    });
  });

  it("deletes a node-selected directive with Backspace", async () => {
    let keys!: FixtureKeys;
    await act(async () => {
      editor.update(() => {
        keys = $createFixture(({ directive }) => {
          const selection = $createNodeSelection();
          selection.add(directive.getKey());
          $setSelection(selection);
        });
      });
    });

    const event = new KeyboardEvent("keydown", {
      key: "Backspace",
      cancelable: true,
    });
    await act(async () => {
      editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event);
    });

    expect(event.defaultPrevented).toBe(true);
    editor.getEditorState().read(() => {
      expect($getNodeByKey(keys.directive)).toBeNull();
    });
  });

  it("deletes a directive through the mobile backspace command path", async () => {
    let keys!: FixtureKeys;
    await act(async () => {
      editor.update(() => {
        keys = $createFixture(({ after }) => {
          after.select(0, 0);
        });
      });
    });

    await act(async () => {
      editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
    });

    editor.getEditorState().read(() => {
      expect($getNodeByKey(keys.directive)).toBeNull();
    });
  });

  it("falls through to plain-text forward deletion away from a directive", async () => {
    let keys!: FixtureKeys;
    await act(async () => {
      editor.update(() => {
        keys = $createFixture(({ before }) => {
          before.select(1, 1);
        }, "abcd");
      });
    });

    await act(async () => {
      editor.dispatchCommand(DELETE_CHARACTER_COMMAND, false);
    });

    editor.getEditorState().read(() => {
      expect($getNodeByKey(keys.directive)?.isAttached()).toBe(true);
      expect($getNodeByKey(keys.before)?.getTextContent()).toBe("acd");
    });
  });
});
