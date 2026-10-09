import { relative } from "node:path";
import { deleteNote, insertNote, listNotes, type SourceNote } from "./markers";
import { locateGroup, sourceFiles, writeSource } from "./project";
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

export const handleNotesRequest = async (
  request: NotesRequest,
  options: NotesOptions,
): Promise<NotesResponse> => {
  if (!options.dev) return fail(404, "not found");
  const url = new URL(request.path, "http://local");
  const method = request.method.toUpperCase();
  const mutation = method === "POST" || method === "DELETE";
  const rejected = checkRequest(request, method === "POST");
  if (rejected) return rejected;

  try {
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
        for (const note of listNotes(source))
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
      const located = await locateGroup(root, group);
      if (!located.ok) return fail(located.status, located.error);
      const result = insertNote(
        located.source,
        { group, variant: variant as string | undefined },
        hint ? { note: note.trim(), hint } : { note: note.trim() },
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
    }

    const deleting = /^\/notes\/(n-[0-9a-f]{8})$/.exec(url.pathname);
    if (method === "DELETE" && deleting) {
      const group = url.searchParams.get("group") ?? "";
      if (!ID.test(group)) return fail(400, "invalid group");
      const located = await locateGroup(root, group);
      if (!located.ok) return fail(located.status, located.error);
      const next = deleteNote(located.source, deleting[1]!);
      if (next === undefined) return fail(404, "note not found");
      await writeSource(root, located.file, next);
      return { status: 200, body: { ok: true } };
    }

    return fail(mutation ? 405 : 404, "not found");
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "failed");
  }
};
