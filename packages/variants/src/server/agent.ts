import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, realpath } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

/** The mailbox directory at the project root; gitignored. */
export const MAILBOX = ".variants";
export const INBOX = "inbox.jsonl";
export const OUTBOX = "outbox.jsonl";
export const PRESENCE = "agent.json";
/** The agent counts as connected while `agent.json` was touched this recently. */
export const PRESENCE_MS = 15_000;
/** Neither side reads more than this much of a mailbox file. */
export const MAX_MAILBOX = 1024 * 1024;
const MAX_TEXT = 500;

export type AgentNote = {
  group: string;
  variant?: string | undefined;
  note: string;
  hint?: string | undefined;
};

export type AgentRequest = {
  id: string;
  ts: string;
  kind: "choose" | "apply";
  pairs: string[];
  notes: AgentNote[];
  page: string;
};

export type AgentEvent = {
  id: string;
  ts: string;
  re: string;
  type: "ack" | "status" | "done";
  text?: string;
  ok?: boolean;
  reload?: boolean;
};

const mailbox = (root: string, file: string) => join(root, MAILBOX, file);

/** The mailbox is a symlink, or resolves outside the project root. */
export class UnsafeMailboxError extends Error {
  constructor(detail: string) {
    super(`refusing to use .variants/: ${detail}`);
  }
}

/** Time-ordered ids, so both sides can resume after the last one they saw. */
export const newRequestId = () =>
  `r-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;

/** Creates `.variants/` under `root` (already resolved) and refuses a symlinked or escaping one. */
export const ensureMailbox = async (root: string) => {
  const dir = join(root, MAILBOX);
  const info = await lstat(dir).catch(() => undefined);
  if (info && !info.isDirectory())
    throw new UnsafeMailboxError("it is not a plain directory");
  if (!info) await mkdir(dir);
  if ((await realpath(dir)) !== dir)
    throw new UnsafeMailboxError("it resolves outside the project root");
};

/** Opens a mailbox file inside a plain `.variants/` directory, never through a symlink. */
const openFile = async (path: string, flags: number) => {
  const dir = await lstat(dirname(path)).catch(() => undefined);
  if (!dir?.isDirectory())
    throw new UnsafeMailboxError("it is missing or not a plain directory");
  try {
    return await open(path, flags | constants.O_NOFOLLOW, 0o644);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ELOOP")
      throw new UnsafeMailboxError(`${basename(path)} is a symlink`);
    throw error;
  }
};

export const presence = async (
  root: string,
  now = Date.now(),
): Promise<{ kind: string } | undefined> => {
  let handle;
  try {
    handle = await openFile(mailbox(root, PRESENCE), constants.O_RDONLY);
  } catch {
    return undefined;
  }
  try {
    const info = await handle.stat();
    if (!info.isFile() || now - info.mtimeMs > PRESENCE_MS) return undefined;
    let kind: unknown;
    if (info.size < 4096) {
      try {
        kind = (JSON.parse(await handle.readFile("utf8")) as { kind?: unknown })
          .kind;
      } catch {}
    }
    return { kind: typeof kind === "string" ? kind.slice(0, 40) : "agent" };
  } finally {
    await handle.close();
  }
};

/** Lines of the last `MAX_MAILBOX` bytes of a file, without a cut-off first line. */
const readTail = async (path: string): Promise<string[]> => {
  let handle;
  try {
    handle = await openFile(path, constants.O_RDONLY);
  } catch {
    return [];
  }
  try {
    const { size } = await handle.stat();
    const length = Math.min(size, MAX_MAILBOX);
    // One byte before the window shows whether it starts mid-line.
    const start = size - length;
    const before = start > 0 ? 1 : 0;
    const buffer = Buffer.alloc(length + before);
    await handle.read(buffer, 0, length + before, start - before);
    const lines = buffer.subarray(before).toString("utf8").split("\n");
    if (before && buffer[0] !== 0x0a) lines.shift();
    return lines.filter((line) => line.trim());
  } finally {
    await handle.close();
  }
};

const parseEvent = (line: string): AgentEvent | undefined => {
  try {
    const value = JSON.parse(line) as Record<string, unknown>;
    const { id, ts, re, type, text, ok, reload } = value;
    if (typeof id !== "string" || typeof re !== "string") return undefined;
    if (type !== "ack" && type !== "status" && type !== "done")
      return undefined;
    return {
      id: id.slice(0, 64),
      ts: typeof ts === "string" ? ts.slice(0, 40) : "",
      re: re.slice(0, 64),
      type,
      ...(typeof text === "string" ? { text: text.slice(0, MAX_TEXT) } : {}),
      ...(typeof ok === "boolean" ? { ok } : {}),
      ...(reload === true ? { reload: true } : {}),
    };
  } catch {
    return undefined;
  }
};

/** Outbox events after the one with id `after`; all of them when it's unknown (e.g. after rotation). */
export const readEvents = async (
  root: string,
  after: string | undefined,
): Promise<AgentEvent[]> => {
  const events = (await readTail(mailbox(root, OUTBOX)))
    .map(parseEvent)
    .filter((event): event is AgentEvent => event !== undefined);
  const index =
    after === undefined ? -1 : events.findIndex((event) => event.id === after);
  return events.slice(index + 1);
};

let appends: Promise<unknown> = Promise.resolve();

export const appendRequest = (
  root: string,
  request: Omit<AgentRequest, "id" | "ts">,
): Promise<
  { ok: true; id: string } | { ok: false; status: number; error: string }
> => {
  // One append at a time, so the size check and the write can't interleave.
  const run = appends.then(async () => {
    await ensureMailbox(root);
    const line: AgentRequest = {
      id: newRequestId(),
      ts: new Date().toISOString(),
      ...request,
    };
    const bytes = Buffer.from(`${JSON.stringify(line)}\n`, "utf8");
    const handle = await openFile(
      mailbox(root, INBOX),
      constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT,
    );
    try {
      const info = await handle.stat();
      if (!info.isFile())
        throw new UnsafeMailboxError("inbox.jsonl is not a plain file");
      if (info.size + bytes.byteLength > MAX_MAILBOX)
        return {
          ok: false as const,
          status: 507,
          error: "the inbox is full; reconnect the agent",
        };
      await handle.write(bytes);
      return { ok: true as const, id: line.id };
    } finally {
      await handle.close();
    }
  });
  appends = run.catch(() => {});
  return run;
};
