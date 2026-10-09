export const MARKER_TAG = "@variants-note";

export type NotePayload = { note: string; hint?: string | undefined };

export type SourceNote = NotePayload & {
  id: string;
  ts: string;
  group: string;
  /** Unset for a note on the whole group. */
  variant: string | undefined;
  line: number;
};

type Tag = {
  kind: "group" | "variant";
  id: string | undefined;
  start: number;
  /** Offset just after the opening tag's `>`. */
  end: number;
  selfClosing: boolean;
  /** For a variant, the id of the group it belongs to. */
  group: string | undefined;
};

export const encodePayload = (payload: NotePayload): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

export const decodePayload = (value: string): NotePayload | undefined => {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as NotePayload).note !== "string"
    )
      return undefined;
    const { note, hint } = parsed as NotePayload;
    return typeof hint === "string" ? { note, hint } : { note };
  } catch {
    return undefined;
  }
};

export const newNoteId = () =>
  `n-${Array.from(crypto.getRandomValues(new Uint8Array(4)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;

const MARKER = new RegExp(
  `\\{/\\* ${MARKER_TAG} id="(n-[0-9a-f]{8})" ts="([^"]*)" text="([A-Za-z0-9_-]*)" \\*/\\}`,
  "g",
);

export const formatMarker = (id: string, ts: string, payload: NotePayload) =>
  `{/* ${MARKER_TAG} id="${id}" ts="${ts}" text="${encodePayload(payload)}" */}`;

/** Skips a quoted string or template literal starting at `index`. */
const skipString = (source: string, index: number): number => {
  const quote = source[index];
  let cursor = index + 1;
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === "\\") {
      cursor += 2;
      continue;
    }
    if (quote === "`" && char === "$" && source[cursor + 1] === "{") {
      cursor = skipBraces(source, cursor + 1);
      continue;
    }
    if (char === quote) return cursor + 1;
    cursor++;
  }
  return cursor;
};

/** Skips a balanced `{…}` starting at `index`, honouring strings inside. */
const skipBraces = (source: string, index: number): number => {
  let depth = 0;
  let cursor = index;
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === '"' || char === "'" || char === "`") {
      cursor = skipString(source, cursor);
      continue;
    }
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return cursor + 1;
    }
    cursor++;
  }
  return cursor;
};

/** Reads a JSX opening tag that starts at `start` (the `<`). */
const readOpeningTag = (source: string, start: number) => {
  let cursor = start + 1;
  let id: string | undefined;
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === '"' || char === "'") {
      cursor = skipString(source, cursor);
      continue;
    }
    if (char === "{") {
      cursor = skipBraces(source, cursor);
      continue;
    }
    if (char === ">") {
      const selfClosing = source[cursor - 1] === "/";
      return { end: cursor + 1, selfClosing, id };
    }
    ID.lastIndex = cursor;
    const found = id === undefined ? ID.exec(source) : null;
    if (found) {
      id = found[1] ?? found[2] ?? found[3];
      cursor = ID.lastIndex;
      continue;
    }
    cursor++;
  }
  return undefined;
};

const ID = /\sid\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*["'`]([^"'`$]*)["'`]\s*\})/y;

/** Every `<Variants>` and `<Variant>` opening tag, with each variant's group. */
export const scanTags = (source: string): Tag[] => {
  const tags: Tag[] = [];
  const stack: (string | undefined)[] = [];
  const pattern = /<(\/?)(Variants?)(?=[\s/>])/g;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    const closing = match[1] === "/";
    const kind = match[2] === "Variants" ? "group" : "variant";
    if (closing) {
      if (kind === "group") stack.pop();
      continue;
    }
    const tag = readOpeningTag(source, match.index);
    if (!tag) break;
    const { id } = tag;
    tags.push({
      kind,
      id,
      start: match.index,
      end: tag.end,
      selfClosing: tag.selfClosing,
      group: kind === "variant" ? stack[stack.length - 1] : undefined,
    });
    if (kind === "group" && !tag.selfClosing) stack.push(id);
    pattern.lastIndex = tag.end;
  }
  return tags;
};

export const countGroups = (source: string, group: string) =>
  scanTags(source).filter((tag) => tag.kind === "group" && tag.id === group)
    .length;

const lineOf = (source: string, offset: number) =>
  source.slice(0, offset).split("\n").length;

const indentAt = (source: string, offset: number) => {
  const lineStart = source.lastIndexOf("\n", offset - 1) + 1;
  return /^[ \t]*/.exec(source.slice(lineStart))?.[0] ?? "";
};

export type InsertResult =
  | { ok: true; source: string; id: string; line: number }
  | { ok: false; status: number; error: string };

/**
 * Inserts a note marker as the first child of `<Variant id=variant>` (or of
 * `<Variants id=group>` for a group note). A self-closing `<Variant />`
 * gains a closing tag so the marker has somewhere to go.
 */
export const insertNote = (
  source: string,
  target: { group: string; variant?: string | undefined },
  payload: NotePayload,
  stamp: { id: string; ts: string } = {
    id: newNoteId(),
    ts: new Date().toISOString(),
  },
): InsertResult => {
  const tags = scanTags(source);
  const groups = tags.filter(
    (tag) => tag.kind === "group" && tag.id === target.group,
  );
  if (groups.length !== 1)
    return {
      ok: false,
      status: groups.length ? 409 : 404,
      error: groups.length
        ? `<Variants id="${target.group}"> appears ${groups.length} times in one file`
        : `<Variants id="${target.group}"> not found`,
    };
  const tag =
    target.variant === undefined
      ? groups[0]!
      : tags.find(
          (item) =>
            item.kind === "variant" &&
            item.group === target.group &&
            item.id === target.variant,
        );
  if (!tag)
    return {
      ok: false,
      status: 404,
      error: `<Variant id="${target.variant}"> not found in group "${target.group}"`,
    };
  if (tag.selfClosing && tag.kind === "group")
    return {
      ok: false,
      status: 422,
      error: "self-closing <Variants> has no children",
    };
  const marker = formatMarker(stamp.id, stamp.ts, payload);
  const indent = indentAt(source, tag.start);
  let next: string;
  let markerOffset: number;
  if (tag.selfClosing) {
    const slash = source.lastIndexOf("/", tag.end - 1);
    const open = `${source.slice(tag.start, slash).trimEnd()}>`;
    const inner = `\n${indent}  `;
    const replacement = `${open}${inner}${marker}\n${indent}</Variant>`;
    next = source.slice(0, tag.start) + replacement + source.slice(tag.end);
    markerOffset = tag.start + open.length + inner.length;
  } else {
    const inner = `\n${indent}  `;
    next = source.slice(0, tag.end) + inner + marker + source.slice(tag.end);
    markerOffset = tag.end + inner.length;
  }
  return {
    ok: true,
    source: next,
    id: stamp.id,
    line: lineOf(next, markerOffset),
  };
};

/** Removes the marker with `id`, together with the line break it was inserted with. */
export const deleteNote = (source: string, id: string): string | undefined => {
  const pattern = new RegExp(
    `\\n?[ \\t]*\\{/\\* ${MARKER_TAG} id="${id.replace(/[^0-9a-z-]/gi, "")}" [^*]*\\*/\\}`,
  );
  const match = pattern.exec(source);
  if (!match) return undefined;
  return (
    source.slice(0, match.index) + source.slice(match.index + match[0].length)
  );
};

/** Notes in `source`, attributed to the `<Variant>` or `<Variants>` they sit in. */
export const listNotes = (source: string): SourceNote[] => {
  const tags = scanTags(source);
  const notes: SourceNote[] = [];
  for (const match of source.matchAll(MARKER)) {
    const payload = decodePayload(match[3]!);
    if (!payload) continue;
    const owner = [...tags]
      .reverse()
      .find((tag) => tag.end <= match.index! && !tag.selfClosing);
    if (!owner || owner.id === undefined) continue;
    notes.push({
      ...payload,
      id: match[1]!,
      ts: match[2]!,
      group: owner.kind === "group" ? owner.id : (owner.group ?? ""),
      variant: owner.kind === "variant" ? owner.id : undefined,
      line: lineOf(source, match.index!),
    });
  }
  return notes;
};
