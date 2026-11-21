import { blockToMarkdown, isListType, plainText } from "./blocks";
import { documentSchema, type DocumentState } from "./document-state";

const PREFIX = "#doc=";

const toBase64Url = (text: string) => {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
};

const fromBase64Url = (packed: string) => {
  const binary = atob(packed.replaceAll("-", "+").replaceAll("_", "/"));
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
};

/**
 * A link to `page` that carries the whole document. It travels in the
 * fragment, the part of an address a browser keeps to itself, so the document
 * reaches whoever opens the link and no server on the way.
 */
export function shareLink(document: DocumentState, page: string) {
  const url = new URL(page);
  url.hash = `${PREFIX.slice(1)}${toBase64Url(JSON.stringify(document))}`;
  return url.toString();
}

/** The document in a share link's fragment, when it holds an intact one. */
export function readShareLink(hash: string): DocumentState | undefined {
  if (!hash.startsWith(PREFIX)) return undefined;
  try {
    const parsed = documentSchema.safeParse(
      JSON.parse(fromBase64Url(hash.slice(PREFIX.length))),
    );
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/** The document as Markdown, under its title unless it opens with that title. */
export function documentToMarkdown(document: DocumentState) {
  const title = document.title.trim();
  const first = document.blocks[0];
  const opensWithTitle =
    first?.type === "h1" && plainText(first.text).trim() === title;
  let markdown = title && !opensWithTitle ? `# ${title}` : "";
  document.blocks.forEach((block, index) => {
    const previous = document.blocks[index - 1];
    const sameList = isListType(block.type) && previous?.type === block.type;
    if (markdown) markdown += sameList ? "\n" : "\n\n";
    markdown +=
      block.type === "quote"
        ? block.text
            .split("\n")
            .map((line) => (line ? `> ${line}` : ">"))
            .join("\n")
        : blockToMarkdown(block);
  });
  return `${markdown}\n`;
}

export const markdownFileName = (document: DocumentState) => {
  const name = document.title
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Mark}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return `${name || "document"}.md`;
};
