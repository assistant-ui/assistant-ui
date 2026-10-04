import type { HistoryState } from "@lexical/react/LexicalHistoryPlugin";
import type { LexicalEditor } from "lexical";

export function seedDocumentHistory(
  editor: LexicalEditor,
  history: HistoryState,
) {
  if (history.current !== null) return;
  const editorState = editor.getEditorState();
  if (!editorState.isEmpty()) history.current = { editor, editorState };
}
