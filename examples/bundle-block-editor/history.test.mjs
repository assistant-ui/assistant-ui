import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(directory, "package.json"));
const lexicalRequire = createRequire(
  require.resolve("@lexical/react/LexicalHistoryPlugin"),
);
const { build } = require("esbuild");

test("first accepted suggestion is undoable and later human edits retain history", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "editor-history-contract-"));
  try {
    const outfile = join(scratch, "history.mjs");
    await build({
      stdin: {
        contents: `
          import assert from "node:assert/strict";
          import {$createParagraphNode, $createTextNode, $getRoot, createEditor, HISTORY_PUSH_TAG, REDO_COMMAND, UNDO_COMMAND} from "lexical";
          import {createEmptyHistoryState, registerHistory} from ${JSON.stringify(lexicalRequire.resolve("@lexical/history"))};
          import {seedDocumentHistory} from ${JSON.stringify(join(directory, "src/history.ts"))};
          const make = (seed) => {
            const editor = createEditor({onError: (error) => {throw error;}});
            editor.update(() => $getRoot().append($createParagraphNode().append($createTextNode("Initial draft"))), {discrete:true});
            const history = createEmptyHistoryState();
            if (seed) seedDocumentHistory(editor, history);
            const unregister = registerHistory(editor, history, 1000);
            return {editor, history, unregister};
          };
          const text = (editor) => editor.getEditorState().read(() => $getRoot().getTextContent());
          const append = (editor, value) => editor.update(() => $getRoot().append($createParagraphNode().append($createTextNode(value))), {tag:HISTORY_PUSH_TAG,discrete:true});
          const command = async (editor, command) => {editor.dispatchCommand(command, undefined); await new Promise(setImmediate);};
          const unseeded = make(false);
          append(unseeded.editor, "Assistant suggestion");
          assert.equal(unseeded.history.undoStack.length, 0, "reproduction: the initial draft is missing from unseeded history");
          unseeded.unregister();
          const {editor, history, unregister} = make(true);
          append(editor, "Assistant suggestion");
          assert.equal(history.undoStack.length, 1);
          await command(editor, UNDO_COMMAND);
          assert.equal(text(editor), "Initial draft");
          seedDocumentHistory(editor, history);
          assert.equal(history.redoStack.length, 1, "re-seeding must preserve existing redo history");
          await command(editor, REDO_COMMAND);
          assert.equal(text(editor), "Initial draft\\n\\nAssistant suggestion");
          await command(editor, UNDO_COMMAND);
          append(editor, "Human edit");
          assert.equal(history.redoStack.length, 0, "a human edit replaces the undone branch");
          await command(editor, UNDO_COMMAND);
          assert.equal(text(editor), "Initial draft");
          await command(editor, REDO_COMMAND);
          assert.equal(text(editor), "Initial draft\\n\\nHuman edit");
          unregister();
        `,
        resolveDir: directory,
        loader: "ts",
      },
      outfile,
      bundle: true,
      platform: "node",
      format: "esm",
      alias: { lexical: require.resolve("lexical") },
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "silent",
    });
    assert.equal(
      execFileSync(process.execPath, [outfile], {
        encoding: "utf8",
        timeout: 10_000,
      }),
      "",
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
