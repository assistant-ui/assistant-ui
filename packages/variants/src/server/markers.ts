import { tokenize, type Token } from "./tokens";

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
  "y",
);

export const formatMarker = (id: string, ts: string, payload: NotePayload) =>
  `{/* ${MARKER_TAG} id="${id}" ts="${ts}" text="${encodePayload(payload)}" */}`;

type Marker = {
  id: string;
  ts: string;
  text: string;
  /** Offset of the marker's `{`. */
  start: number;
  /** Offset just after the marker's `}`. */
  end: number;
};

/** Markers that are real JSX comments, never look-alikes in strings or code fences. */
const findMarkers = (tokens: Token[], source: string): Marker[] => {
  const markers: Marker[] = [];
  for (const token of tokens) {
    if (token.kind !== "comment") continue;
    MARKER.lastIndex = token.start - 1;
    const match = MARKER.exec(source);
    if (!match) continue;
    markers.push({
      id: match[1]!,
      ts: match[2]!,
      text: match[3]!,
      start: match.index,
      end: MARKER.lastIndex,
    });
  }
  return markers;
};

/** Every `<Variants>` and `<Variant>` opening tag, with each variant's group. */
const tagsOf = (tokens: Token[]): Tag[] => {
  const tags: Tag[] = [];
  const stack: (string | undefined)[] = [];
  for (const token of tokens) {
    if (token.kind === "comment") continue;
    if (token.name !== "Variants" && token.name !== "Variant") continue;
    const kind = token.name === "Variants" ? "group" : "variant";
    if (token.kind === "close") {
      if (kind === "group") stack.pop();
      continue;
    }
    tags.push({
      kind,
      id: token.id,
      start: token.start,
      end: token.end,
      selfClosing: token.selfClosing,
      group: kind === "variant" ? stack[stack.length - 1] : undefined,
    });
    if (kind === "group" && !token.selfClosing) stack.push(token.id);
  }
  return tags;
};

export const scanTags = (source: string, mdx = false): Tag[] =>
  tagsOf(tokenize(source, mdx));

export const countGroups = (source: string, group: string, mdx = false) =>
  scanTags(source, mdx).filter(
    (tag) => tag.kind === "group" && tag.id === group,
  ).length;

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
  mdx = false,
): InsertResult => {
  const tags = scanTags(source, mdx);
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
export const deleteNote = (
  source: string,
  id: string,
  mdx = false,
): string | undefined => {
  const marker = findMarkers(tokenize(source, mdx), source).find(
    (item) => item.id === id,
  );
  if (!marker) return undefined;
  let start = marker.start;
  while (start > 0 && (source[start - 1] === " " || source[start - 1] === "\t"))
    start--;
  if (source[start - 1] === "\n") start--;
  return source.slice(0, start) + source.slice(marker.end);
};

/** Notes in `source`, attributed to the `<Variant>` or `<Variants>` they sit in. */
export const listNotes = (source: string, mdx = false): SourceNote[] => {
  const tokens = tokenize(source, mdx);
  const tags = tagsOf(tokens);
  const notes: SourceNote[] = [];
  for (const marker of findMarkers(tokens, source)) {
    const payload = decodePayload(marker.text);
    if (!payload) continue;
    const owner = [...tags]
      .reverse()
      .find((tag) => tag.end <= marker.start && !tag.selfClosing);
    if (!owner || owner.id === undefined) continue;
    notes.push({
      ...payload,
      id: marker.id,
      ts: marker.ts,
      group: owner.kind === "group" ? owner.id : (owner.group ?? ""),
      variant: owner.kind === "variant" ? owner.id : undefined,
      line: lineOf(source, marker.start),
    });
  }
  return notes;
};
