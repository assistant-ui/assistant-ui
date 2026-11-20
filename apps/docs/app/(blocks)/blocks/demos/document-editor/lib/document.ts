import { useSyncExternalStore } from "react";
import { z } from "zod";
import data from "../data.json";

/* -------------------------------------------------------------------------- */
/* Blocks: the page as the assistant reads and writes it.                     */
/* -------------------------------------------------------------------------- */

export const BLOCK_TYPES = [
  "h1",
  "h2",
  "h3",
  "paragraph",
  "check",
  "bullet",
  "numbered",
  "quote",
  "divider",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export const isBlockType = (value: unknown): value is BlockType =>
  BLOCK_TYPES.includes(value as BlockType);

export const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: "Text",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  check: "Checklist",
  bullet: "Bulleted list",
  numbered: "Numbered list",
  quote: "Quote",
  divider: "Divider",
};

export const blockSchema = z.object({
  id: z.string().describe("Stable block id. Keep it when you edit a block."),
  type: z
    .enum(BLOCK_TYPES)
    .describe(
      "h1, h2 and h3 are headings. check, bullet and numbered are one list item each; neighbouring items of the same type form one list. divider is a horizontal rule and its text is empty.",
    ),
  text: z
    .string()
    .describe(
      "The block's text. Inline formatting only: **bold**, *italic*, ~~strikethrough~~, `code` and <u>underline</u>. Never block syntax such as #, - or >.",
    ),
  checked: z
    .boolean()
    .optional()
    .describe("Whether a check block is ticked. Leave it out on other types."),
});

export type Block = z.infer<typeof blockSchema>;

export const documentSchema = z.object({
  title: z.string().describe("The page's title."),
  blocks: z.array(blockSchema),
});

export type DocumentState = z.infer<typeof documentSchema>;

export const DOCUMENT_NAME = "document";
export const UPDATE_DOCUMENT_TOOL = `update_${DOCUMENT_NAME}`;

export const documentDescription = [
  "The page open in the user's editor, as a title and an ordered list of blocks.",
  "Edit it with update_document and change only what was asked for.",
  "blocks.update takes [{ id, text }], [{ id, type }] or [{ id, checked }] and rewrites those blocks in place; prefer it for any change to existing blocks.",
  "blocks.add appends new blocks at the end. blocks.remove takes block ids.",
  "blocks.set replaces the whole list and is the only way to insert a block between others or to reorder: repeat every block you keep with its id, and give each new block a new unique id.",
  "Edits appear in the editor as you write them, so do not repeat the new text in your reply.",
].join(" ");

export const commentSchema = z.object({
  id: z.string(),
  quote: z
    .string()
    .describe(
      "The exact passage of the page the comment is about, copied character for character without markdown markers. Keep it short.",
    ),
  author: z.enum(["you", "assistant"]).describe('"you" is the user.'),
  text: z.string().describe("The comment itself, in plain text."),
  resolved: z.boolean(),
  replyTo: z
    .string()
    .nullable()
    .describe("Id of the comment this one replies to, or null to start one."),
});

export type DocumentComment = z.infer<typeof commentSchema>;

export const commentsSchema = z.object({ comments: z.array(commentSchema) });

export type CommentsState = z.infer<typeof commentsSchema>;

export const COMMENTS_NAME = "comments";
export const UPDATE_COMMENTS_TOOL = `update_${COMMENTS_NAME}`;

export const commentsDescription = [
  "Comments attached to passages of the page, shown beside it.",
  "Use update_comments to leave feedback without changing the text.",
  'comments.add takes [{ quote, author: "assistant", text, resolved: false, replyTo: null }]; set replyTo to a comment id to answer it.',
  "comments.update takes [{ id, resolved: true }] to resolve a comment once it is dealt with. Never edit or remove the user's comments.",
].join(" ");

/** A block the assistant is still writing is known by its place in the list. */
export const STREAMING_ID = "streaming-";

export const normalizeBlock = (
  block: Partial<Block> | undefined,
  index: number,
): Block => {
  const type = block?.type;
  const checked = block?.checked;
  return {
    id: block?.id ?? `${STREAMING_ID}${index}`,
    type: isBlockType(type) ? type : "paragraph",
    text: block?.text ?? "",
    ...(typeof checked === "boolean" && { checked }),
  };
};

export const isListType = (type: BlockType) =>
  type === "bullet" || type === "numbered" || type === "check";

/* -------------------------------------------------------------------------- */
/* Inline text: the markdown-like marks inside one block.                     */
/* -------------------------------------------------------------------------- */

export type InlineRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
};

type Marks = Omit<InlineRun, "text" | "code">;

const FLAGS = ["bold", "italic", "underline", "strike", "code"] as const;

// Underline has no markdown syntax, so it uses the HTML a model already knows.
const WRAPPERS = [
  { open: "~~", close: "~~", mark: "strike" },
  { open: "<u>", close: "</u>", mark: "underline" },
] as const;

const ESCAPABLE = new Set(["\\", "*", "`", "~", "<"]);

const isSpace = (char: string | undefined) =>
  char === undefined || /\s/.test(char);

const countSingleStars = (source: string) => {
  let count = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "\\") i++;
    else if (char === "`") {
      const end = source.indexOf("`", i + 1);
      if (end !== -1) i = end;
    } else if (char === "*") {
      if (source[i + 1] === "*") i++;
      else count++;
    }
  }
  return count;
};

const findClosing = (source: string, from: number, marker: string) => {
  for (let i = from; i < source.length; i++) {
    const char = source[i];
    if (char === "\\") {
      i++;
      continue;
    }
    if (char === "`") {
      const end = source.indexOf("`", i + 1);
      if (end !== -1) i = end;
      continue;
    }
    if (char !== "*") continue;
    const closes = i > from && !isSpace(source[i - 1]);

    if (marker === "*") {
      if (closes) return i;
      if (source[i + 1] === "*") {
        const end = source.indexOf("**", i + 2);
        i = end === -1 ? i + 1 : end + 1;
      }
      continue;
    }

    if (!source.startsWith(marker, i)) continue;
    if (!closes) {
      i += marker.length - 1;
      continue;
    }
    const nestedItalicIsOpen =
      marker === "**" &&
      source[i + 2] === "*" &&
      countSingleStars(source.slice(from, i)) % 2 === 1;
    return nestedItalicIsOpen ? i + 1 : i;
  }
  return -1;
};

const findUnescaped = (source: string, marker: string, from: number) => {
  for (let i = from; i < source.length; i++) {
    if (source[i] === "\\" && ESCAPABLE.has(source[i + 1] ?? "")) i++;
    else if (source.startsWith(marker, i)) return i;
  }
  return -1;
};

const pushRun = (runs: InlineRun[], run: InlineRun) => {
  const last = runs[runs.length - 1];
  if (last && FLAGS.every((flag) => !!last[flag] === !!run[flag])) {
    last.text += run.text;
    return;
  }
  runs.push(run);
};

const parseInto = (source: string, marks: Marks, runs: InlineRun[]) => {
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    pushRun(runs, { ...marks, text: buffer });
    buffer = "";
  };

  let i = 0;
  while (i < source.length) {
    const char = source[i]!;
    const next = source[i + 1];

    if (char === "\\" && next !== undefined && ESCAPABLE.has(next)) {
      buffer += next;
      i += 2;
      continue;
    }

    if (char === "`") {
      const end = source.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        pushRun(runs, {
          ...marks,
          code: true,
          text: source.slice(i + 1, end),
        });
        i = end + 1;
        continue;
      }
    }

    const wrapper = WRAPPERS.find(
      ({ open, mark }) => !marks[mark] && source.startsWith(open, i),
    );
    if (wrapper) {
      const start = i + wrapper.open.length;
      const end = findUnescaped(source, wrapper.close, start);
      if (end > start) {
        flush();
        parseInto(
          source.slice(start, end),
          { ...marks, [wrapper.mark]: true },
          runs,
        );
        i = end + wrapper.close.length;
        continue;
      }
    }

    if (char === "*") {
      let matched = false;
      for (const marker of ["***", "**", "*"]) {
        if (!source.startsWith(marker, i)) continue;
        const start = i + marker.length;
        if (isSpace(source[start])) continue;
        const end = findClosing(source, start, marker);
        if (end === -1) continue;
        flush();
        parseInto(
          source.slice(start, end),
          {
            ...marks,
            ...(marker !== "*" && { bold: true }),
            ...(marker !== "**" && { italic: true }),
          },
          runs,
        );
        i = end + marker.length;
        matched = true;
        break;
      }
      if (matched) continue;
    }

    buffer += char;
    i++;
  }
  flush();
};

export function parseInline(source: string): InlineRun[] {
  const runs: InlineRun[] = [];
  parseInto(source, {}, runs);
  return runs;
}

const escapeText = (text: string) =>
  text.replace(/[\\*`]|~(?=~)|<(?=\/?u>)/g, "\\$&");

const serializeRun = (run: InlineRun) => {
  const [, lead = "", core = "", trail = ""] =
    /^(\s*)([\s\S]*?)(\s*)$/.exec(run.text) ?? [];
  if (!core) return run.text;

  let body = run.code && !core.includes("`") ? `\`${core}\`` : escapeText(core);
  // A tilde right before the closing `~~` would be read as part of it.
  if (run.strike && body.endsWith("~")) body = `${body.slice(0, -1)}\\~`;
  if (run.bold && run.italic) body = `***${body}***`;
  else if (run.bold) body = `**${body}**`;
  else if (run.italic) body = `*${body}*`;
  for (const { open, close, mark } of WRAPPERS) {
    if (run[mark]) body = `${open}${body}${close}`;
  }
  return lead + body + trail;
};

export const serializeInline = (runs: readonly InlineRun[]) =>
  runs.map(serializeRun).join("");

/** The runs between two offsets, counted in characters of plain text. */
export function sliceRuns(
  runs: readonly InlineRun[],
  from: number,
  to = Number.POSITIVE_INFINITY,
): InlineRun[] {
  const sliced: InlineRun[] = [];
  let offset = 0;
  for (const run of runs) {
    const start = Math.max(from - offset, 0);
    const end = Math.min(to - offset, run.text.length);
    if (start < end)
      pushRun(sliced, { ...run, text: run.text.slice(start, end) });
    offset += run.text.length;
    if (offset >= to) break;
  }
  return sliced;
}

export const plainText = (source: string) =>
  parseInline(source)
    .map((run) => run.text)
    .join("");

/* -------------------------------------------------------------------------- */
/* Markdown export.                                                           */
/* -------------------------------------------------------------------------- */

export function blockToMarkdown(block: Block, number = 1) {
  switch (block.type) {
    case "h1":
      return `# ${block.text}`;
    case "h2":
      return `## ${block.text}`;
    case "h3":
      return `### ${block.text}`;
    case "check":
      return `- [${block.checked ? "x" : " "}] ${block.text}`;
    case "bullet":
      return `- ${block.text}`;
    case "numbered":
      return `${number}. ${block.text}`;
    case "quote":
      return `> ${block.text}`;
    case "divider":
      return "---";
    case "paragraph":
      return block.text;
  }
}

/** The page as Markdown: the title as a heading, list items kept together. */
export function documentToMarkdown(title: string, blocks: readonly Block[]) {
  const lines = [`# ${title || "Untitled"}`];
  let previous: BlockType | undefined;
  let number = 0;
  for (const block of blocks) {
    number = block.type === "numbered" ? number + 1 : 0;
    const joinsList = isListType(block.type) && block.type === previous;
    lines.push(
      joinsList
        ? blockToMarkdown(block, number)
        : `\n${blockToMarkdown(block, number)}`,
    );
    previous = block.type;
  }
  return `${lines.join("\n")}\n`;
}

/** A file name that is safe on every system, from a page title. */
export const markdownFileName = (title: string) =>
  `${
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  }.md`;

/* -------------------------------------------------------------------------- */
/* Streaming: how the page shows an edit the assistant is still writing.      */
/*                                                                            */
/* A block being rewritten keeps its old text while the new text arrives, so  */
/* nothing half-written reaches the page. Once the new text is whole it is    */
/* typed in over the old. Blocks are typed one at a time, in order.           */
/* -------------------------------------------------------------------------- */

export type StreamEntry = {
  id: string;
  /** What the page showed before the assistant touched the block. */
  page: Block;
  /** The whole new version, while it is being typed over `page`. */
  next?: Block;
  /** The length of `next` in plain characters. */
  total: number;
  /** How many of those characters are typed so far. */
  typed: number;
  /** New content for the block is still arriving. */
  arriving: boolean;
  /** What has arrived so far already differs from what the page shows. */
  changing: boolean;
};

export type Stream = {
  entries: readonly StreamEntry[];
  /** Each block's text as last received, to tell which block is still arriving. */
  received: ReadonlyMap<string, string>;
  /** An edit is arriving from the assistant. */
  inFlight: boolean;
  /** An edit is arriving, or its typing has not finished. */
  active: boolean;
};

const entry = (page: Block): StreamEntry => ({
  id: page.id,
  page,
  total: 0,
  typed: 0,
  arriving: false,
  changing: false,
});

export const settled = (
  blocks: readonly (Partial<Block> | undefined)[],
): Stream => ({
  entries: blocks.map((block, index) => entry(normalizeBlock(block, index))),
  received: new Map(),
  inFlight: false,
  active: false,
});

const commonPrefix = (a: string, b: string) => {
  const length = Math.min(a.length, b.length);
  let index = 0;
  while (index < length && a[index] === b[index]) index++;
  return index;
};

const typeOver = (previous: StreamEntry, next: Block): StreamEntry => {
  const text = plainText(next.text);
  const base = plainText((previous.next ?? previous.page).text);
  const shared = commonPrefix(base, text);
  const typed = previous.next ? Math.min(previous.typed, shared) : shared;
  if (typed >= text.length) return entry(next);
  return {
    id: next.id,
    page: previous.page,
    next,
    total: text.length,
    typed,
    arriving: false,
    changing: false,
  };
};

const renamed = (item: StreamEntry, id: string): StreamEntry =>
  item.id === id
    ? item
    : {
        ...item,
        id,
        page: { ...item.page, id },
        ...(item.next && { next: { ...item.next, id } }),
      };

/** Takes the page as the assistant has written it so far. */
export function receive(
  stream: Stream,
  incoming: readonly (Partial<Block> | undefined)[],
  inFlight: boolean,
): Stream {
  if (!inFlight && !stream.active) return settled(incoming);

  const known = new Map(stream.entries.map((item) => [item.id, item]));
  const received = new Map<string, string>();
  const reached = new Set<string>();
  const entries: StreamEntry[] = [];

  incoming.forEach((raw, index) => {
    const placeholder = `${STREAMING_ID}${index}`;
    const found =
      known.get(raw?.id ?? placeholder) ??
      (raw?.id ? known.get(placeholder) : undefined);
    const previous = found && renamed(found, raw?.id ?? placeholder);

    if (raw?.text === undefined) {
      // Strings arrive a character at a time, so an id alone may be the start
      // of a longer one. A whole type after it means the id is whole too.
      if (!found || !previous || !raw?.id || !isBlockType(raw.type)) return;
      reached.add(found.id);
      entries.push({ ...previous, arriving: inFlight, changing: false });
      return;
    }

    const block = normalizeBlock(raw, index);
    received.set(block.id, block.text);
    const last =
      stream.received.get(block.id) ??
      (found ? stream.received.get(found.id) : undefined);
    const moved = last !== block.text;

    if (!found || !previous) {
      const arriving = inFlight && moved;
      const blank = { ...block, text: "" };
      entries.push(
        arriving
          ? { ...entry(blank), arriving, changing: true }
          : typeOver(entry(blank), block),
      );
      return;
    }

    reached.add(found.id);
    const goal = previous.next ?? previous.page;
    // Text that is so far the start of the old text may turn out to be the
    // old text again, which is what most of a replaced list is.
    const sameSoFar = goal.text.startsWith(block.text);
    if (
      goal.text === block.text &&
      goal.type === block.type &&
      !!goal.checked === !!block.checked
    ) {
      entries.push({ ...previous, arriving: false, changing: false });
    } else if (inFlight && (moved || sameSoFar)) {
      entries.push({ ...previous, arriving: true, changing: !sameSoFar });
    } else {
      entries.push(typeOver(previous, block));
    }
  });

  // A replaced list streams in from the top. The blocks it has not reached
  // yet stay on the page until the call ends and says which ones are gone.
  if (inFlight) {
    for (const item of stream.entries) {
      if (!reached.has(item.id)) entries.push(item);
    }
  }

  return {
    entries,
    received,
    inFlight,
    active: inFlight || entries.some((item) => item.next),
  };
}

/** Types up to `characters` more, finishing one block before the next. */
export function advance(stream: Stream, characters: number): Stream {
  let budget = characters;
  const entries = stream.entries.map((item) => {
    if (!item.next) return item;
    const typed = Math.min(item.total, item.typed + Math.max(budget, 0));
    budget -= typed - item.typed;
    return typed >= item.total ? entry(item.next) : { ...item, typed };
  });
  return {
    ...stream,
    entries,
    active: stream.inFlight || entries.some((item) => item.next),
  };
}

export const remaining = (stream: Stream) =>
  stream.entries.reduce(
    (sum, item) => sum + (item.next ? item.total - item.typed : 0),
    0,
  );

const typing = (stream: Stream) => stream.entries.find((item) => item.next);

/** The blocks to put on the page right now. */
export function displayBlocks(stream: Stream): Block[] {
  const current = typing(stream);
  return stream.entries.map((item) => {
    if (item !== current || !item.next) return item.page;
    return {
      ...item.next,
      id: item.id,
      text: serializeInline([
        ...sliceRuns(parseInline(item.next.text), 0, item.typed),
        ...sliceRuns(parseInline(item.page.text), item.typed),
      ]),
    };
  });
}

export type StreamMarks = {
  /** Blocks the assistant is changing that still show their old text. */
  working: string[];
  /** New blocks with nothing to show yet. */
  empty: string[];
  /** The block being typed, and how far the new text has got. */
  typing?: { id: string; typed: number };
};

/** What to paint over the blocks from `displayBlocks`. */
export function streamMarks(stream: Stream): StreamMarks {
  const current = typing(stream);
  const marks: StreamMarks = { working: [], empty: [] };
  for (const item of stream.entries) {
    if (item === current) marks.typing = { id: item.id, typed: item.typed };
    else if (item.next) marks.working.push(item.id);
    else if (item.arriving && !item.page.text) marks.empty.push(item.id);
    else if (item.arriving && item.changing) marks.working.push(item.id);
  }
  return marks;
}

/* -------------------------------------------------------------------------- */
/* Pages: a flat list that reads as a tree through `parentId`.                */
/* -------------------------------------------------------------------------- */

export type PageContent = {
  blocks: Block[];
  /**
   * The editor's own saved state, which also holds what blocks cannot say,
   * such as where a comment is anchored. `null` builds the page from `blocks`.
   */
  state: string | null;
};

export type Page = {
  id: string;
  parentId: string | null;
  title: string;
  icon?: string;
  content: PageContent;
};

export type PageTreeNode = { page: Page; depth: number };

export const emptyContent = (): PageContent => ({ blocks: [], state: null });

export const findPage = (pages: readonly Page[], id: string | null) =>
  pages.find((page) => page.id === id);

export const childPages = (pages: readonly Page[], parentId: string | null) =>
  pages.filter((page) => page.parentId === parentId);

/** Every page under `id`, at any depth. */
export function descendantIds(pages: readonly Page[], id: string): string[] {
  const found: string[] = [];
  const visit = (parentId: string) => {
    for (const child of childPages(pages, parentId)) {
      if (found.includes(child.id) || child.id === id) continue;
      found.push(child.id);
      visit(child.id);
    }
  };
  visit(id);
  return found;
}

/** The pages in reading order, each with how deep it sits. */
export function pageTree(pages: readonly Page[]): PageTreeNode[] {
  const nodes: PageTreeNode[] = [];
  const seen = new Set<string>();
  const visit = (parentId: string | null, depth: number) => {
    for (const page of childPages(pages, parentId)) {
      if (seen.has(page.id)) continue;
      seen.add(page.id);
      nodes.push({ page, depth });
      visit(page.id, depth + 1);
    }
  };
  visit(null, 0);
  // A page whose parent is gone still shows, at the top level.
  for (const page of pages) {
    if (!seen.has(page.id)) {
      seen.add(page.id);
      nodes.push({ page, depth: 0 });
      visit(page.id, 1);
    }
  }
  return nodes;
}

/** The pages above `id`, outermost first. */
export function pageAncestors(pages: readonly Page[], id: string): Page[] {
  const ancestors: Page[] = [];
  let current = findPage(pages, id);
  while (current?.parentId) {
    const parent = findPage(pages, current.parentId);
    if (!parent || ancestors.includes(parent)) break;
    ancestors.unshift(parent);
    current = parent;
  }
  return ancestors;
}

export const insertPage = (pages: readonly Page[], page: Page): Page[] => [
  ...pages,
  page,
];

/** Removes a page and everything under it. The last page is never removed. */
export function removePage(
  pages: readonly Page[],
  id: string,
): { pages: Page[]; removed: string[] } {
  if (!findPage(pages, id)) return { pages: [...pages], removed: [] };
  const removed = [id, ...descendantIds(pages, id)];
  const kept = pages.filter((page) => !removed.includes(page.id));
  if (kept.length === 0) return { pages: [...pages], removed: [] };
  return { pages: kept, removed };
}

/**
 * A copy of one page, placed right after it. Its subpages are not copied, and
 * neither are comment anchors, which belong to the original.
 */
export function duplicatePageIn(
  pages: readonly Page[],
  id: string,
  newId: string,
): Page[] {
  const index = pages.findIndex((page) => page.id === id);
  const source = pages[index];
  if (!source) return [...pages];
  const copy: Page = {
    ...source,
    id: newId,
    title: source.title ? `${source.title} copy` : "",
    content: {
      blocks: source.content.blocks.map((block, blockIndex) => ({
        ...block,
        id: `${newId}-${blockIndex}`,
      })),
      state: null,
    },
  };
  return [...pages.slice(0, index + 1), copy, ...pages.slice(index + 1)];
}

/* -------------------------------------------------------------------------- */
/* Comments.                                                                  */
/* -------------------------------------------------------------------------- */

export type CommentAuthor = "you" | "assistant";

export type CommentMessage = {
  id: string;
  author: CommentAuthor;
  text: string;
  createdAt: number;
};

export type CommentThread = {
  id: string;
  pageId: string;
  /** The passage the thread is about, as plain text. */
  quote: string;
  /** Id of the mark that highlights the passage in the editor. */
  markId: string;
  messages: CommentMessage[];
  resolved: boolean;
};

/** A page's threads as the flat list the assistant reads. */
export function threadsToComments(
  threads: readonly CommentThread[],
  pageId: string,
): DocumentComment[] {
  return threads
    .filter((thread) => thread.pageId === pageId)
    .flatMap((thread) =>
      thread.messages.map((message, index) => ({
        id: index === 0 ? thread.id : message.id,
        quote: thread.quote,
        author: message.author,
        text: message.text,
        resolved: thread.resolved,
        replyTo: index === 0 ? null : thread.id,
      })),
    );
}

export type CommentChanges = {
  /** Comments that start a thread on a passage. */
  started: DocumentComment[];
  /** Replies, with the thread each one belongs to. */
  replies: { threadId: string; comment: DocumentComment }[];
  /** Threads whose resolved state changed. */
  resolved: { threadId: string; resolved: boolean }[];
};

/**
 * What the assistant changed in the flat comment list, compared with the
 * threads the page already has. A comment still being written has no id yet
 * and is left for the next pass.
 */
export function commentChanges(
  threads: readonly CommentThread[],
  pageId: string,
  comments: readonly (Partial<DocumentComment> | undefined)[],
): CommentChanges {
  const known = threadsToComments(threads, pageId);
  const knownById = new Map(known.map((comment) => [comment.id, comment]));
  const threadOf = (id: string | null | undefined) => {
    if (!id) return undefined;
    const comment = knownById.get(id);
    return comment ? (comment.replyTo ?? comment.id) : undefined;
  };

  const changes: CommentChanges = { started: [], replies: [], resolved: [] };
  for (const raw of comments) {
    if (!raw?.id || typeof raw.text !== "string") continue;
    const existing = knownById.get(raw.id);
    if (existing) {
      const threadId = existing.replyTo ?? existing.id;
      if (
        typeof raw.resolved === "boolean" &&
        raw.resolved !== existing.resolved &&
        !changes.resolved.some((change) => change.threadId === threadId)
      ) {
        changes.resolved.push({ threadId, resolved: raw.resolved });
      }
      continue;
    }
    const comment: DocumentComment = {
      id: raw.id,
      quote: raw.quote ?? "",
      author: raw.author === "you" ? "you" : "assistant",
      text: raw.text,
      resolved: raw.resolved ?? false,
      replyTo: raw.replyTo ?? null,
    };
    const threadId = threadOf(comment.replyTo);
    if (threadId) changes.replies.push({ threadId, comment });
    else if (comment.quote) changes.started.push({ ...comment, replyTo: null });
  }
  return changes;
}

/* -------------------------------------------------------------------------- */
/* Starter content, from data.json.                                           */
/* -------------------------------------------------------------------------- */

type SeedBlock = { type: string; text: string; checked?: boolean | undefined };

export const seedBlocks = (
  blocks: readonly SeedBlock[],
  idPrefix: string,
): Block[] =>
  blocks.map((block, index) =>
    normalizeBlock(
      {
        id: `${idPrefix}-${index}`,
        text: block.text,
        checked: block.checked,
        ...(isBlockType(block.type) && { type: block.type }),
      },
      index,
    ),
  );

export type Template = {
  id: string;
  label: string;
  icon: string;
  color: string;
  title: string;
  blocks: Block[];
};

export const TEMPLATES: readonly Template[] = data.templates.map(
  (template) => ({
    ...template,
    blocks: seedBlocks(template.blocks, template.id),
  }),
);

export type DocumentStoreState = {
  pages: Page[];
  currentPageId: string;
  threads: CommentThread[];
  /** Whether comment highlights and their floating threads are shown. */
  commentsVisible: boolean;
  /** The thread whose card is open. Not saved. */
  activeThreadId: string | null;
  /**
   * Counts the times something asked for the assistant, such as the "/" menu.
   * The assistant bar opens and focuses its composer when it goes up. Not saved.
   */
  assistantRequests: number;
};

export const seedState = (): DocumentStoreState => {
  const pages: Page[] = data.pages.map((page) => ({
    id: page.id,
    parentId: page.parentId,
    title: page.title,
    icon: page.icon,
    content: { blocks: seedBlocks(page.blocks, page.id), state: null },
  }));
  return {
    pages,
    currentPageId: pages[0]?.id ?? "",
    threads: [],
    commentsVisible: true,
    activeThreadId: null,
    assistantRequests: 0,
  };
};

/* -------------------------------------------------------------------------- */
/* The store every piece of the block shares.                                 */
/* -------------------------------------------------------------------------- */

/** Bump the version when the saved shape changes; older saves are ignored. */
export const STORAGE_KEY = "aui-blocks:document-editor:v1";

const storedSchema = z.object({
  pages: z
    .array(
      z.object({
        id: z.string(),
        parentId: z.string().nullable(),
        title: z.string(),
        icon: z.string().optional(),
        content: z.object({
          blocks: z.array(blockSchema),
          state: z.string().nullable(),
        }),
      }),
    )
    .min(1),
  currentPageId: z.string(),
  threads: z.array(
    z.object({
      id: z.string(),
      pageId: z.string(),
      quote: z.string(),
      markId: z.string(),
      messages: z.array(
        z.object({
          id: z.string(),
          author: z.enum(["you", "assistant"]),
          text: z.string(),
          createdAt: z.number(),
        }),
      ),
      resolved: z.boolean(),
    }),
  ),
  commentsVisible: z.boolean(),
});

/** What was saved, or `undefined` when nothing usable was. */
export function readStored(
  saved: string | null,
): DocumentStoreState | undefined {
  if (!saved) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    return undefined;
  }
  const result = storedSchema.safeParse(parsed);
  if (!result.success) return undefined;
  const { currentPageId, threads, commentsVisible } = result.data;
  const pages: Page[] = result.data.pages.map(({ icon, ...page }) => ({
    ...page,
    ...(icon !== undefined && { icon }),
  }));
  return {
    pages,
    currentPageId: findPage(pages, currentPageId)
      ? currentPageId
      : pages[0]!.id,
    threads,
    commentsVisible,
    activeThreadId: null,
    assistantRequests: 0,
  };
}

const persistedChanged = (
  previous: DocumentStoreState,
  next: DocumentStoreState,
) =>
  next.pages !== previous.pages ||
  next.currentPageId !== previous.currentPageId ||
  next.threads !== previous.threads ||
  next.commentsVisible !== previous.commentsVisible;

const sameValue = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].every(
    (key) => sameValue(left[key], right[key]),
  );
};

/** `next`, with each item that did not change as the object `current` holds. */
const keepUnchanged = <T extends { id: string }>(
  current: T[],
  next: readonly T[],
): T[] => {
  const known = new Map(current.map((item) => [item.id, item]));
  const kept = next.map((item) => {
    const own = known.get(item.id);
    return own && sameValue(own, item) ? own : item;
  });
  return kept.length === current.length &&
    kept.every((item, index) => item === current[index])
    ? current
    : kept;
};

/** `state`, with one page's content and the threads on it as `source` has them. */
const withPageFrom = (
  state: DocumentStoreState,
  source: DocumentStoreState,
  pageId: string,
): DocumentStoreState => {
  const theirs = findPage(source.pages, pageId);
  if (!theirs || !findPage(state.pages, pageId)) return state;
  const onPage = (thread: CommentThread) => thread.pageId === pageId;
  return {
    ...state,
    pages: state.pages.map((page) =>
      page.id === pageId ? { ...page, content: theirs.content } : page,
    ),
    threads: [
      ...state.threads.filter((thread) => !onPage(thread)),
      ...source.threads.filter(onPage),
    ],
  };
};

const pageChanged = (
  previous: DocumentStoreState,
  next: DocumentStoreState,
  pageId: string,
) => {
  if (
    findPage(previous.pages, pageId)?.content !==
    findPage(next.pages, pageId)?.content
  )
    return true;
  if (previous.threads === next.threads) return false;
  const before = previous.threads.filter((item) => item.pageId === pageId);
  const after = next.threads.filter((item) => item.pageId === pageId);
  return (
    before.length !== after.length ||
    before.some((item, index) => item !== after[index])
  );
};

/**
 * This tab's state after another tab saved `stored`. The open page keeps its
 * content and its threads, which the mounted editor holds and would otherwise
 * contradict; the page that is open and the fields that are not saved stay
 * too. Returns `current` itself when the save changes nothing here.
 */
export function adoptStored(
  current: DocumentStoreState,
  stored: DocumentStoreState,
): DocumentStoreState {
  const merged = withPageFrom(stored, current, current.currentPageId);
  const pages = keepUnchanged(current.pages, merged.pages);
  const threads = keepUnchanged(current.threads, merged.threads);
  const { commentsVisible } = stored;
  const activeThreadId =
    commentsVisible &&
    threads.some((thread) => thread.id === current.activeThreadId)
      ? current.activeThreadId
      : null;
  const next: DocumentStoreState = {
    ...current,
    pages,
    currentPageId: findPage(pages, current.currentPageId)
      ? current.currentPageId
      : stored.currentPageId,
    threads,
    commentsVisible,
    activeThreadId,
  };
  return persistedChanged(current, next) ||
    activeThreadId !== current.activeThreadId
    ? next
    : current;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type SaveWatcher = (onSave: (saved: string | null) => void) => () => void;

export type DocumentStoreOptions = {
  /** Where the state is saved. `null` keeps it in memory only. */
  storage?: StorageLike | null;
  /**
   * Reports each save another tab writes, until the function it returns is
   * called. The default listens to the window when `storage` is the browser's.
   */
  watch?: SaveWatcher;
  seed?: () => DocumentStoreState;
  mintId?: () => string;
  now?: () => number;
};

const browserStorage = (): StorageLike | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

const watchBrowserStorage: SaveWatcher = (onSave) => {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.storageArea === browserStorage())
      onSave(event.newValue);
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
};

export const mintId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

export function createDocumentStore(options: DocumentStoreOptions = {}) {
  const seed = options.seed ?? seedState;
  const newId = options.mintId ?? mintId;
  const now = options.now ?? Date.now;
  const serverState = seed();
  const listeners = new Set<() => void>();
  let state: DocumentStoreState | undefined;
  let seen: string | null = null;
  // Another tab's save, kept while this tab's editor shows its own copy of the
  // open page: that tab's copy is the one saved until this tab changes the
  // page, and the one taken when this tab leaves it.
  let held: DocumentStoreState | undefined;
  let stopWatching: (() => void) | undefined;

  const storage = () =>
    options.storage === undefined ? browserStorage() : options.storage;
  const watch =
    options.watch ??
    (options.storage === undefined ? watchBrowserStorage : undefined);

  const read = () => {
    try {
      return storage()?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  };

  const save = (saving: DocumentStoreState) => {
    const { pages, currentPageId, threads, commentsVisible } = saving;
    const saved = JSON.stringify({
      pages,
      currentPageId,
      threads,
      commentsVisible,
    });
    try {
      storage()?.setItem(STORAGE_KEY, saved);
      seen = saved;
    } catch {
      // A full or blocked storage leaves the page working for this visit.
    }
  };

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const getState = (): DocumentStoreState => {
    if (!state) {
      seen = read();
      state = readStored(seen) ?? seed();
    }
    return state;
  };

  const setState = (
    update: (previous: DocumentStoreState) => DocumentStoreState,
  ) => {
    const previous = getState();
    let next = update(previous);
    if (next === previous) return;
    if (held) {
      const open = previous.currentPageId;
      if (pageChanged(previous, next, open)) {
        held = undefined;
      } else if (next.currentPageId !== open) {
        next = withPageFrom(next, held, open);
        held = undefined;
      }
    }
    state = next;
    if (persistedChanged(previous, next))
      save(held ? withPageFrom(next, held, next.currentPageId) : next);
    notify();
  };

  const adopt = (saved: string | null) => {
    const previous = getState();
    if (saved === seen) return;
    seen = saved;
    const stored = readStored(saved);
    if (!stored) return;
    held = stored;
    const next = adoptStored(previous, stored);
    if (next === previous) return;
    state = next;
    notify();
  };

  const patchPage = (id: string, patch: (page: Page) => Page) =>
    setState((previous) => {
      const page = findPage(previous.pages, id);
      if (!page) return previous;
      const next = patch(page);
      if (next === page) return previous;
      return {
        ...previous,
        pages: previous.pages.map((item) => (item === page ? next : item)),
      };
    });

  const patchThread = (
    id: string,
    patch: (thread: CommentThread) => CommentThread,
  ) =>
    setState((previous) => {
      const thread = previous.threads.find((item) => item.id === id);
      if (!thread) return previous;
      return {
        ...previous,
        threads: previous.threads.map((item) =>
          item === thread ? patch(thread) : item,
        ),
      };
    });

  const actions = {
    /** Adds an empty page, under `parentId` when given, and opens it. */
    addPage(parentId: string | null = null, title = ""): string {
      const id = newId();
      setState((previous) => ({
        ...previous,
        pages: insertPage(previous.pages, {
          id,
          parentId: findPage(previous.pages, parentId) ? parentId : null,
          title,
          content: emptyContent(),
        }),
        currentPageId: id,
        activeThreadId: null,
      }));
      return id;
    },

    renamePage(id: string, title: string) {
      patchPage(id, (page) =>
        page.title === title ? page : { ...page, title },
      );
    },

    /** Copies a page next to itself and opens the copy. */
    duplicatePage(id: string): string | undefined {
      if (!findPage(getState().pages, id)) return undefined;
      const copyId = newId();
      setState((previous) => ({
        ...previous,
        pages: duplicatePageIn(previous.pages, id, copyId),
        currentPageId: copyId,
        activeThreadId: null,
      }));
      return copyId;
    },

    /**
     * Deletes a page, its subpages and their comments. Returns false when it
     * is the last page, which stays.
     */
    deletePage(id: string): boolean {
      const before = getState();
      const { pages, removed } = removePage(before.pages, id);
      if (removed.length === 0) return false;
      const deleted = findPage(before.pages, id);
      setState((previous) => ({
        ...previous,
        pages,
        threads: previous.threads.filter(
          (thread) => !removed.includes(thread.pageId),
        ),
        currentPageId: removed.includes(previous.currentPageId)
          ? (findPage(pages, deleted?.parentId ?? null)?.id ?? pages[0]!.id)
          : previous.currentPageId,
        activeThreadId: null,
      }));
      return true;
    },

    selectPage(id: string) {
      setState((previous) =>
        previous.currentPageId === id || !findPage(previous.pages, id)
          ? previous
          : { ...previous, currentPageId: id, activeThreadId: null },
      );
    },

    setPageContent(id: string, content: PageContent) {
      patchPage(id, (page) => ({ ...page, content }));
    },

    /**
     * Starts a thread on a passage and opens its card. Without `text` the
     * thread is an empty draft, waiting for its first message. `markId`
     * defaults to the thread's id.
     */
    addThread(input: {
      pageId: string;
      quote: string;
      text?: string;
      author?: CommentAuthor;
      id?: string;
      markId?: string;
      /** Pass false to leave the card closed. */
      open?: boolean;
    }): string {
      const id = input.id ?? newId();
      const { text } = input;
      setState((previous) => ({
        ...previous,
        threads: [
          ...previous.threads,
          {
            id,
            pageId: input.pageId,
            quote: input.quote,
            markId: input.markId ?? id,
            messages: text
              ? [
                  {
                    id: newId(),
                    author: input.author ?? "you",
                    text,
                    createdAt: now(),
                  },
                ]
              : [],
            resolved: false,
          },
        ],
        activeThreadId: input.open === false ? previous.activeThreadId : id,
      }));
      return id;
    },

    addThreadMessage(
      threadId: string,
      message: { author: CommentAuthor; text: string; id?: string },
    ): string {
      const id = message.id ?? newId();
      patchThread(threadId, (thread) => ({
        ...thread,
        messages: [
          ...thread.messages,
          { id, author: message.author, text: message.text, createdAt: now() },
        ],
      }));
      return id;
    },

    resolveThread(threadId: string, resolved = true) {
      patchThread(threadId, (thread) => ({ ...thread, resolved }));
      if (resolved) actions.setActiveThread(null, threadId);
    },

    deleteThread(threadId: string) {
      setState((previous) => ({
        ...previous,
        threads: previous.threads.filter((thread) => thread.id !== threadId),
        activeThreadId:
          previous.activeThreadId === threadId ? null : previous.activeThreadId,
      }));
    },

    /** Opens a thread's card, or closes it. `onlyIf` closes just that one. */
    setActiveThread(id: string | null, onlyIf?: string) {
      setState((previous) =>
        previous.activeThreadId === id ||
        (onlyIf !== undefined && previous.activeThreadId !== onlyIf)
          ? previous
          : { ...previous, activeThreadId: id },
      );
    },

    setCommentsVisible(visible: boolean) {
      setState((previous) =>
        previous.commentsVisible === visible
          ? previous
          : {
              ...previous,
              commentsVisible: visible,
              activeThreadId: visible ? previous.activeThreadId : null,
            },
      );
    },

    toggleCommentsVisible() {
      actions.setCommentsVisible(!getState().commentsVisible);
    },

    /** Opens the assistant bar and puts the caret in its composer. */
    askAssistant() {
      setState((previous) => ({
        ...previous,
        assistantRequests: previous.assistantRequests + 1,
      }));
    },

    /** Puts back the starter pages and drops every comment. */
    reset() {
      setState(() => seed());
    },
  };

  return {
    getState,
    getServerState: () => serverState,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!stopWatching && watch) {
        stopWatching = watch(adopt);
        // A save written while nothing was listening raised no event here.
        adopt(read());
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        stopWatching?.();
        stopWatching = undefined;
      };
    },
    actions,
  };
}

export type DocumentStore = ReturnType<typeof createDocumentStore>;
export type DocumentActions = DocumentStore["actions"];

export const documentStore = createDocumentStore();
export const documentActions = documentStore.actions;

/**
 * Reads the store. The selector must return a value the store holds (a page,
 * the list of threads, a flag), never a new array or object, or the component
 * renders in a loop; derive those with `useMemo` from what it returns.
 */
export function useDocumentStore<T>(
  selector: (state: DocumentStoreState) => T,
): T {
  return useSyncExternalStore(
    documentStore.subscribe,
    () => selector(documentStore.getState()),
    () => selector(documentStore.getServerState()),
  );
}

export const selectCurrentPage = (state: DocumentStoreState): Page =>
  findPage(state.pages, state.currentPageId) ?? state.pages[0]!;

export const useCurrentPage = () => useDocumentStore(selectCurrentPage);

const subscribeToNothing = () => () => {};

/** False on the server and during hydration, when the saved pages are not read yet. */
export const useHydrated = () =>
  useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
