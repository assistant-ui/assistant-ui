import {
  $getSelection,
  $isRangeSelection,
  HISTORIC_TAG,
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  SKIP_DOM_SELECTION_TAG,
  mergeRegister,
  type LexicalEditor,
} from "lexical";
import type { DocumentStore } from "./document-store";
import { $getMarkdown, $setMarkdown } from "./markdown";

const SYNC_TAG = "document-sync";

/**
 * Keeps a Lexical editor and the document store in step. What the user types
 * reaches the store as Markdown, and a change made in the store, such as an
 * assistant edit, is loaded into the editor as one undo step.
 */
export function registerDocumentSync(
  editor: LexicalEditor,
  store: DocumentStore,
): () => void {
  let synced = store.getState().content;

  const load = (content: string, historyTag: string) => {
    synced = content;
    editor.update(() => $setMarkdown(content), {
      discrete: true,
      // The assistant edits while the user is in the composer, so focus stays there.
      tag: [SYNC_TAG, historyTag, SKIP_DOM_SELECTION_TAG],
    });
  };

  load(synced, HISTORY_MERGE_TAG);

  return mergeRegister(
    editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves, tags }) => {
        editorState.read(() => {
          const selection = $getSelection();
          store
            .getState()
            .setSelection(
              $isRangeSelection(selection) ? selection.getTextContent() : "",
            );

          if (tags.has(SYNC_TAG)) return;
          const changed = dirtyElements.size > 0 || dirtyLeaves.size > 0;
          if (!changed && !tags.has(HISTORIC_TAG)) return;

          synced = $getMarkdown();
          store.getState().setContent(synced);
        });
      },
    ),
    store.subscribe(({ content }) => {
      if (content !== synced) load(content, HISTORY_PUSH_TAG);
    }),
  );
}
