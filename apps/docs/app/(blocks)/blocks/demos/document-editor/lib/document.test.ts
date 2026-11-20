import { describe, expect, it } from "vitest";
import {
  adoptStored,
  advance,
  commentChanges,
  createDocumentStore,
  descendantIds,
  displayBlocks,
  documentToMarkdown,
  duplicatePageIn,
  markdownFileName,
  pageAncestors,
  pageTree,
  parseInline,
  plainText,
  receive,
  remaining,
  removePage,
  serializeInline,
  settled,
  STORAGE_KEY,
  streamMarks,
  threadsToComments,
  type Block,
  type CommentThread,
  type DocumentStoreState,
  type Page,
  type PageContent,
} from "./document";

const page = (id: string, parentId: string | null = null): Page => ({
  id,
  parentId,
  title: id,
  content: { blocks: [], state: null },
});

const seed = (): DocumentStoreState => ({
  pages: [page("home"), page("notes", "home"), page("ideas", "notes")],
  currentPageId: "home",
  threads: [],
  commentsVisible: true,
  activeThreadId: null,
  assistantRequests: 0,
});

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

function testStore(storage = memoryStorage()) {
  let next = 0;
  return createDocumentStore({
    storage,
    seed,
    mintId: () => `id-${++next}`,
    now: () => 1000,
  });
}

const written = (text: string): PageContent => ({
  blocks: [{ id: "a", type: "paragraph", text }],
  state: null,
});

const thread = (id: string, pageId: string): CommentThread => ({
  id,
  pageId,
  quote: "q",
  markId: id,
  resolved: false,
  messages: [{ id: `${id}-1`, author: "you", text: "Why?", createdAt: 1 }],
});

/** Tabs on one storage. `hear` hands a tab the save, as a storage event would. */
function openTabs() {
  const storage = memoryStorage();
  const tab = (name: string) => {
    let next = 0;
    let onSave: (saved: string | null) => void = () => {};
    const store = createDocumentStore({
      storage,
      seed,
      mintId: () => `${name}-${++next}`,
      now: () => 1000,
      watch: (listener) => {
        onSave = listener;
        return () => {};
      },
    });
    let told = 0;
    store.subscribe(() => told++);
    return {
      ...store,
      hear: () => onSave(storage.getItem(STORAGE_KEY)),
      told: () => told,
    };
  };
  return { a: tab("a"), b: tab("b"), saved: () => testStore(storage) };
}

const contentOf = (state: DocumentStoreState, id: string) =>
  state.pages.find((item) => item.id === id)?.content;

describe("inline text", () => {
  it("reads marks into runs and writes the same text back", () => {
    const source =
      "Ship **the beta** by *Friday*, ~~not Monday~~, with `npm run build` and <u>care</u>.";
    const runs = parseInline(source);

    expect(runs).toContainEqual({ text: "the beta", bold: true });
    expect(runs).toContainEqual({ text: "Friday", italic: true });
    expect(runs).toContainEqual({ text: "not Monday", strike: true });
    expect(runs).toContainEqual({ text: "npm run build", code: true });
    expect(runs).toContainEqual({ text: "care", underline: true });
    expect(serializeInline(runs)).toBe(source);
  });

  it("keeps a lone asterisk as text and escapes it when written", () => {
    expect(plainText("5 * 3 is 15")).toBe("5 * 3 is 15");
    expect(serializeInline([{ text: "2 * 3 * 4" }])).toBe("2 \\* 3 \\* 4");
    expect(plainText("2 \\* 3 \\* 4")).toBe("2 * 3 * 4");
  });

  it("gives the text without its marks", () => {
    expect(plainText("**Bold** and *italic* `code`")).toBe(
      "Bold and italic code",
    );
  });
});

describe("markdown export", () => {
  it("writes the title, keeps list items together and numbers a list", () => {
    const blocks: Block[] = [
      { id: "1", type: "h2", text: "Today" },
      { id: "2", type: "check", text: "Done", checked: true },
      { id: "3", type: "check", text: "Open" },
      { id: "4", type: "paragraph", text: "A **note**." },
      { id: "5", type: "numbered", text: "First" },
      { id: "6", type: "numbered", text: "Second" },
      { id: "7", type: "divider", text: "" },
      { id: "8", type: "quote", text: "Quoted" },
    ];

    expect(documentToMarkdown("To-do list", blocks)).toBe(
      [
        "# To-do list",
        "",
        "## Today",
        "",
        "- [x] Done",
        "- [ ] Open",
        "",
        "A **note**.",
        "",
        "1. First",
        "2. Second",
        "",
        "---",
        "",
        "> Quoted",
        "",
      ].join("\n"),
    );
  });

  it("names an untitled page and makes a safe file name", () => {
    expect(documentToMarkdown("", [])).toBe("# Untitled\n");
    expect(markdownFileName("  Q3: Launch / Plan!  ")).toBe(
      "q3-launch-plan.md",
    );
    expect(markdownFileName("")).toBe("untitled.md");
  });
});

describe("page tree", () => {
  const pages = [
    page("home"),
    page("other"),
    page("notes", "home"),
    page("ideas", "notes"),
  ];

  it("lists pages in reading order with their depth", () => {
    expect(pageTree(pages).map((node) => [node.page.id, node.depth])).toEqual([
      ["home", 0],
      ["notes", 1],
      ["ideas", 2],
      ["other", 0],
    ]);
  });

  it("still lists a page whose parent is gone", () => {
    expect(pageTree([page("home"), page("lost", "missing")])).toHaveLength(2);
  });

  it("finds everything under a page and everything above it", () => {
    expect(descendantIds(pages, "home")).toEqual(["notes", "ideas"]);
    expect(pageAncestors(pages, "ideas").map((item) => item.id)).toEqual([
      "home",
      "notes",
    ]);
  });

  it("removes a page with its subpages, but never the last page", () => {
    expect(removePage(pages, "home")).toEqual({
      pages: [page("other")],
      removed: ["home", "notes", "ideas"],
    });
    expect(removePage([page("only")], "only")).toEqual({
      pages: [page("only")],
      removed: [],
    });
  });

  it("copies a page next to itself without the editor's saved state", () => {
    const source: Page = {
      ...page("home"),
      title: "Plan",
      content: {
        blocks: [{ id: "a", type: "paragraph", text: "Hello" }],
        state: "{}",
      },
    };
    const [, copy, after] = duplicatePageIn(
      [source, page("other")],
      "home",
      "x",
    );

    expect(copy).toMatchObject({
      id: "x",
      title: "Plan copy",
      content: { blocks: [{ type: "paragraph", text: "Hello" }], state: null },
    });
    expect(copy?.content.blocks[0]?.id).not.toBe("a");
    expect(after?.id).toBe("other");
  });
});

describe("document store", () => {
  it("adds a subpage and opens it", () => {
    const store = testStore();
    const id = store.actions.addPage("notes", "Draft");

    const state = store.getState();
    expect(state.currentPageId).toBe(id);
    expect(state.pages.at(-1)).toMatchObject({
      id,
      parentId: "notes",
      title: "Draft",
    });
  });

  it("deletes the open page with its subpages and comments, and opens its parent", () => {
    const store = testStore();
    store.actions.selectPage("notes");
    store.actions.addThread({ pageId: "ideas", quote: "q", text: "Why?" });
    store.actions.addThread({ pageId: "home", quote: "q", text: "Keep" });

    expect(store.actions.deletePage("notes")).toBe(true);

    const state = store.getState();
    expect(state.pages.map((item) => item.id)).toEqual(["home"]);
    expect(state.currentPageId).toBe("home");
    expect(state.threads.map((thread) => thread.pageId)).toEqual(["home"]);
  });

  it("keeps the last page", () => {
    const store = testStore();
    store.actions.deletePage("notes");

    expect(store.actions.deletePage("home")).toBe(false);
    expect(store.getState().pages).toHaveLength(1);
  });

  it("duplicates a page and opens the copy", () => {
    const store = testStore();
    const copyId = store.actions.duplicatePage("home");

    expect(store.getState().currentPageId).toBe(copyId);
    expect(store.getState().pages[1]).toMatchObject({
      id: copyId,
      title: "home copy",
    });
  });

  it("saves under the versioned key and reads the save back", () => {
    const storage = memoryStorage();
    const store = testStore(storage);
    store.actions.renamePage("home", "Renamed");
    store.actions.setPageContent("home", {
      blocks: [{ id: "a", type: "check", text: "Task", checked: true }],
      state: null,
    });
    store.actions.setCommentsVisible(false);

    expect(storage.items.has(STORAGE_KEY)).toBe(true);
    const reopened = testStore(storage).getState();
    expect(reopened.pages[0]).toMatchObject({
      title: "Renamed",
      content: {
        blocks: [{ id: "a", type: "check", text: "Task", checked: true }],
      },
    });
    expect(reopened.commentsVisible).toBe(false);
  });

  it("does not save which thread is open", () => {
    const storage = memoryStorage();
    const store = testStore(storage);
    const threadId = store.actions.addThread({
      pageId: "home",
      quote: "q",
      text: "Hi",
    });

    expect(store.getState().activeThreadId).toBe(threadId);
    expect(testStore(storage).getState().activeThreadId).toBeNull();
  });

  it("starts from the starter pages when the save cannot be read", () => {
    for (const saved of ["not json", JSON.stringify({ pages: [] })]) {
      const store = testStore(memoryStorage({ [STORAGE_KEY]: saved }));
      expect(store.getState().pages.map((item) => item.id)).toEqual([
        "home",
        "notes",
        "ideas",
      ]);
    }
  });

  it("tells subscribers about a change and not about a no-op", () => {
    const store = testStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);

    store.actions.renamePage("home", "New");
    store.actions.renamePage("home", "New");
    store.actions.selectPage("missing");
    unsubscribe();
    store.actions.renamePage("home", "Later");

    expect(calls).toBe(1);
  });

  it("writes the save only when something that is saved changed", () => {
    const storage = memoryStorage();
    let writes = 0;
    const store = testStore({
      ...storage,
      setItem: (key: string, value: string) => {
        writes++;
        storage.setItem(key, value);
      },
    });
    const threadId = store.actions.addThread({
      pageId: "home",
      quote: "q",
      text: "Hi",
    });
    expect(writes).toBe(1);

    store.actions.setActiveThread(null);
    store.actions.setActiveThread(threadId);
    store.actions.askAssistant();
    expect(writes).toBe(1);
    expect(store.getState().assistantRequests).toBe(1);

    store.actions.selectPage("notes");
    expect(writes).toBe(2);
  });

  it("holds a thread from an empty draft to a resolved conversation", () => {
    const store = testStore();
    const threadId = store.actions.addThread({ pageId: "home", quote: "q" });
    expect(store.getState().threads[0]?.messages).toEqual([]);

    store.actions.addThreadMessage(threadId, { author: "you", text: "Why?" });
    store.actions.addThreadMessage(threadId, {
      author: "assistant",
      text: "Because.",
    });
    store.actions.resolveThread(threadId);

    const [thread] = store.getState().threads;
    expect(thread?.messages.map((message) => message.author)).toEqual([
      "you",
      "assistant",
    ]);
    expect(thread?.resolved).toBe(true);
    expect(store.getState().activeThreadId).toBeNull();
  });
});

describe("two tabs on one save", () => {
  it("keeps the page another tab added when this tab saves", () => {
    const { a, b, saved } = openTabs();
    const draft = a.actions.addPage(null, "Draft");
    a.actions.setPageContent(draft, written("From A"));
    b.hear();

    b.actions.setPageContent("home", written("From B"));

    const state = saved().getState();
    expect(state.pages.map((item) => item.id)).toContain(draft);
    expect(contentOf(state, draft)).toEqual(written("From A"));
    expect(contentOf(state, "home")).toEqual(written("From B"));
    expect(b.getState().currentPageId).toBe("home");
  });

  it("tells subscribers only when the other tab's save changes something here", () => {
    const { a, b } = openTabs();
    const before = b.getState();

    a.actions.selectPage("notes");
    b.hear();
    expect(b.getState()).toBe(before);
    expect(b.told()).toBe(0);

    a.actions.renamePage("notes", "Renamed");
    b.hear();
    expect(b.told()).toBe(1);
    expect(b.getState().pages[1]?.title).toBe("Renamed");
    expect(b.getState().pages[2]).toBe(before.pages[2]);
  });

  it("leaves the open page to its editor and takes the other tab's copy once the page is left", () => {
    const { a, b, saved } = openTabs();
    a.actions.setPageContent("home", written("From A"));
    b.hear();
    expect(contentOf(b.getState(), "home")).toEqual({
      blocks: [],
      state: null,
    });

    b.actions.renamePage("notes", "Renamed");
    expect(contentOf(saved().getState(), "home")).toEqual(written("From A"));

    b.actions.selectPage("notes");
    expect(contentOf(b.getState(), "home")).toEqual(written("From A"));
    expect(contentOf(saved().getState(), "home")).toEqual(written("From A"));
  });

  it("saves its own copy of the open page once it edits that page", () => {
    const { a, b, saved } = openTabs();
    a.actions.setPageContent("home", written("From A"));
    b.hear();

    b.actions.setPageContent("home", written("From B"));
    b.actions.selectPage("notes");

    expect(contentOf(saved().getState(), "home")).toEqual(written("From B"));
    expect(contentOf(b.getState(), "home")).toEqual(written("From B"));
  });

  it("opens the other tab's page when the open page was deleted there", () => {
    const { a, b } = openTabs();
    b.actions.selectPage("ideas");
    a.hear();
    a.actions.selectPage("home");
    a.actions.deletePage("notes");
    b.hear();

    expect(b.getState().pages.map((item) => item.id)).toEqual(["home"]);
    expect(b.getState().currentPageId).toBe("home");
  });

  it("reads a save written while nothing was subscribed", () => {
    const storage = memoryStorage();
    const store = createDocumentStore({
      storage,
      seed,
      watch: () => () => {},
    });
    store.getState();
    testStore(storage).actions.renamePage("notes", "Renamed");

    store.subscribe(() => {});

    expect(store.getState().pages[1]?.title).toBe("Renamed");
  });
});

describe("adopting another tab's save", () => {
  it("keeps the open page's threads and takes the threads on other pages", () => {
    const mine = thread("mine", "home");
    const current: DocumentStoreState = {
      ...seed(),
      threads: [mine, thread("stale", "notes")],
      activeThreadId: "mine",
      assistantRequests: 2,
    };
    const stored: DocumentStoreState = {
      ...seed(),
      currentPageId: "notes",
      threads: [thread("theirs", "home"), thread("fresh", "notes")],
    };

    const next = adoptStored(current, stored);

    expect(next.threads.map((item) => item.id)).toEqual(["fresh", "mine"]);
    expect(next.threads[1]).toBe(mine);
    expect(next).toMatchObject({
      currentPageId: "home",
      activeThreadId: "mine",
      assistantRequests: 2,
    });
  });

  it("closes the open thread when the other tab hid the comments", () => {
    const current: DocumentStoreState = {
      ...seed(),
      threads: [thread("mine", "home")],
      activeThreadId: "mine",
    };

    const next = adoptStored(current, {
      ...current,
      commentsVisible: false,
      activeThreadId: null,
    });

    expect(next.commentsVisible).toBe(false);
    expect(next.activeThreadId).toBeNull();
  });

  it("returns the same state for a save that says the same in another key order", () => {
    const current = seed();
    const stored: DocumentStoreState = {
      ...current,
      pages: current.pages.map(({ content, ...rest }) => ({
        content: { state: content.state, blocks: [...content.blocks] },
        ...rest,
      })),
    };

    expect(adoptStored(current, stored)).toBe(current);
  });
});

describe("comments for the assistant", () => {
  const threads: CommentThread[] = [
    {
      id: "t1",
      pageId: "home",
      quote: "the beta",
      markId: "t1",
      resolved: false,
      messages: [
        { id: "m1", author: "you", text: "Which beta?", createdAt: 1 },
        {
          id: "m2",
          author: "assistant",
          text: "The public one.",
          createdAt: 2,
        },
      ],
    },
    {
      id: "t2",
      pageId: "other",
      quote: "x",
      markId: "t2",
      resolved: false,
      messages: [{ id: "m3", author: "you", text: "Elsewhere", createdAt: 3 }],
    },
  ];

  it("flattens one page's threads, the first message carrying the thread id", () => {
    expect(threadsToComments(threads, "home")).toEqual([
      {
        id: "t1",
        quote: "the beta",
        author: "you",
        text: "Which beta?",
        resolved: false,
        replyTo: null,
      },
      {
        id: "m2",
        quote: "the beta",
        author: "assistant",
        text: "The public one.",
        resolved: false,
        replyTo: "t1",
      },
    ]);
  });

  it("finds the comments, replies and resolved flags the assistant added", () => {
    const known = threadsToComments(threads, "home");
    const changes = commentChanges(threads, "home", [
      { ...known[0]!, resolved: true },
      known[1],
      {
        id: "n1",
        quote: "Friday",
        author: "assistant",
        text: "Is this firm?",
        resolved: false,
        replyTo: null,
      },
      {
        id: "n2",
        quote: "",
        author: "assistant",
        text: "Agreed.",
        resolved: false,
        replyTo: "m2",
      },
      { quote: "half", text: "still being written" },
    ]);

    expect(changes.started.map((comment) => comment.id)).toEqual(["n1"]);
    expect(changes.replies).toEqual([
      { threadId: "t1", comment: expect.objectContaining({ id: "n2" }) },
    ]);
    expect(changes.resolved).toEqual([{ threadId: "t1", resolved: true }]);
  });
});

describe("a streamed edit", () => {
  const before: Block[] = [
    { id: "a", type: "paragraph", text: "Old text" },
    { id: "b", type: "paragraph", text: "Untouched" },
  ];

  it("keeps the old text while the new text arrives, then types it in", () => {
    let stream = settled(before);
    stream = receive(
      stream,
      [{ id: "a", type: "paragraph", text: "New" }],
      true,
    );
    stream = receive(
      stream,
      [{ id: "a", type: "paragraph", text: "New words" }],
      true,
    );

    expect(displayBlocks(stream).map((block) => block.text)).toEqual([
      "Old text",
      "Untouched",
    ]);
    expect(streamMarks(stream).working).toEqual(["a"]);

    stream = receive(
      stream,
      [{ id: "a", type: "paragraph", text: "New words" }, before[1]!],
      false,
    );
    expect(remaining(stream)).toBe("New words".length);

    stream = advance(stream, 3);
    expect(displayBlocks(stream)[0]?.text).toBe("New text");
    expect(streamMarks(stream).typing).toEqual({ id: "a", typed: 3 });

    stream = advance(stream, 100);
    expect(displayBlocks(stream)).toEqual([
      { id: "a", type: "paragraph", text: "New words" },
      before[1],
    ]);
    expect(stream.active).toBe(false);
  });

  it("takes a ticked checkbox as a change even when the text is the same", () => {
    const list: Block[] = [{ id: "c", type: "check", text: "Task" }];
    const stream = receive(
      receive(settled(list), [{ ...list[0]!, checked: true }], true),
      [{ ...list[0]!, checked: true }],
      false,
    );

    expect(displayBlocks(stream)).toEqual([
      { id: "c", type: "check", text: "Task", checked: true },
    ]);
  });
});
