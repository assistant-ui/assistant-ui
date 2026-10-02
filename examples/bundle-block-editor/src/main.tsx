import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  createEmptyHistoryState,
  HistoryPlugin,
} from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $createHeadingNode, HeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  HISTORY_PUSH_TAG,
  REDO_COMMAND,
  UNDO_COMMAND,
  type LexicalEditor,
  type ParagraphNode,
} from "lexical";
import { PreviewChat } from "../../bundle-shared/chat";
import { seedDocumentHistory } from "./history";
import "./styles.css";

type DocumentBlock = { key: string; text: string; fingerprint: string };
type Proposal =
  | {
      kind: "rewrite";
      key: string;
      original: string;
      fingerprint: string;
      text: string;
    }
  | { kind: "append"; text: string };

const initialConfig = {
  namespace: "collaborative-bundle",
  nodes: [HeadingNode],
  theme: {
    paragraph: "editor-paragraph",
    heading: { h1: "editor-title", h2: "editor-heading" },
    text: { bold: "editor-bold", italic: "editor-italic" },
  },
  onError(error: Error) {
    throw error;
  },
  editorState() {
    const heading = $createHeadingNode("h1");
    heading.append($createTextNode("A calmer place to work"));
    const introduction = $createParagraphNode();
    introduction.append(
      $createTextNode(
        "Our team is building a focused workspace for people who write, research, and make decisions together. We are planning to bring notes, conversations, and useful references into one place in order to give every project a clear starting point.",
      ),
    );
    const subheading = $createHeadingNode("h2");
    subheading.append($createTextNode("What we want to learn"));
    const body = $createParagraphNode();
    body.append(
      $createTextNode(
        "Start with a small pilot of five teams. Ask each team to keep a shared project brief for two weeks, then review which questions the brief answered and where people still needed a conversation. Use those observations to decide what to build next.",
      ),
    );
    $getRoot().append(heading, introduction, subheading, body);
  },
};

function fingerprint(node: ParagraphNode) {
  return JSON.stringify({
    ...node.exportJSON(),
    children: node.getChildren().map((child) => child.exportJSON()),
  });
}

function readParagraphs(): DocumentBlock[] {
  return $getRoot()
    .getChildren()
    .filter($isParagraphNode)
    .map((node) => ({
      key: node.getKey(),
      text: node.getTextContent(),
      fingerprint: fingerprint(node),
    }))
    .filter((block) => block.text.trim().length > 0);
}

function concise(text: string) {
  return text
    .replace(/\bWe are planning to\b/g, "We will")
    .replace(/\bin order to\b/gi, "to")
    .replace(/\ba clear starting point\b/gi, "a starting point")
    .replace(/\bpeople who\b/gi, "people that")
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(" ");
}

function EditorBridge({
  editorRef,
  onDocumentChange,
}: {
  editorRef: { current: LexicalEditor | null };
  onDocumentChange: (blocks: DocumentBlock[], text: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editorRef.current = editor;
    editor
      .getEditorState()
      .read(() =>
        onDocumentChange(readParagraphs(), $getRoot().getTextContent()),
      );
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() =>
        onDocumentChange(readParagraphs(), $getRoot().getTextContent()),
      );
    });
    return () => {
      editorRef.current = null;
      unregister();
    };
  }, [editor, editorRef, onDocumentChange]);
  return null;
}

function DocumentHistory() {
  const [editor] = useLexicalComposerContext();
  const historyState = useMemo(createEmptyHistoryState, []);
  useEffect(() => {
    seedDocumentHistory(editor, historyState);
  }, [editor, historyState]);
  return <HistoryPlugin externalHistoryState={historyState} />;
}

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [formats, setFormats] = useState({ bold: false, italic: false });
  useEffect(() => {
    const unregisterFormats = editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          setFormats({
            bold: $isRangeSelection(selection) && selection.hasFormat("bold"),
            italic:
              $isRangeSelection(selection) && selection.hasFormat("italic"),
          });
        });
      },
    );
    const unregisterUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (value) => {
        setCanUndo(value);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    const unregisterRedo = editor.registerCommand(
      CAN_REDO_COMMAND,
      (value) => {
        setCanRedo(value);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    return () => {
      unregisterUndo();
      unregisterRedo();
      unregisterFormats();
    };
  }, [editor]);

  function setBlock(heading: boolean) {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () =>
          heading ? $createHeadingNode("h2") : $createParagraphNode(),
        );
      }
    });
    editor.focus();
  }

  return (
    <div
      className="editor-toolbar"
      role="group"
      aria-label="Document formatting"
    >
      <Button
        variant="outline"
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setBlock(false)}
      >
        Paragraph
      </Button>
      <Button
        variant="outline"
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setBlock(true)}
      >
        Heading
      </Button>
      <Button
        variant="outline"
        type="button"
        aria-label="Bold"
        aria-pressed={formats.bold}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        <strong>B</strong>
      </Button>
      <Button
        variant="outline"
        type="button"
        aria-label="Italic"
        aria-pressed={formats.italic}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        <em>I</em>
      </Button>
      <span className="toolbar-space" />
      <Button
        variant="outline"
        type="button"
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        Undo
      </Button>
      <Button
        variant="outline"
        type="button"
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        Redo
      </Button>
    </div>
  );
}

export default function App() {
  const editorRef = useRef<LexicalEditor | null>(null);
  const blocksRef = useRef<DocumentBlock[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [notice, setNotice] = useState(
    "Select a paragraph to revise it, or ask for a summary of the current draft.",
  );
  const [pending, setPending] = useState(false);
  const reviewRef = useRef<HTMLElement | null>(null);
  const handleDocumentChange = useCallback(
    (blocks: DocumentBlock[], text: string) => {
      blocksRef.current = blocks;
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    },
    [],
  );

  function selectedParagraph(): DocumentBlock | undefined {
    let selected: DocumentBlock | undefined;
    editorRef.current?.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const node = selection.anchor.getNode();
      const block = node.getTopLevelElement();
      if (block && $isParagraphNode(block)) {
        selected = {
          key: block.getKey(),
          text: block.getTextContent(),
          fingerprint: fingerprint(block),
        };
      }
    });
    return selected;
  }

  async function assist(prompt: string, signal?: AbortSignal) {
    setPending(true);
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 450);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new DOMException("The request was stopped.", "AbortError"));
          },
          { once: true },
        );
      });
      if (signal?.aborted)
        throw new DOMException("The request was stopped.", "AbortError");
      const normalized = prompt.toLowerCase();
      if (/summary|summarize|summarise|about/.test(normalized)) {
        const summary = blocksRef.current
          .map((block) => block.text.split(/(?<=[.!?])\s+/)[0])
          .filter(Boolean)
          .join(" ");
        return summary.length > 0
          ? `Here is a summary of your current draft:\n\n${summary}\n\nThis is a local extraction of the first sentence in each paragraph. Your document has not changed.`
          : "Write a paragraph in the document first, then ask me to summarize it.";
      }
      if (/next|append|add/.test(normalized)) {
        setProposal({
          kind: "append",
          text: "Next steps: choose a pilot owner, invite the five teams, and schedule a review after two weeks. Capture questions as they come up so the review reflects how people actually work.",
        });
        setNotice(
          "A new paragraph is ready to review. Apply it to the end of the draft.",
        );
        return "I prepared a next-steps paragraph for this sample project. Review it below the document, then choose Apply suggestion. Existing blocks will stay in place.";
      }
      if (/short|rewrite|revise|concise|tighten/.test(normalized)) {
        const block = selectedParagraph();
        if (!block) {
          const message = "Select a paragraph in the document to revise it.";
          setNotice(message);
          return message;
        }
        const text = concise(block.text);
        if (text === block.text) {
          return "The selected paragraph is already concise under the local demo rules. Try the opening paragraph, or add a third sentence and ask again. No changes were made.";
        }
        setProposal({
          kind: "rewrite",
          key: block.key,
          original: block.text,
          fingerprint: block.fingerprint,
          text,
        });
        setNotice(
          "A revision is ready to review. It only applies if the source paragraph is still unchanged.",
        );
        return "I prepared a shorter version of the selected paragraph using local text rules. Review the suggestion below the document before applying it. You can keep editing while you review.";
      }
      return "I can shorten the selected paragraph, add next steps for the sample project, or summarize the draft as it is now. These actions run locally; arbitrary instructions need a connected model.";
    } finally {
      setPending(false);
    }
  }

  function applyProposal() {
    const editor = editorRef.current;
    if (!editor || !proposal) return;
    let applied = false;
    editor.update(
      () => {
        if (proposal.kind === "append") {
          $getRoot().append(
            $createParagraphNode().append($createTextNode(proposal.text)),
          );
          applied = true;
        } else {
          const node = $getNodeByKey(proposal.key);
          if (
            $isParagraphNode(node) &&
            fingerprint(node) === proposal.fingerprint
          ) {
            node.clear().append($createTextNode(proposal.text));
            applied = true;
          }
        }
      },
      { tag: HISTORY_PUSH_TAG, discrete: true },
    );
    if (applied) {
      setProposal(null);
      setNotice("Suggestion applied. Undo restores the previous draft.");
      editor.focus();
    } else {
      setProposal(null);
      setNotice(
        "That paragraph changed while you were reviewing. Your edits are preserved. Request a fresh revision.",
      );
    }
  }

  useEffect(() => {
    if (proposal)
      reviewRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
  }, [proposal]);

  return (
    <div className="block-editor-app">
      <header className="block-editor-header">
        <div>
          <p className="editor-eyebrow">Collaborative editor</p>
          <h1>Write together, block by block.</h1>
        </div>
        <span className="editor-mode">Local demo</span>
      </header>
      <p className="editor-description">
        Edit the draft directly. Ask the assistant for a revision, then review
        the change before it becomes part of your document.
      </p>
      <div className="block-editor-layout">
        <section className="document-area" aria-label="Shared document">
          <LexicalComposer initialConfig={initialConfig}>
            <div className="document-topline">
              <span>Project brief</span>
              <span>{wordCount} words</span>
            </div>
            <Toolbar />
            <div className="editor-paper">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    className="editor-content"
                    aria-label="Project brief, editable document"
                  />
                }
                placeholder={
                  <div className="editor-placeholder">Start your draft…</div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
            </div>
            <DocumentHistory />
            <EditorBridge
              editorRef={editorRef}
              onDocumentChange={handleDocumentChange}
            />
          </LexicalComposer>
          <section
            className="editor-review"
            ref={reviewRef}
            aria-label="Suggested change"
          >
            {proposal && (
              <>
                <div className="review-heading">
                  <h2>
                    {proposal.kind === "rewrite"
                      ? "Suggested revision"
                      : "Suggested addition"}
                  </h2>
                  <span>Review before applying</span>
                </div>
                {proposal.kind === "rewrite" && (
                  <details>
                    <summary>Original paragraph</summary>
                    <p className="review-original">{proposal.original}</p>
                  </details>
                )}
                <p className="review-text">{proposal.text}</p>
                <div className="review-actions">
                  <Button
                    variant="outline"
                    type="button"
                    className="review-apply"
                    onClick={applyProposal}
                  >
                    Apply suggestion
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setProposal(null);
                      setNotice(
                        "Suggestion dismissed. Your draft is unchanged.",
                      );
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </>
            )}
            <p className="editor-notice" role="status">
              {notice}
            </p>
          </section>
        </section>
        <aside className="editor-assistant" aria-label="Document assistant">
          <PreviewChat
            title="Writing assistant"
            intro="Revise or summarize the draft."
            suggestions={[
              "Shorten the selected paragraph",
              "Add next steps",
              "Summarize this draft",
            ]}
            onPrompt={(prompt, signal) => assist(prompt, signal)}
          />
          <div className="editor-quick-actions" aria-label="Document actions">
            <Button
              variant="outline"
              type="button"
              disabled={pending}
              onClick={() => void assist("Shorten the selected paragraph")}
            >
              Shorten paragraph
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={pending}
              onClick={() => void assist("Add next steps")}
            >
              Add next steps
            </Button>
          </div>
          <p className="editor-assistant-note">
            Suggestions are proposals. Human edits take precedence when a
            paragraph changes.
          </p>
        </aside>
      </div>
    </div>
  );
}
