import { createEmptyHistoryState, registerHistory } from "@lexical/history";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  REDO_COMMAND,
  UNDO_COMMAND,
  createEditor,
} from "lexical";
import { describe, expect, it } from "vitest";
import { createDocumentStore } from "./document-store";
import { registerDocumentSync } from "./document-sync";
import { $getMarkdown, $setMarkdown, DOCUMENT_NODES } from "./markdown";

const setup = (initialContent = "") => {
  const store = createDocumentStore(initialContent);
  const editor = createEditor({
    nodes: DOCUMENT_NODES,
    onError: (error) => {
      throw error;
    },
  });
  registerHistory(editor, createEmptyHistoryState(), 0);
  const stop = registerDocumentSync(editor, store);

  const type = (text: string) =>
    editor.update(
      () => {
        $getRoot().append($createParagraphNode().append($createTextNode(text)));
      },
      { discrete: true },
    );
  const text = () =>
    editor.getEditorState().read(() => $getRoot().getTextContent());
  // Lexical commits a history command's state in a microtask.
  const undo = async () => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    await Promise.resolve();
  };
  const redo = async () => {
    editor.dispatchCommand(REDO_COMMAND, undefined);
    await Promise.resolve();
  };

  return { store, stop, type, text, undo, redo };
};

describe("registerDocumentSync", () => {
  it("loads the store's Markdown into the editor as formatted text", () => {
    const { text } = setup("# Launch plan\n\nShip on **Friday**.");

    expect(text()).toBe("Launch plan\n\nShip on Friday.");
  });

  it("writes what the user types to the store as Markdown", () => {
    const { store, type } = setup("# Launch plan");

    type("Ship on Friday.");

    expect(store.getState().content).toBe("# Launch plan\n\nShip on Friday.");
  });

  it("shows an assistant edit in the editor and keeps the Markdown it wrote", () => {
    const { store, text } = setup("Ship on Friday.");

    store.getState().setContent("* Ship on *Monday*.");

    expect(text()).toBe("Ship on Monday.");
    expect(store.getState().content).toBe("* Ship on *Monday*.");
  });

  it("undoes and redoes each assistant edit as one step, without losing what was typed", async () => {
    const { store, type, text, undo, redo } = setup("# Launch plan");
    type("Ship on Friday.");
    store.getState().edit("Friday", "Monday");
    store.getState().edit("Ship", "Launch");

    await undo();
    expect(store.getState().content).toBe("# Launch plan\n\nShip on Monday.");
    expect(text()).toBe("Launch plan\n\nShip on Monday.");

    await undo();
    expect(store.getState().content).toBe("# Launch plan\n\nShip on Friday.");

    await redo();
    expect(store.getState().content).toBe("# Launch plan\n\nShip on Monday.");

    await undo();
    await undo();
    expect(store.getState().content).toBe("# Launch plan");
  });

  it("does not undo past the document the editor opened with", async () => {
    const { store, text, undo } = setup("# Launch plan");

    await undo();

    expect(store.getState().content).toBe("# Launch plan");
    expect(text()).toBe("Launch plan");
  });

  it("stops syncing once unregistered", () => {
    const { store, stop, type, text } = setup("Draft");
    stop();

    type("More");
    expect(store.getState().content).toBe("Draft");

    store.getState().setContent("Final");
    expect(text()).toBe("Draft\n\nMore");
  });
});

describe("document Markdown", () => {
  it("round-trips the formatting the editor supports", () => {
    const markdown = [
      "# Launch plan",
      "## Goals",
      "Ship on **Friday** with *care*, ~~not Monday~~, and `tests`.",
      "> A quote",
      "- First\n- Second",
      "1. One\n2. Two",
      "See [the brief](https://example.com/brief).",
    ].join("\n\n");
    const editor = createEditor({ nodes: DOCUMENT_NODES });

    editor.update(() => $setMarkdown(markdown), { discrete: true });

    expect(editor.getEditorState().read($getMarkdown)).toBe(markdown);
  });
});
