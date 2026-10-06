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

const mocks = vi.hoisted(() => ({ push: vi.fn(), load: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => "/docs/installation",
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
    },
  },
}));
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
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
  render(<SearchDialog open onOpenChange={() => {}} />);
  await screen.findByRole("option", { name: /Assistant Cloud/ });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "conversation" },
  });
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toBe("2 results"),
  );
  expect(screen.getByRole("option", { name: /Assistant Cloud/ })).toBeTruthy();
});

it("lets a failed index load be retried", async () => {
  mocks.load.mockRejectedValueOnce(new Error("offline"));
  render(<SearchDialog open onOpenChange={() => {}} />);
  expect(screen.getByRole("option", { name: /Installation/ })).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "conversation" },
  });
  fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
  expect(
    await screen.findByRole("option", { name: /Assistant Cloud/ }),
  ).toBeTruthy();
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

it("promotes a Jev recommendation without duplicating a local match", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async () => Response.json({ pages: [pages[2]] })),
  );
  render(<SearchDialog open onOpenChange={() => {}} />);
  await screen.findByRole("option", { name: /Assistant Cloud/ });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "conversation" },
  });
  await screen.findByText("Suggested pages");
  const options = screen.getAllByRole("option");
  expect(options).toHaveLength(2);
  expect(options[0]!.textContent).toContain("Thread");
  expect(options[1]!.textContent).toContain("Assistant Cloud");
});
