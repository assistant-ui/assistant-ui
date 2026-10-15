import { NAME } from "./name";
import type { ClientNote, Store } from "./store";

export const NOTES_ENDPOINT = `/__${NAME}`;
export const SESSION_NOTES_KEY = `${NAME}:notes`;
const HEADERS = { "x-variants": "1" };

export type NoteDraft = {
  group: string;
  variant: string | undefined;
  note: string;
  hint: string | undefined;
  /** Chosen once per draft, so retrying a save whose response was lost is a no-op. */
  id?: string | undefined;
};

export const newNoteId = () =>
  `n-${Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("")}`;

const readSession = (): ClientNote[] => {
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(SESSION_NOTES_KEY) ?? "[]",
    ) as unknown;
    return Array.isArray(value)
      ? value.filter(
          (item): item is ClientNote =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as ClientNote).id === "string" &&
            typeof (item as ClientNote).group === "string" &&
            typeof (item as ClientNote).note === "string",
        )
      : [];
  } catch {
    return [];
  }
};

const writeSession = (notes: ClientNote[]) => {
  try {
    window.sessionStorage.setItem(SESSION_NOTES_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
};

/**
 * Keeps the store's notes in sync with the source files (through the dev
 * endpoints, when the app mounts them) or with sessionStorage otherwise.
 */
export const createNotes = (
  store: Store,
  request: typeof fetch = (...args) => fetch(...args),
) => {
  let mode: "probing" | "server" | "session" = "probing";
  let generation = 0;

  const groupIds = () => store.getSnapshot().groups.map((group) => group.id);

  const refresh = async () => {
    const current = ++generation;
    if (mode === "session") {
      store.setNotes(
        readSession().map((note) => ({ ...note, source: "session" as const })),
        "session",
      );
      return;
    }
    if (mode !== "server") return;
    const groups = groupIds();
    try {
      const response = await request(
        `${NOTES_ENDPOINT}/notes?groups=${encodeURIComponent(groups.join(","))}`,
        { headers: HEADERS },
      );
      if (!response.ok) return;
      const body = (await response.json()) as { notes?: ClientNote[] };
      if (current !== generation) return;
      store.setNotes(
        (body.notes ?? []).map((note) => ({
          ...note,
          source: "file" as const,
        })),
        "server",
      );
    } catch {}
  };

  let probing: Promise<void> | undefined;
  const probe = () => (probing ??= detect());

  const detect = async () => {
    try {
      const response = await request(`${NOTES_ENDPOINT}/ping`, {
        headers: HEADERS,
      });
      const body = response.ok
        ? ((await response.json()) as { ok?: boolean })
        : undefined;
      mode = body?.ok ? "server" : "session";
    } catch {
      mode = "session";
    }
    await refresh();
  };

  const add = async (draft: NoteDraft): Promise<string | undefined> => {
    await probing;
    if (mode === "server") {
      let response: Response;
      try {
        response = await request(`${NOTES_ENDPOINT}/notes`, {
          method: "POST",
          headers: { ...HEADERS, "content-type": "application/json" },
          body: JSON.stringify(draft),
        });
      } catch {
        return "could not reach the dev server";
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        await refresh();
        return body.error ?? `could not save the note (${response.status})`;
      }
      await refresh();
      return undefined;
    }
    const saved = writeSession([
      ...readSession(),
      {
        id: draft.id ?? newNoteId(),
        group: draft.group,
        variant: draft.variant,
        note: draft.note,
        hint: draft.hint,
        source: "session",
      },
    ]);
    if (!saved) return "could not store the note in this tab";
    await refresh();
    return undefined;
  };

  const remove = async (note: ClientNote): Promise<string | undefined> => {
    let failure: string | undefined;
    if (note.source === "file") {
      try {
        const response = await request(
          `${NOTES_ENDPOINT}/notes/${note.id}?group=${encodeURIComponent(note.group)}`,
          { method: "DELETE", headers: HEADERS },
        );
        if (!response.ok)
          failure = `could not delete the note (${response.status})`;
      } catch {
        failure = "could not reach the dev server";
      }
    } else if (
      !writeSession(readSession().filter((item) => item.id !== note.id))
    ) {
      failure = "could not update the notes in this tab";
    }
    await refresh();
    return failure;
  };

  return {
    probe,
    refresh,
    add,
    remove,
    get mode() {
      return mode;
    },
  };
};

export type Notes = ReturnType<typeof createNotes>;

const shortText = (element: Element) =>
  (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);

/**
 * Describes a clicked element for an agent: a short CSS-like path from the
 * variant's top-level element, plus the element's text.
 */
export const describeTarget = (
  target: Element,
  roots: readonly Node[],
): string => {
  const path: string[] = [];
  for (
    let element: Element | null = target;
    element && path.length < 4;
    element = element.parentElement
  ) {
    const className =
      typeof element.className === "string"
        ? element.className.trim().split(/\s+/)[0]
        : undefined;
    path.unshift(
      `${element.tagName.toLowerCase()}${className ? `.${className}` : ""}`,
    );
    if (roots.includes(element)) break;
  }
  const text = shortText(target);
  return `${path.join(" > ")}${text ? ` "${text}"` : ""}`.slice(0, 300);
};
