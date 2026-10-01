import { Thread } from "@assistant-ui/ui/components/assistant-ui/elements/thread.aui.tsx";
import { defineSections } from "../types";
import { SeededRuntime, SeededThread } from "../runtime";
import {
  ImportBranches,
  SCREENSHOT_IMAGE,
  type BranchItem,
} from "./_chat-helpers";

const LOG_FILE = `data:text/plain;base64,${btoa("FAIL src/composer.test.ts\n  draft is empty after switching threads\n")}`;

/**
 * A conversation with an image and a file attached to the first message, an
 * edited second question (two user branches) and a regenerated answer (two
 * assistant branches on the edited branch).
 */
export const THREAD_BRANCHES: readonly BranchItem[] = [
  {
    parentId: null,
    message: {
      id: "u1",
      role: "user",
      content: "The composer loses its draft when I switch threads. Why?",
      attachments: [
        {
          id: "att-shot",
          type: "image",
          name: "composer-regression.svg",
          contentType: "image/svg+xml",
          status: { type: "complete" },
          content: [{ type: "image", image: SCREENSHOT_IMAGE }],
        },
        {
          id: "att-log",
          type: "document",
          name: "vitest-run.log",
          contentType: "text/plain",
          status: { type: "complete" },
          content: [
            {
              type: "file",
              filename: "vitest-run.log",
              data: LOG_FILE,
              mimeType: "text/plain",
            },
          ],
        },
      ],
    },
  },
  {
    parentId: "u1",
    message: {
      id: "a1",
      role: "assistant",
      content:
        'The draft lives in **component state**, so it resets when `Thread` remounts for the new thread id.\n\n1. Switching threads changes the `key` on the thread root\n2. React drops the old composer and its state\n3. The new composer starts empty\n\n```ts\nconst draft = useState(""); // lost on remount\n```',
    },
  },
  {
    parentId: "a1",
    message: {
      id: "u2-original",
      role: "user",
      content: "Should drafts go into localStorage?",
    },
  },
  {
    parentId: "u2-original",
    message: {
      id: "a2-original",
      role: "assistant",
      content:
        "You can, but the webview's storage is per origin, so drafts leak between workspaces.",
    },
  },
  {
    parentId: "a1",
    message: {
      id: "u2-edited",
      role: "user",
      content: "Should drafts live in the runtime, keyed by thread id?",
    },
  },
  {
    parentId: "u2-edited",
    message: {
      id: "a2-first",
      role: "assistant",
      content: "Yes: the runtime outlives the thread view.",
    },
  },
  {
    parentId: "u2-edited",
    message: {
      id: "a2-regenerated",
      role: "assistant",
      content:
        "Yes. Keep a map from thread id to draft in the runtime, hydrate the composer when a thread becomes active, and delete the entry after a successful send. A reload restores it from `vscode.getState()`.",
    },
  },
];

export default defineSections([
  {
    id: "thread",
    title: "Thread",
    category: "chat",
    notes:
      "thread.aui.tsx with image and file attachments, an edited question (branch 2 of 2) and a regenerated answer (branch 2 of 2). Hover a message for its action bar.",
    render: () => (
      <SeededRuntime messages={[]}>
        <ImportBranches items={THREAD_BRANCHES} headId="a2-regenerated" />
        <div className="h-200">
          <Thread />
        </div>
      </SeededRuntime>
    ),
  },
  {
    id: "thread-welcome",
    title: "Thread (empty)",
    category: "chat",
    notes: "The kit Thread with no messages: its welcome screen and composer.",
    render: () => <SeededThread messages={[]} className="h-100" />,
  },
]);
