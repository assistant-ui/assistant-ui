// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  load: vi.fn(),
  pathname: "/docs/installation",
}));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => mocks.pathname,
}));
vi.mock("@/lib/search/load-index", async (importOriginal) => ({
  ...(await importOriginal()),
  loadSearchIndex: mocks.load,
}));
vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal()),
  analytics: {
    search: {
      querySubmitted: vi.fn(),
      noResults: vi.fn(),
      resultClicked: vi.fn(),
      askAITriggered: vi.fn(),
    },
  },
}));
import { analytics } from "@/lib/analytics";
import {
  AssistantPanelProvider,
  useAssistantPanel,
} from "@/components/pages/docs/assistant/context";
import { SearchDialog } from "./search-dialog";

const pages = [
  {
    url: "/docs/installation",
    title: "Installation",
    description: "Install assistant-ui",
    headings: [],
  },
  {
    url: "/docs/cloud",
    title: "Assistant Cloud",
    description: "Store conversations",
    headings: [],
  },
  {
    url: "/elements/thread",
    title: "Thread",
    description: "Display a conversation",
    headings: [],
  },
];
beforeEach(() => {
  mocks.pathname = "/docs/installation";
  mocks.load.mockResolvedValue(pages);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => Response.json({ pages: [] })),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("opens a focused palette with categories and no Ask AI action", async () => {
  render(<SearchDialog open onOpenChange={() => {}} />);
  const input = screen.getByRole("combobox", { name: "Search documentation" });
  await screen.findByRole("option", { name: /Assistant Cloud/ });
  await waitFor(() => expect(document.activeElement).toBe(input));
  expect(screen.queryByRole("button", { name: /Ask AI/ })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Docs" }).getAttribute("aria-pressed"),
  ).toBe("false");
  expect(screen.getByRole("button", { name: "Close search" })).toBeTruthy();
});

it("offers category navigation immediately while the search index is pending", () => {
  mocks.load.mockReturnValue(new Promise(() => {}));
  const close = vi.fn();
  render(<SearchDialog open onOpenChange={close} />);

  expect(screen.getByRole("option", { name: /Installation/ })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe("");
  for (const [category, page] of [
    ["Docs", "Installation"],
    ["Elements", "Thread"],
    ["Examples", "AI SDK"],
    ["Design", "Button"],
  ] as const) {
    fireEvent.click(screen.getByRole("button", { name: category }));
    expect(screen.getByRole("option", { name: new RegExp(page) })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
  }
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
  expect(mocks.push).toHaveBeenCalledWith("/design/components/button");
  expect(close).toHaveBeenCalledWith(false);
  expect(fetch).not.toHaveBeenCalled();
});

it("only shows search progress for a query and restores shortcuts when cleared", () => {
  mocks.load.mockReturnValue(new Promise(() => {}));
  render(<SearchDialog open onOpenChange={() => {}} />);
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "history" } });
  expect(screen.getByRole("status").textContent).toBe("Searching…");
  fireEvent.change(input, { target: { value: "   " } });
  expect(screen.getByRole("status").textContent).toBe("");
  expect(screen.getByRole("option", { name: /Installation/ })).toBeTruthy();
});

it("opens a selected result using the arrow keys and Enter", async () => {
  const close = vi.fn();
  render(<SearchDialog open onOpenChange={close} />);
  const input = screen.getByRole("combobox");
  await screen.findByRole("option", { name: /Assistant Cloud/ });
  fireEvent.change(input, { target: { value: "conversation" } });
  const first = await screen.findByRole("option", { name: /Assistant Cloud/ });
  expect(first.getAttribute("aria-selected")).toBe("true");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(mocks.push).toHaveBeenCalledWith("/elements/thread");
  expect(close).toHaveBeenCalledWith(false);
});

it("filters to the selected category and returns focus to the input", async () => {
  render(<SearchDialog open onOpenChange={() => {}} />);
  await screen.findByRole("option", { name: /Assistant Cloud/ });
  fireEvent.click(screen.getByRole("button", { name: "Elements" }));
  expect(screen.queryByRole("option", { name: /Assistant Cloud/ })).toBeNull();
  expect(screen.getByRole("option", { name: /Thread/ })).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("combobox"));
});

it("retains local matches while Jev is unavailable", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
  await act(async () => {
    render(<SearchDialog open onOpenChange={() => {}} />);
  });
  screen.getByRole("option", { name: /Assistant Cloud/ });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "conversation" },
  });
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(screen.getByRole("status").textContent).toBe("2 results");
  expect(screen.getByRole("option", { name: /Assistant Cloud/ })).toBeTruthy();
});

it("lets a failed index load be retried", async () => {
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  render(<SearchDialog open onOpenChange={() => {}} />);
  expect(screen.getByRole("option", { name: /Installation/ })).toBeTruthy();
  fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
  expect(
    await screen.findByRole("option", { name: /Assistant Cloud/ }),
  ).toBeTruthy();
});

it("reports a query only once the index has loaded", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  await act(async () => {
    render(<SearchDialog open onOpenChange={() => {}} />);
  });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "conversation" },
  });
  // Suggestions settle in one pass and the query's own timer runs in the next.
  await act(() => vi.advanceTimersByTimeAsync(2000));
  await act(() => vi.advanceTimersByTimeAsync(2000));
  expect(analytics.search.noResults).not.toHaveBeenCalled();
  expect(analytics.search.querySubmitted).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  });
  await act(() => vi.advanceTimersByTimeAsync(2000));
  expect(analytics.search.querySubmitted).toHaveBeenCalledExactlyOnceWith(
    "conversation",
    2,
  );
});

it("adds every indexed page by category without losing the selected shortcut", async () => {
  const extraPages = [
    { url: "/docs/cli", title: "CLI", description: "", headings: [] },
    {
      url: "/elements/tool-fallback",
      title: "Tool Fallback",
      description: "",
      headings: [],
    },
    {
      url: "/examples/weather",
      title: "Weather",
      description: "",
      headings: [],
    },
    {
      url: "/design/components/badge",
      title: "Badge",
      description: "",
      headings: [],
    },
  ];
  let finish: (records: typeof pages) => void = () => {};
  mocks.load.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(<SearchDialog open onOpenChange={() => {}} />);
  const shortcutCount = screen.getAllByRole("option").length;
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
  const selected = screen.getByRole("option", { selected: true }).textContent;
  await act(async () => {
    finish([...pages, ...extraPages]);
  });
  expect(screen.getAllByRole("option")).toHaveLength(
    shortcutCount + extraPages.length,
  );
  expect(screen.getAllByRole("option", { name: /Installation/ })).toHaveLength(
    1,
  );
  expect(screen.getByRole("status").textContent).toBe("16 pages");
  expect(screen.getByRole("option", { selected: true }).textContent).toBe(
    selected,
  );
  for (const [category, page] of [
    ["Docs", "CLI"],
    ["Elements", "Tool Fallback"],
    ["Examples", "Weather"],
    ["Design", "Badge"],
  ] as const) {
    fireEvent.click(screen.getByRole("button", { name: category }));
    expect(screen.getAllByRole("option")).toHaveLength(4);
    expect(screen.getByRole("option", { name: new RegExp(page) })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("4 pages");
  }
  fireEvent.click(screen.getByRole("button", { name: "All" }));
  expect(screen.getAllByRole("option")).toHaveLength(16);
  expect(fetch).not.toHaveBeenCalled();
});

it("keeps local results in place when Jev recommends an existing match", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async () => Response.json({ pages: [pages[2]] })),
  );
  await act(async () => {
    render(<SearchDialog open onOpenChange={() => {}} />);
  });
  screen.getByRole("option", { name: /Assistant Cloud/ });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "conversation" },
  });
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(screen.getByRole("status").textContent).toBe("2 results");
  const options = screen.getAllByRole("option");
  expect(options).toHaveLength(2);
  expect(options[0]!.textContent).toContain("Assistant Cloud");
  expect(options[0]!.getAttribute("aria-selected")).toBe("true");
  expect(options[1]!.textContent).toContain("Thread");
  expect(screen.queryByText("Suggested pages")).toBeNull();
});

it("adds semantic destinations after local results without moving the selection", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const suggestion = {
    url: "/docs/history",
    title: "Chat History",
    description: "Save messages",
  };
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async () => Response.json({ pages: [suggestion] })),
  );
  const close = vi.fn();
  await act(async () => {
    render(<SearchDialog open onOpenChange={close} />);
  });
  screen.getByRole("option", { name: /Assistant Cloud/ });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "conversation" },
  });
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(screen.getByText("Suggested pages")).toBeTruthy();
  const options = screen.getAllByRole("option");
  expect(options.map((item) => item.textContent)).toEqual([
    expect.stringContaining("Assistant Cloud"),
    expect.stringContaining("Thread"),
    expect.stringContaining("Chat History"),
  ]);
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
  expect(mocks.push).toHaveBeenCalledWith("/docs/cloud");
});

function AssistantPanelProbe() {
  const { open, pendingMessage } = useAssistantPanel();
  return <output>{open ? `panel: ${pendingMessage}` : "panel closed"}</output>;
}

const searchWithAssistant = async (query: string, close = vi.fn()) => {
  render(
    <AssistantPanelProvider>
      <AssistantPanelProbe />
      <SearchDialog open onOpenChange={close} />
    </AssistantPanelProvider>,
  );
  await screen.findByRole("option", { name: /Assistant Cloud/ });
  fireEvent.change(
    screen.getByRole("combobox", { name: "Search documentation" }),
    { target: { value: query } },
  );
  return close;
};

it("hands a query with no results to Ask AI", async () => {
  const close = await searchWithAssistant("useThreadRuntime");
  const action = await screen.findByRole("option", {
    name: "Ask AI about “useThreadRuntime”",
  });
  expect(screen.getByText("No results for “useThreadRuntime”")).toBeTruthy();
  expect(screen.getByText("panel closed")).toBeTruthy();

  fireEvent.click(action);

  expect(close).toHaveBeenCalledWith(false);
  expect(screen.getByText("panel: useThreadRuntime")).toBeTruthy();
  expect(analytics.search.askAITriggered).toHaveBeenCalledWith(
    "useThreadRuntime",
  );
});

it("selects the Ask AI action so Enter opens the panel with the query", async () => {
  await searchWithAssistant("useThreadRuntime");
  const action = await screen.findByRole("option", { name: /Ask AI about/ });
  await waitFor(() =>
    expect(action.getAttribute("aria-selected")).toBe("true"),
  );

  fireEvent.keyDown(
    screen.getByRole("combobox", { name: "Search documentation" }),
    { key: "Enter" },
  );

  expect(screen.getByText("panel: useThreadRuntime")).toBeTruthy();
});

it("offers Ask AI only when a query has no results", async () => {
  await searchWithAssistant("conversation");
  await screen.findByRole("option", { name: /Assistant Cloud/ });
  expect(screen.queryByRole("option", { name: /Ask AI about/ })).toBeNull();
});

it.each(["/components/setup", "/variants-demo"])(
  "does not offer Ask AI on %s, where the assistant is not mounted",
  async (pathname) => {
    mocks.pathname = pathname;
    await searchWithAssistant("useThreadRuntime");
    await screen.findByText("No results for “useThreadRuntime”");
    expect(screen.queryByRole("option", { name: /Ask AI about/ })).toBeNull();
  },
);

const typeWithoutIndex = (query: string) => {
  render(
    <AssistantPanelProvider>
      <SearchDialog open onOpenChange={() => {}} />
    </AssistantPanelProvider>,
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Search documentation" }),
    { target: { value: query } },
  );
};

it("does not offer Ask AI while the index is loading", () => {
  mocks.load.mockReturnValue(new Promise(() => {}));
  typeWithoutIndex("useThreadRuntime");
  expect(screen.queryByRole("option", { name: /Ask AI about/ })).toBeNull();
});

it("does not offer Ask AI after the index fails to load", async () => {
  mocks.load.mockRejectedValue(new Error("offline"));
  typeWithoutIndex("useThreadRuntime");
  await screen.findByRole("button", { name: "Retry" });
  expect(screen.queryByRole("option", { name: /Ask AI about/ })).toBeNull();
});
