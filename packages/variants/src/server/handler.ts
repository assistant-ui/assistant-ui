import { relative } from "node:path";
import { deleteNote, insertNote, listNotes, type SourceNote } from "./markers";
import { isMdx, locateGroup, sourceFiles, writeSource } from "./project";
import { readFile, realpath } from "node:fs/promises";

export const NOTES_HEADER = "x-variants";
const MAX_NOTE = 2000;
const MAX_HINT = 300;
const ID = /^[^\s:,"'<>{}`\\]{1,100}$/;

export type NotesRequest = {
  method: string;
  /** Path after the mount point, with the query string, e.g. `/notes?groups=a`. */
  path: string;
  header: (name: string) => string | null;
  json: () => Promise<unknown>;
};

export type NotesResponse = { status: number; body: unknown };

export type NotesOptions = {
  /** Directory scanned for `<Variants>` and the only place files are written. */
  root: string;
  /** Endpoints answer only in development. */
  dev: boolean;
};

const fail = (status: number, error: string): NotesResponse => ({
  status,
  body: { error },
});

export const MAX_BODY = 64 * 1024;

export class BodyTooLargeError extends Error {
  constructor() {
    super("request body too large");
  }
}

/** Decodes a JSON body, refusing it once more than `MAX_BODY` bytes arrive. */
export const readJsonBody = async (
  chunks: AsyncIterable<Uint8Array | string>,
): Promise<unknown> => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for await (const chunk of chunks) {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    size += bytes.byteLength;
    if (size > MAX_BODY) throw new BodyTooLargeError();
    text += decoder.decode(bytes, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
};

let writes: Promise<unknown> = Promise.resolve();

/** Runs source edits one at a time so concurrent saves cannot drop each other's markers. */
const serialized = <T>(task: () => Promise<T>): Promise<T> => {
  const run = writes.then(task, task);
  writes = run.catch(() => {});
  return run;
};

const firstToken = (value: string | null) =>
  value?.split(",", 1)[0]?.trim() || null;

/**
 * Accepts only same-origin requests that carry the custom header, so another
 * site cannot drive the endpoints from a user's browser.
 */
export const checkRequest = (
  request: NotesRequest,
  needsJson: boolean,
): NotesResponse | undefined => {
  if (request.header(NOTES_HEADER) !== "1")
    return fail(403, `missing ${NOTES_HEADER} header`);
  if (
    needsJson &&
    !request
      .header("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return fail(415, "content-type must be application/json");
  if (
    firstToken(request.header("sec-fetch-site"))?.toLowerCase() === "cross-site"
  )
    return fail(403, "cross-site request blocked");
  const origin = request.header("origin");
  if (origin === null) return undefined;
  if (origin.toLowerCase() === "null")
    return fail(403, "opaque origin is not allowed");
  let actual: string;
  try {
    actual = new URL(origin).host.toLowerCase();
  } catch {
    return fail(403, "invalid origin header");
  }
  const host =
    firstToken(request.header("x-forwarded-host")) ?? request.header("host");
  if (!host) return fail(400, "missing host header");
  if (actual !== host.toLowerCase()) return fail(403, "origin mismatch");
  return undefined;
};

type NoteBody = {
  group?: unknown;
  variant?: unknown;
  note?: unknown;
  hint?: unknown;
};

const publicNote = (root: string, file: string, note: SourceNote) => ({
  ...note,
  file: relative(root, file),
});

const parsePath = (path: string) => {
  try {
    return new URL(path, "http://local");
  } catch {
    return undefined;
  }
};

export const handleNotesRequest = async (
  request: NotesRequest,
  options: NotesOptions,
): Promise<NotesResponse> => {
  if (!options.dev) return fail(404, "not found");
  const method = request.method.toUpperCase();
  const mutation = method === "POST" || method === "DELETE";
  const rejected = checkRequest(request, method === "POST");
  if (rejected) return rejected;

  try {
    const url = parsePath(request.path);
    if (!url) return fail(400, "invalid path");
    const root = await realpath(options.root);
    if (method === "GET" && url.pathname === "/ping")
      return { status: 200, body: { ok: true, version: 1 } };

    if (method === "GET" && url.pathname === "/notes") {
      const groups = (url.searchParams.get("groups") ?? "")
        .split(",")
        .filter((group) => ID.test(group));
      const wanted = new Set(groups);
      const notes = [];
      for await (const file of sourceFiles(root)) {
        const source = await readFile(file, "utf8");
        if (!source.includes("@variants-note")) continue;
        for (const note of listNotes(source, isMdx(file)))
          if (wanted.has(note.group)) notes.push(publicNote(root, file, note));
      }
      return { status: 200, body: { notes } };
    }

    if (method === "POST" && url.pathname === "/notes") {
      const body = (await request.json()) as NoteBody;
      const { group, variant, note, hint } = body ?? {};
      if (typeof group !== "string" || !ID.test(group))
        return fail(400, "invalid group");
      if (
        variant !== undefined &&
        (typeof variant !== "string" || !ID.test(variant))
      )
        return fail(400, "invalid variant");
      if (typeof note !== "string" || !note.trim() || note.length > MAX_NOTE)
        return fail(400, "invalid note");
      if (
        hint !== undefined &&
        (typeof hint !== "string" || hint.length > MAX_HINT)
      )
        return fail(400, "invalid hint");
      return await serialized(async () => {
        const located = await locateGroup(root, group);
        if (!located.ok) return fail(located.status, located.error);
        const result = insertNote(
          located.source,
          { group, variant: variant as string | undefined },
          hint ? { note: note.trim(), hint } : { note: note.trim() },
          undefined,
          located.mdx,
        );
        if (!result.ok) return fail(result.status, result.error);
        await writeSource(root, located.file, result.source);
        return {
          status: 201,
          body: {
            id: result.id,
            file: relative(root, located.file),
            line: result.line,
          },
        };
      });
    }

    const deleting = /^\/notes\/(n-[0-9a-f]{8})$/.exec(url.pathname);
    if (method === "DELETE" && deleting) {
      const id = deleting[1]!;
      const group = url.searchParams.get("group") ?? "";
      if (!ID.test(group)) return fail(400, "invalid group");
      return await serialized(async () => {
        const located = await locateGroup(root, group);
        if (!located.ok) return fail(located.status, located.error);
        const owned = listNotes(located.source, located.mdx).some(
          (note) => note.id === id && note.group === group,
        );
        const next = owned
          ? deleteNote(located.source, id, located.mdx)
          : undefined;
        if (next === undefined) return fail(404, "note not found");
        await writeSource(root, located.file, next);
        return { status: 200, body: { ok: true } };
      });
    }

    return fail(mutation ? 405 : 404, "not found");
  } catch (error) {
    if (error instanceof BodyTooLargeError) return fail(413, error.message);
    if (error instanceof SyntaxError) return fail(400, "invalid JSON body");
    return fail(500, error instanceof Error ? error.message : "failed");
  }
};
