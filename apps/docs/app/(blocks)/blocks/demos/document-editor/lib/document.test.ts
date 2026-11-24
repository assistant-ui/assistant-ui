import { describe, expect, it } from "vitest";
import {
  adoptStored,
  advance,
  classifyEdit,
  commentChanges,
  createDocumentStore,
  descendantIds,
  displayBlocks,
  documentToMarkdown,
  duplicatePageIn,
  markdownFileName,
  normalizeBlock,
  pageAncestors,
  pageLinkText,
  pageTree,
  parseInline,
  plainText,
  reactionCounts,
  receive,
  remaining,
  removePage,
  reviewOf,
  serializeInline,
  settled,
  STORAGE_KEY,
  streamMarks,
  threadsToComments,
  writingBlockId,
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
  editMode: "manual",
  pendingReview: null,
  activeThreadId: null,
  commentsPanelOpen: false,
  home: false,
  assistantRequests: 0,
  assistantReference: null,
  assistantUnseen: false,
  assistantPresence: null,
  lastEdit: null,
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

  it("reads a link to a page as its title and writes the link back", () => {
    const source = "See [[page:notes|Meeting notes]] before **Friday**.";
    const runs = parseInline(source);

    expect(runs).toContainEqual({ text: "Meeting notes", page: "notes" });
    expect(plainText(source)).toBe("See Meeting notes before Friday.");
    expect(serializeInline(runs)).toBe(source);
  });

  it("keeps two links side by side apart, and text that only looks like a link as text", () => {
    const links = pageLinkText("a", "One") + pageLinkText("b", "Two");
    expect(parseInline(links)).toEqual([
      { text: "One", page: "a" },
      { text: "Two", page: "b" },
    ]);

    const typed = serializeInline([{ text: "[[page:a|One]]" }]);
    expect(parseInline(typed)).toEqual([{ text: "[[page:a|One]]" }]);
  });

  it("names a link to an untitled page, and keeps a title from closing its link", () => {
    expect(parseInline(pageLinkText("a", ""))).toEqual([
      { text: "Untitled", page: "a" },
    ]);
    expect(parseInline(pageLinkText("a", "x]]y"))).toEqual([
      { text: "x] ]y", page: "a" },
    ]);
  });
});

describe("a table block", () => {
  it("fills a table that is still arriving into a full grid", () => {
    const block = normalizeBlock(
      { id: "t", type: "table", rows: [["Task", "Status"], ["Write"]] },
      0,
    );

    expect(block).toEqual({
      id: "t",
      type: "table",
      text: "",
      rows: [
        ["Task", "Status"],
        ["Write", ""],
      ],
    });
    expect(normalizeBlock({ id: "t", type: "table" }, 0).rows).toEqual([]);
    expect(normalizeBlock({ id: "p", text: "Hi" }, 0)).toEqual({
      id: "p",
      type: "paragraph",
      text: "Hi",
    });
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

  it("writes a table with its first row as the header, and a page link as its title", () => {
    const blocks: Block[] = [
      { id: "1", type: "paragraph", text: "See [[page:notes|Notes]]." },
      {
        id: "2",
        type: "table",
        text: "",
        rows: [
          ["Task", "Status"],
          ["Write **docs**", "Done | checked"],
          ["Two\nlines", "[[page:notes|Notes]]"],
        ],
      },
    ];

    expect(documentToMarkdown("Plan", blocks)).toBe(
      [
        "# Plan",
        "",
        "See Notes.",
        "",
        "| Task | Status |",
        "| --- | --- |",
        "| Write **docs** | Done \\| checked |",
        "| Two<br>lines | Notes |",
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

  it("gives a page an icon, saves it, and takes it away again", () => {
    const storage = memoryStorage();
    const store = testStore(storage);
    store.actions.setPageIcon("home", { kind: "emoji", value: "👋" });

    expect(testStore(storage).getState().pages[0]?.icon).toEqual({
      kind: "emoji",
      value: "👋",
    });

    store.actions.setPageIcon("home", {
      kind: "icon",
      value: "rocket",
      color: "green",
    });
    expect(testStore(storage).getState().pages[0]?.icon).toEqual({
      kind: "icon",
      value: "rocket",
      color: "green",
    });

    store.actions.setPageIcon("home", null);
    expect(testStore(storage).getState().pages[0]).not.toHaveProperty("icon");
  });

  it("toggles a reaction on a comment and saves it", () => {
    const storage = memoryStorage();
    const store = testStore(storage);
    const threadId = store.actions.addThread({
      pageId: "home",
      quote: "q",
      text: "Hi",
    });
    const messageId = store.getState().threads[0]!.messages[0]!.id;

    store.actions.toggleReaction(threadId, messageId, "👍");
    store.actions.toggleReaction(threadId, messageId, "👍", "assistant");
    store.actions.toggleReaction(threadId, messageId, "🎉");
    store.actions.toggleReaction(threadId, messageId, "🎉");

    const saved = testStore(storage).getState().threads[0]!.messages[0]!;
    expect(saved.reactions).toEqual([
      { emoji: "👍", by: "you" },
      { emoji: "👍", by: "assistant" },
    ]);
    expect(reactionCounts(saved.reactions)).toEqual([
      { emoji: "👍", count: 2, mine: true },
    ]);
    expect(reactionCounts(saved.reactions, "assistant")[0]?.mine).toBe(true);
    expect(reactionCounts(undefined)).toEqual([]);
  });

  it("carries a reference to the assistant until it is cleared", () => {
    const store = testStore();
    store.actions.askAssistant({
      kind: "selection",
      pageId: "home",
      text: "A passage",
    });
    store.actions.askAssistant();

    expect(store.getState()).toMatchObject({
      assistantRequests: 2,
      assistantReference: { kind: "selection", text: "A passage" },
    });

    store.actions.clearAssistantReference();
    expect(store.getState().assistantReference).toBeNull();
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

  it("saves the other tab's review with the other tab's copy of the open page", () => {
    const { a, b, saved } = openTabs();
    a.actions.setPageContent("home", written("From A"));
    a.actions.recordEdit({
      pageId: "home",
      before: [],
      after: written("From A").blocks,
    });
    b.hear();

    b.actions.renamePage("notes", "Renamed");
    expect(saved().getState().pendingReview?.pageId).toBe("home");

    b.actions.selectPage("notes");
    expect(b.getState().pendingReview?.pageId).toBe("home");
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

  it("keeps the old text when the same partial text is received again", () => {
    const partial = [{ id: "a", type: "paragraph" as const, text: "N" }];
    let stream = receive(settled(before), partial, true);
    stream = receive(stream, partial, true);

    expect(displayBlocks(stream)[0]?.text).toBe("Old text");
    expect(remaining(stream)).toBe(0);
    expect(streamMarks(stream).working).toEqual(["a"]);

    stream = receive(stream, [...partial, { id: "b" }], true);
    expect(remaining(stream)).toBe(1);
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

describe("a streamed table", () => {
  const before: Block[] = [{ id: "a", type: "paragraph", text: "Intro" }];

  it("shows a table as far as it has arrived, without typing it", () => {
    let stream = settled(before);
    stream = receive(
      stream,
      [before[0]!, { id: "t", type: "table", text: "", rows: [["Task"]] }],
      true,
    );

    expect(displayBlocks(stream)[1]).toEqual({
      id: "t",
      type: "table",
      text: "",
      rows: [["Task"]],
    });
    expect(remaining(stream)).toBe(0);
    expect(streamMarks(stream)).toEqual({ working: [], empty: [] });
    expect(writingBlockId(stream)).toBe("t");

    const whole: Block = {
      id: "t",
      type: "table",
      text: "",
      rows: [
        ["Task", "Status"],
        ["Write", "Done"],
      ],
    };
    stream = receive(stream, [before[0]!, whole], true);
    expect(displayBlocks(stream)[1]).toEqual(whole);

    stream = receive(stream, [before[0]!, whole], false);
    expect(stream.active).toBe(false);
    expect(writingBlockId(stream)).toBeNull();
    expect(displayBlocks(stream)).toEqual([before[0], whole]);
  });

  it("keeps a table the page holds while an edit repeats it", () => {
    const table: Block = {
      id: "t",
      type: "table",
      text: "",
      rows: [
        ["Task", "Status"],
        ["Write", "Done"],
      ],
    };
    const page = [before[0]!, table];
    const partial = (rows?: string[][]) => [
      before[0]!,
      { id: "t", type: "table" as const, text: "", ...(rows && { rows }) },
    ];

    let stream = settled(page);
    for (const rows of [
      undefined,
      [["Ta"]],
      [["Task", "Status"], ["Wr"]],
      [["Task", "Status"], ["Wr"]],
    ]) {
      stream = receive(stream, partial(rows), true);
      expect(displayBlocks(stream)).toEqual(page);
      expect(writingBlockId(stream)).toBe("t");
    }

    stream = receive(stream, partial(table.rows), true);
    expect(displayBlocks(stream)).toEqual(page);
    expect(writingBlockId(stream)).toBeNull();
  });

  it("swaps new rows into a table the page holds once they are whole", () => {
    const table: Block = { id: "t", type: "table", text: "", rows: [["A"]] };
    const next: Block = { ...table, rows: [["A"], ["B"]] };

    let stream = receive(
      settled([table]),
      [{ ...table, rows: [["A"], [""]] }],
      true,
    );
    expect(displayBlocks(stream)).toEqual([table]);

    stream = receive(stream, [next], true);
    expect(displayBlocks(stream)).toEqual([table]);

    const movedOn = receive(
      stream,
      [next, { id: "p", type: "paragraph", text: "" }],
      true,
    );
    expect(displayBlocks(movedOn)[0]).toEqual(next);

    expect(displayBlocks(receive(stream, [next], false))).toEqual([next]);
  });

  it("says which block is being typed", () => {
    const next: Block[] = [
      { id: "a", type: "paragraph", text: "Intro, rewritten" },
    ];
    let stream = receive(settled(before), next, true);
    stream = receive(stream, next, false);

    expect(remaining(stream)).toBeGreaterThan(0);
    expect(writingBlockId(stream)).toBe("a");
  });
});

describe("reviewing an edit", () => {
  const before: Block[] = [
    { id: "h", type: "h2", text: "Today" },
    { id: "a", type: "check", text: "First", checked: true },
    { id: "b", type: "check", text: "Second" },
    { id: "c", type: "check", text: "Third" },
  ];

  it("names the blocks an edit added, rewrote or moved, and counts the ones it took out", () => {
    const after: Block[] = [
      before[0]!,
      { ...before[2]!, text: "Second, reworded" },
      before[3]!,
      { id: "new", type: "h2", text: "Done" },
      before[1]!,
    ];

    expect(reviewOf("home", before, after)).toEqual({
      pageId: "home",
      before,
      changed: ["b", "new", "a"],
      removed: 0,
    });
    expect(reviewOf("home", before, before.slice(0, 2))).toMatchObject({
      changed: [],
      removed: 2,
    });
    expect(reviewOf("home", before, [...before])).toBeNull();
  });

  it("counts a ticked box and a changed table cell as changes", () => {
    const table: Block = { id: "t", type: "table", text: "", rows: [["A"]] };

    expect(
      reviewOf("home", before, [
        before[0]!,
        before[1]!,
        { ...before[2]!, checked: true },
        before[3]!,
      ])?.changed,
    ).toEqual(["b"]);
    expect(
      reviewOf("home", [table], [{ ...table, rows: [["B"]] }])?.changed,
    ).toEqual(["t"]);
  });

  it("names an edit by what it did", () => {
    const task: Block = { id: "n1", type: "check", text: "New" };
    const table: Block = { id: "n2", type: "table", text: "", rows: [["A"]] };
    const summary: Block = { id: "n3", type: "quote", text: "In short." };

    expect(classifyEdit(before, [...before, task])).toBe("tasks");
    expect(classifyEdit(before, [...before, table])).toBe("table");
    expect(classifyEdit(before, [summary, ...before])).toBe("summary");
    expect(
      classifyEdit(before, [
        { id: "r1", type: "h2", text: "Launch" },
        { id: "r2", type: "paragraph", text: "A new plan." },
      ]),
    ).toBe("rewrite");
    expect(
      classifyEdit(before, [
        ...before,
        { id: "n4", type: "paragraph", text: "A note." },
      ]),
    ).toBe("edit");
    expect(classifyEdit(before, [...before])).toBeNull();
  });

  const edited = (): Block[] => [
    ...before,
    { id: "n", type: "check", text: "Fourth" },
  ];

  it("keeps an edit for review in manual mode, and saves the review", () => {
    const storage = memoryStorage();
    const store = testStore(storage);
    store.actions.recordEdit({ pageId: "home", before, after: edited() });

    expect(store.getState()).toMatchObject({
      pendingReview: { pageId: "home", changed: ["n"], removed: 0 },
      lastEdit: { kind: "tasks", pageId: "home" },
      assistantUnseen: true,
    });
    expect(testStore(storage).getState()).toMatchObject({
      pendingReview: { pageId: "home", before, changed: ["n"] },
      assistantUnseen: false,
      lastEdit: null,
    });
  });

  it("lets an edit land in auto mode, and accepts the one waiting when auto is chosen", () => {
    const storage = memoryStorage();
    const store = testStore(storage);
    store.actions.recordEdit({ pageId: "home", before, after: edited() });
    store.actions.setEditMode("auto");

    expect(store.getState().pendingReview).toBeNull();

    store.actions.recordEdit({ pageId: "home", before, after: edited() });
    expect(store.getState()).toMatchObject({
      pendingReview: null,
      lastEdit: { kind: "tasks" },
    });
    expect(testStore(storage).getState().editMode).toBe("auto");
  });

  it("joins an edit to the one still waiting, so undo goes back to the first page", () => {
    const store = testStore();
    const first = edited();
    const second: Block[] = [
      ...first,
      { id: "m", type: "paragraph", text: "A note." },
    ];
    store.actions.recordEdit({ pageId: "home", before, after: first });
    store.actions.recordEdit({ pageId: "home", before: first, after: second });

    expect(store.getState().pendingReview).toMatchObject({
      before,
      changed: ["n", "m"],
    });

    expect(store.actions.undoReview()).toMatchObject({ pageId: "home" });
    expect(store.getState().pendingReview).toBeNull();
    expect(contentOf(store.getState(), "home")).toEqual({
      blocks: before,
      state: null,
    });
  });

  it("accepts a review, and drops it with its page", () => {
    const store = testStore();
    store.actions.recordEdit({ pageId: "notes", before, after: edited() });
    store.actions.acceptReview();
    expect(store.getState().pendingReview).toBeNull();
    expect(store.actions.undoReview()).toBeNull();

    store.actions.recordEdit({ pageId: "notes", before, after: edited() });
    store.actions.deletePage("notes");
    expect(store.getState().pendingReview).toBeNull();
  });

  it("marks the assistant unseen until it is opened", () => {
    const store = testStore();
    store.actions.recordComment("home");

    expect(store.getState()).toMatchObject({
      assistantUnseen: true,
      lastEdit: { kind: "comment", pageId: "home" },
    });

    store.actions.markSeen();
    expect(store.getState().assistantUnseen).toBe(false);
    store.actions.markUnseen();
    expect(store.getState().assistantUnseen).toBe(true);
  });

  it("says where the assistant is writing without telling listeners twice", () => {
    const store = testStore();
    let told = 0;
    store.subscribe(() => told++);

    store.actions.setPresence({ pageId: "home", blockId: "a" });
    store.actions.setPresence({ pageId: "home", blockId: "a" });
    expect(told).toBe(1);

    store.actions.setPresence(null);
    expect(store.getState().assistantPresence).toBeNull();
    expect(told).toBe(2);
  });

  it("keeps the open page's review and takes another page's from the other tab", () => {
    const mine = reviewOf("home", before, edited())!;
    const theirs = reviewOf("notes", before, edited())!;
    const current: DocumentStoreState = { ...seed(), pendingReview: mine };

    expect(
      adoptStored(current, { ...seed(), pendingReview: null }).pendingReview,
    ).toBe(mine);
    expect(
      adoptStored(seed(), { ...seed(), pendingReview: theirs }).pendingReview,
    ).toEqual(theirs);
    expect(adoptStored(seed(), { ...seed(), editMode: "auto" }).editMode).toBe(
      "auto",
    );
  });
});
