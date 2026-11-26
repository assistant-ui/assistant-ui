import { DatabaseSync } from "node:sqlite";

export type ThreadRow = {
  id: string;
  title: string | null;
  status: "regular" | "archived";
};

export type MessageRow = {
  id: string;
  parent_id: string | null;
  format: string;
  content: Record<string, unknown>;
};

let db: DatabaseSync | undefined;

function getDb() {
  if (db) return db;
  db = new DatabaseSync(process.env.DATABASE_PATH ?? "chat.db");
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'regular',
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      parent_id TEXT,
      format TEXT NOT NULL,
      content TEXT NOT NULL
    );
  `);
  return db;
}

export const threads = {
  list: () =>
    getDb()
      .prepare("SELECT id, title, status FROM threads ORDER BY updated_at DESC")
      .all() as ThreadRow[],

  get: (id: string) =>
    getDb()
      .prepare("SELECT id, title, status FROM threads WHERE id = ?")
      .get(id) as ThreadRow | undefined,

  create: (id: string) => {
    getDb()
      .prepare("INSERT INTO threads (id, updated_at) VALUES (?, ?)")
      .run(id, Date.now());
  },

  update: (
    id: string,
    patch: {
      title?: string | undefined;
      status?: ThreadRow["status"] | undefined;
    },
  ) => {
    getDb()
      .prepare(
        "UPDATE threads SET title = coalesce(?, title), status = coalesce(?, status), updated_at = ? WHERE id = ?",
      )
      .run(patch.title ?? null, patch.status ?? null, Date.now(), id);
  },

  delete: (id: string) => {
    getDb().prepare("DELETE FROM threads WHERE id = ?").run(id);
  },
};

export const messages = {
  // Insertion order is conversation order; the runtime rebuilds branches from parent_id.
  list: (threadId: string): MessageRow[] =>
    (
      getDb()
        .prepare(
          "SELECT id, parent_id, format, content FROM messages WHERE thread_id = ? ORDER BY rowid",
        )
        .all(threadId) as (Omit<MessageRow, "content"> & { content: string })[]
    ).map((row) => ({ ...row, content: JSON.parse(row.content) })),

  // An upsert, because the runtime saves a message again when it changes after its first save.
  save: (threadId: string, message: MessageRow) => {
    getDb()
      .prepare(
        `INSERT INTO messages (id, thread_id, parent_id, format, content) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET format = excluded.format, content = excluded.content`,
      )
      .run(
        message.id,
        threadId,
        message.parent_id,
        message.format,
        JSON.stringify(message.content),
      );
    getDb()
      .prepare("UPDATE threads SET updated_at = ? WHERE id = ?")
      .run(Date.now(), threadId);
  },
};
