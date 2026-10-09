import { readFile, realpath } from "node:fs/promises";
import { relative } from "node:path";
import {
  appendRequest,
  ensureMailbox,
  UnsafeMailboxError,
  presence,
  readEvents,
  type AgentNote,
  type AgentRequest,
} from "./agent";
import { deleteNote, insertNote, listNotes, type SourceNote } from "./markers";
import { isMdx, locateGroup, sourceFiles, writeSource } from "./project";

export const NOTES_HEADER = "x-variants";
const NOTE_ID = /^n-[0-9a-f]{8}$/;
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
  /** Hosts besides loopback that may reach the endpoints. */
  allowedHosts?: AllowedHosts | undefined;
};

export type AllowedHosts = readonly string[] | true;

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
  chunks: AsyncIterable<Uint8Array | string> | Iterable<Uint8Array | string>,
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

/** The host name of a `Host` header, without the port; IPv6 keeps its brackets. */
const hostName = (host: string) => {
  const lower = host.trim().toLowerCase();
  if (lower.startsWith("[")) return lower.slice(0, lower.indexOf("]") + 1);
  return lower.split(":", 1)[0]!;
};

/**
 * Loopback names, plus `allowedHosts` with Vite's semantics: an entry starting
 * with `.` also allows its subdomains, and `true` allows any host.
 */
export const isAllowedHost = (
  host: string,
  allowedHosts: AllowedHosts = [],
) => {
  const name = hostName(host);
  if (
    name === "localhost" ||
    name.endsWith(".localhost") ||
    name === "127.0.0.1" ||
    name === "[::1]"
  )
    return true;
  if (allowedHosts === true) return true;
  return allowedHosts.some((entry) => {
    const allowed = entry.toLowerCase();
    return allowed.startsWith(".")
      ? name === allowed.slice(1) || name.endsWith(allowed)
      : name === allowed;
  });
};

/**
 * Accepts only requests to a loopback or explicitly allowed host, so a
 * DNS-rebound page on another domain is refused, then only same-origin
 * requests that carry the custom header, so another site cannot drive the
 * endpoints from a user's browser.
 */
export const checkRequest = (
  request: NotesRequest,
  needsJson: boolean,
  allowedHosts?: AllowedHosts,
): NotesResponse | undefined => {
  const host = request.header("host");
  if (!host) return fail(400, "missing host header");
  if (!isAllowedHost(host, allowedHosts))
    return fail(403, "host not allowed; add it to allowedHosts");
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
  if (actual !== host.toLowerCase()) return fail(403, "origin mismatch");
  return undefined;
};

type NoteBody = {
  group?: unknown;
  variant?: unknown;
  note?: unknown;
  hint?: unknown;
  id?: unknown;
};

const validNote = (value: unknown): AgentNote | undefined => {
  const { group, variant, note, hint } = (value ?? {}) as NoteBody;
  if (typeof group !== "string" || !ID.test(group)) return undefined;
  if (
    variant !== undefined &&
    (typeof variant !== "string" || !ID.test(variant))
  )
    return undefined;
  if (typeof note !== "string" || !note.trim() || note.length > MAX_NOTE)
    return undefined;
  if (
    hint !== undefined &&
    (typeof hint !== "string" || hint.length > MAX_HINT)
  )
    return undefined;
  return {
    group,
    ...(variant === undefined ? {} : { variant }),
    note: note.trim(),
    ...(hint ? { hint } : {}),
  };
};

/** Accepts exactly what a pasted `/variants choose` or `/variants apply` could say. */
const parseAgentRequest = (body: unknown) => {
  const { kind, pairs, notes, page } = (body ?? {}) as Record<string, unknown>;
  if (kind !== "choose" && kind !== "apply") return "invalid kind";
  if (
    !Array.isArray(pairs) ||
    pairs.length > 50 ||
    (kind === "choose" && pairs.length === 0) ||
    !pairs.every(
      (pair) =>
        typeof pair === "string" &&
        pair.split(":").length === 2 &&
        pair.split(":").every((part) => ID.test(part)),
    )
  )
    return "invalid pairs";
  const parsedNotes = Array.isArray(notes) ? notes.map(validNote) : [];
  if (
    (notes !== undefined && !Array.isArray(notes)) ||
    parsedNotes.length > 50 ||
    parsedNotes.includes(undefined)
  )
    return "invalid notes";
  if (
    typeof page !== "string" ||
    page.length > 2000 ||
    !/^https?:\/\//.test(page)
  )
    return "invalid page";
  return {
    kind: kind as AgentRequest["kind"],
    pairs: pairs as string[],
    notes: parsedNotes as AgentNote[],
    page,
  };
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
  const rejected = checkRequest(
    request,
    method === "POST",
    options.allowedHosts,
  );
  if (rejected) return rejected;

  try {
    const url = parsePath(request.path);
    if (!url) return fail(400, "invalid path");
    const root = await realpath(options.root);
    if (method === "GET" && url.pathname === "/ping") {
      // The note endpoints work without the agent link, so an unsafe mailbox only disables the link.
      await ensureMailbox(root).catch(() => {});
      return { status: 200, body: { ok: true, version: 1 } };
    }

    if (method === "GET" && url.pathname === "/agent") {
      const agent = await presence(root);
      const after = url.searchParams.get("after") ?? undefined;
      return {
        status: 200,
        body: {
          connected: agent !== undefined,
          agent: agent ?? null,
          events: await readEvents(root, after),
        },
      };
    }

    if (method === "POST" && url.pathname === "/agent/requests") {
      const parsed = parseAgentRequest(await request.json());
      if (typeof parsed === "string") return fail(400, parsed);
      if (!(await presence(root))) return fail(409, "no agent is connected");
      const result = await appendRequest(root, parsed);
      if (!result.ok) return fail(result.status, result.error);
      return { status: 201, body: { id: result.id } };
    }

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
      const { group, variant, note, hint, id } = body ?? {};
      if (typeof group !== "string" || !ID.test(group))
        return fail(400, "invalid group");
      if (id !== undefined && (typeof id !== "string" || !NOTE_ID.test(id)))
        return fail(400, "invalid id");
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
        // A client-chosen id makes a retried save a no-op.
        const existing = listNotes(located.source, located.mdx).find(
          (item) => item.id === id,
        );
        if (existing && existing.group !== group)
          return fail(
            409,
            `note id ${existing.id} already belongs to another group`,
          );
        if (existing)
          return {
            status: 201,
            body: {
              id: existing.id,
              file: relative(root, located.file),
              line: existing.line,
            },
          };
        const result = insertNote(
          located.source,
          { group, variant: variant as string | undefined },
          hint ? { note: note.trim(), hint } : { note: note.trim() },
          id === undefined
            ? undefined
            : { id: id as string, ts: new Date().toISOString() },
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
    if (error instanceof UnsafeMailboxError) return fail(409, error.message);
    if (error instanceof SyntaxError) return fail(400, "invalid JSON body");
    return fail(500, error instanceof Error ? error.message : "failed");
  }
};
