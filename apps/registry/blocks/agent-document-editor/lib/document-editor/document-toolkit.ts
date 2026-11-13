import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";
import type { DocumentStore } from "./document-store";

/**
 * The tools the assistant edits the document with. They run in the browser
 * against the store, so the document never leaves the page except as tool
 * results in the conversation.
 */
export function createDocumentToolkit(store: DocumentStore) {
  return defineToolkit({
    read_document: {
      type: "frontend",
      description:
        "Read the document the user is editing: its Markdown content and the text the user has selected, if any.",
      parameters: z.object({}),
      execute: async () => {
        const { content, selection } = store.getState();
        return { content, selection };
      },
      renderText: {
        running: "Reading the document",
        complete: "Read the document",
      },
    },
    edit_document: {
      type: "frontend",
      description:
        "Replace one passage of the document. find must match exactly one place in the current content.",
      parameters: z.object({
        find: z
          .string()
          .describe("The exact text to replace, copied from the document."),
        replace: z.string().describe("The text to put in its place."),
      }),
      execute: async ({ find, replace }) =>
        store.getState().edit(find, replace),
      renderText: {
        running: "Editing the document",
        complete: ({ result }) =>
          result?.ok === false ? "Edit did not apply" : "Edited the document",
      },
    },
    write_document: {
      type: "frontend",
      description:
        "Replace the whole document. Use it for a first draft or a full restructure.",
      parameters: z.object({
        content: z.string().describe("The full document, in Markdown."),
      }),
      execute: async ({ content }) => {
        store.getState().setContent(content);
        return { ok: true };
      },
      renderText: {
        running: "Writing the document",
        complete: "Wrote the document",
      },
    },
  });
}
