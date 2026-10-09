import { randomBytes } from "node:crypto";
import { appendFile, mkdir, open, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

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

/** Time-ordered ids, so both sides can resume after the last one they saw. */
export const newRequestId = () =>
  `r-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;

export const ensureMailbox = (root: string) =>
  mkdir(join(root, MAILBOX), { recursive: true });

export const presence = async (
  root: string,
  now = Date.now(),
): Promise<{ kind: string } | undefined> => {
  const path = mailbox(root, PRESENCE);
  try {
    const info = await stat(path);
    if (now - info.mtimeMs > PRESENCE_MS) return undefined;
    let kind: unknown;
    if (info.size < 4096) {
      try {
        kind = (JSON.parse(await readFile(path, "utf8")) as { kind?: unknown })
          .kind;
      } catch {}
    }
    return { kind: typeof kind === "string" ? kind.slice(0, 40) : "agent" };
  } catch {
    return undefined;
  }
};

/** Lines of the last `MAX_MAILBOX` bytes of a file, without a cut-off first line. */
const readTail = async (path: string): Promise<string[]> => {
  let handle;
  try {
    handle = await open(path, "r");
  } catch {
    return [];
  }
  try {
    const { size } = await handle.stat();
    const length = Math.min(size, MAX_MAILBOX);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, size - length);
    const lines = buffer.toString("utf8").split("\n");
    if (length < size) lines.shift();
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

export const appendRequest = async (
  root: string,
  request: Omit<AgentRequest, "id" | "ts">,
): Promise<
  { ok: true; id: string } | { ok: false; status: number; error: string }
> => {
  await ensureMailbox(root);
  const path = mailbox(root, INBOX);
  const size = await stat(path).then(
    (info) => info.size,
    () => 0,
  );
  if (size > MAX_MAILBOX)
    return {
      ok: false,
      status: 507,
      error: "the inbox is full; reconnect the agent",
    };
  const line: AgentRequest = {
    id: newRequestId(),
    ts: new Date().toISOString(),
    ...request,
  };
  await appendFile(path, `${JSON.stringify(line)}\n`, "utf8");
  return { ok: true, id: line.id };
};
