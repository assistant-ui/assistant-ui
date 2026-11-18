import {
  normalizeBlock,
  parseInline,
  plainText,
  serializeInline,
  sliceRuns,
  STREAMING_ID,
} from "./blocks";
import { isBlockType, type Block } from "./document-state";

/**
 * How the page shows an edit the assistant is streaming.
 *
 * A block the assistant is rewriting keeps its old text while the new text
 * arrives, so nothing half-written or half-formatted reaches the page. Once
 * the new text is whole it is typed in over the old, which stays behind the
 * caret until it is overwritten. Blocks are typed one at a time, in order.
 */

export type Entry = {
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
  entries: readonly Entry[];
  /** Each block's text as last received, to tell which block is still arriving. */
  received: ReadonlyMap<string, string>;
  /** An edit is arriving from the assistant. */
  inFlight: boolean;
  /** An edit is arriving, or its typing has not finished. */
  active: boolean;
};

const entry = (page: Block): Entry => ({
  id: page.id,
  page,
  total: 0,
  typed: 0,
  arriving: false,
  changing: false,
});

export const settled = (blocks: readonly Partial<Block>[]): Stream => ({
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

const typeOver = (previous: Entry, next: Block): Entry => {
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

// A block added by the assistant is known by its place in the list until the
// call ends and gives it an id.
const renamed = (item: Entry, id: string): Entry =>
  item.id === id
    ? item
    : {
        ...item,
        id,
        page: { ...item.page, id },
        ...(item.next && { next: { ...item.next, id } }),
      };

/** Takes the document as the assistant has written it so far. */
export function receive(
  stream: Stream,
  incoming: readonly Partial<Block>[],
  inFlight: boolean,
): Stream {
  if (!inFlight && !stream.active) return settled(incoming);

  const known = new Map(stream.entries.map((item) => [item.id, item]));
  const received = new Map<string, string>();
  const reached = new Set<string>();
  const entries: Entry[] = [];

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
    if (goal.text === block.text && goal.type === block.type) {
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
      id: item.id,
      type: item.next.type,
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
