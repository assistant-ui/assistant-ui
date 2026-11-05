// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { DocsTableOfContents } from "./toc";

it("observes the current page's headings and releases them when the page changes", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const viewport = {
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", () => viewport);
  const observers: {
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }[] = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor() {
        observers.push(this);
      }
    },
  );
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (id: string) =>
    act(async () =>
      root.render(
        <>
          <h2 id={id}>Current heading</h2>
          <DocsTableOfContents
            items={[{ title: "Current heading", url: `#${id}`, depth: 2 }]}
          >
            <button>Copy page</button>
          </DocsTableOfContents>
        </>,
      ),
    );
  try {
    await render("install");
    expect(container.querySelector('a[href="#install"]')?.textContent).toBe(
      "Current heading",
    );
    expect(observers[0]!.observe).toHaveBeenCalledWith(
      container.querySelector("h2"),
    );
    await render("usage");
    expect(observers[0]!.disconnect).toHaveBeenCalledOnce();
    expect(observers[1]!.observe).toHaveBeenCalledWith(
      container.querySelector("h2"),
    );
    expect(container.querySelector('a[href="#install"]')).toBeNull();
    expect(container.querySelector("button")?.textContent).toBe("Copy page");
    await act(async () =>
      root.render(
        <DocsTableOfContents items={[]}>
          <button>Copy page</button>
        </DocsTableOfContents>,
      ),
    );
    expect(observers[1]!.disconnect).toHaveBeenCalledOnce();
    expect(container.querySelector("button")).toBeNull();
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});

it("does no heading observation while the TOC is hidden and resumes when it becomes visible", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let onChange = () => {};
  const viewport = {
    matches: false,
    addEventListener: (_: string, listener: () => void) => {
      onChange = listener;
    },
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", () => viewport);
  const observe = vi.fn();
  const disconnect = vi.fn();
  const Observer = vi.fn(function () {
    return { observe, disconnect };
  });
  vi.stubGlobal("IntersectionObserver", Observer);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <>
          <h2 id="setup">Setup</h2>
          <DocsTableOfContents
            items={[{ title: "Setup", url: "#setup", depth: 2 }]}
          />
        </>,
      ),
    );
    expect(Observer).not.toHaveBeenCalled();
    viewport.matches = true;
    await act(async () => onChange());
    expect(Observer).toHaveBeenCalledOnce();
    expect(observe).toHaveBeenCalledWith(container.querySelector("h2"));
    viewport.matches = false;
    await act(async () => onChange());
    expect(disconnect).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
    expect(viewport.removeEventListener).toHaveBeenCalledWith(
      "change",
      onChange,
    );
    container.remove();
    vi.unstubAllGlobals();
  }
});

it.each([
  ["café-配置", "#caf%C3%A9-%E9%85%8D%E7%BD%AE"],
  ['quoted"id', "#quoted%22id"],
  ["literal%id", "#literal%25id"],
])(
  "tracks the rendered heading %s from an encoded fragment",
  async (id, url) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    const observe = vi.fn();
    let notify: (
      entries: { isIntersecting: boolean; target: Element }[],
    ) => void;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = observe;
        disconnect() {}
        constructor(callback: typeof notify) {
          notify = callback;
        }
      },
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <>
            <h2 id={id}>Current heading</h2>
            <DocsTableOfContents
              items={[{ title: "Current heading", url, depth: 2 }]}
            />
          </>,
        ),
      );
      const heading = container.querySelector("h2")!;
      expect(observe).toHaveBeenCalledWith(heading);
      const item = container.querySelector("li")!;
      const scrollIntoView = vi.fn();
      item.scrollIntoView = scrollIntoView;
      await act(async () =>
        notify([{ isIntersecting: true, target: heading }]),
      );
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "nearest",
      });
      expect(container.querySelector("a")?.getAttribute("href")).toBe(url);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.unstubAllGlobals();
    }
  },
);
