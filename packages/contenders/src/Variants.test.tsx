import {
  act,
  cleanup,
  fireEvent,
  render,
  within,
} from "@testing-library/react";
import { lazy, StrictMode, type ComponentType, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureVariants } from "./config";
import { flushOutlines, OUTLINE_ATTRIBUTE } from "./outline";
import { createStore, OUTLINE_KEY, storageKey, type Store } from "./store";
import { mountSwitcher, SWITCHER_ATTRIBUTE } from "./switcher";
import { StoreContext, Variant, Variants } from "./Variants";

let store: Store;

const setUrl = (search: string) =>
  window.history.replaceState(null, "", `/page${search}`);

const Hero = (props: {
  default?: string;
  persist?: boolean;
  outline?: boolean;
}) => (
  <Variants id="hero" label="Hero" {...props}>
    <Variant id="a" label="Big headline">
      <h1 id="a1">A</h1>
    </Variant>
    <Variant id="b" label="Split">
      <h1 id="b1">B</h1>
    </Variant>
    <Variant id="c">
      <h1 id="c1">C</h1>
    </Variant>
  </Variants>
);

const renderWithStore = (ui: ReactNode) =>
  render(<StoreContext.Provider value={store}>{ui}</StoreContext.Provider>);

const switcherRoot = () => {
  const host = document.querySelector(`[${SWITCHER_ATTRIBUTE}]`);
  if (!host?.shadowRoot) throw new Error("switcher not mounted");
  return host.shadowRoot;
};
const switcher = () => {
  const root = switcherRoot();
  return {
    host: root.host as HTMLElement,
    root,
    ui: within(root as unknown as HTMLElement),
  };
};
const radio = (name: string) => switcher().ui.getByRole("radio", { name });
const active = () => switcherRoot().activeElement as HTMLElement | null;

const shown = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-variant]")).map(
    (element) => (element as HTMLElement).dataset["variant"],
  );

const rects: Record<string, Partial<DOMRect>> = {};
const box = (top: number, left: number, right: number, bottom: number) =>
  ({
    top,
    left,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
  }) as DOMRect;

beforeEach(() => {
  store = createStore(mountSwitcher);
  setUrl("");
  window.sessionStorage.clear();
  for (const key of Object.keys(rects)) delete rects[key];
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (
    this: Element,
  ) {
    const rect = rects[this.id];
    return (rect ? [rect] : []) as unknown as DOMRectList;
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      return (rects[this.id] ?? box(0, 0, 0, 0)) as DOMRect;
    },
  );
});

afterEach(() => {
  cleanup();
  store.reset();
  configureVariants({});
  vi.restoreAllMocks();
});

describe("resolution order", () => {
  it("falls back to the first child", () => {
    const { container } = renderWithStore(<Hero />);
    expect(shown(container)).toEqual(["a"]);
  });

  it("uses default over the first child", () => {
    const { container } = renderWithStore(<Hero default="b" />);
    expect(shown(container)).toEqual(["b"]);
  });

  it("uses sessionStorage over default", () => {
    window.sessionStorage.setItem(storageKey("hero"), "c");
    const { container } = renderWithStore(<Hero default="b" />);
    expect(shown(container)).toEqual(["c"]);
  });

  it("ignores sessionStorage when persist is off", () => {
    window.sessionStorage.setItem(storageKey("hero"), "c");
    const { container } = renderWithStore(<Hero default="b" persist={false} />);
    expect(shown(container)).toEqual(["b"]);
  });

  it("uses the URL over sessionStorage", () => {
    window.sessionStorage.setItem(storageKey("hero"), "c");
    setUrl("?variant=hero:a");
    const { container } = renderWithStore(<Hero default="b" />);
    expect(shown(container)).toEqual(["a"]);
  });

  it("server-renders the default, unwrapped, regardless of the URL", () => {
    setUrl("?variant=hero:c");
    const html = renderToString(
      <StoreContext.Provider value={store}>
        <Hero default="b" />
      </StoreContext.Provider>,
    );
    expect(html).toBe('<h1 id="b1">B</h1>');
  });

  it("unmounts inactive variants", () => {
    const effects: string[] = [];
    const Probe = ({ name }: { name: string }) => {
      effects.push(name);
      return null;
    };
    renderWithStore(
      <Variants id="g">
        <Variant id="x">
          <Probe name="x" />
        </Variant>
        <Variant id="y">
          <Probe name="y" />
        </Variant>
      </Variants>,
    );
    expect(effects).not.toContain("y");
  });
});

describe("zero layout impact", () => {
  const Fixture = ({ wrapped }: { wrapped: boolean }) => {
    const rows = (
      <>
        <tr>
          <td>1</td>
        </tr>
        <tr>
          <td>2</td>
        </tr>
      </>
    );
    const items = (
      <>
        <li>first</li>
        <li>second</li>
      </>
    );
    return (
      <div>
        <ul style={{ display: "flex", gap: 8 }}>
          {wrapped ? (
            <Variants id="list">
              <Variant id="a">{items}</Variant>
            </Variants>
          ) : (
            items
          )}
          <li>last</li>
        </ul>
        <table>
          <tbody>
            {wrapped ? (
              <Variants id="rows">
                <Variant id="a">{rows}</Variant>
              </Variants>
            ) : (
              rows
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const strip = (html: string) =>
    html.replace(/ data-variant(-group|-label)?="[^"]*"/g, "");

  it("renders the same DOM as the children rendered directly", () => {
    const plain = render(<Fixture wrapped={false} />).container.innerHTML;
    cleanup();
    const { container } = renderWithStore(<Fixture wrapped />);
    expect(strip(container.innerHTML)).toBe(plain);
    const list = container.querySelector("ul")!;
    expect(list.children).toHaveLength(3);
    expect(list.firstElementChild?.textContent).toBe("first");
    expect(list.querySelector(":scope > li + li")?.textContent).toBe("second");
    expect(container.querySelectorAll("tbody > tr")).toHaveLength(2);
  });

  it("puts the data hooks on the variant's own top-level elements", () => {
    const { container } = renderWithStore(<Hero default="b" />);
    const heading = container.querySelector("h1")!;
    expect(heading.getAttribute("data-variant-group")).toBe("hero");
    expect(heading.getAttribute("data-variant")).toBe("b");
    expect(heading.getAttribute("data-variant-label")).toBe("Split");
    expect(heading.getAttribute("style")).toBeNull();
    expect(container.children).toHaveLength(1);
  });

  it("keeps an inner group's hooks on an element both groups share", () => {
    const { container } = renderWithStore(
      <Variants id="outer">
        <Variant id="x">
          <Variants id="inner">
            <Variant id="y">
              <p>shared</p>
            </Variant>
          </Variants>
        </Variant>
      </Variants>,
    );
    expect(
      container.querySelector("p")!.getAttribute("data-variant-group"),
    ).toBe("inner");
  });

  it("accepts a variant named all", () => {
    setUrl("?variant=g:all");
    const { container } = renderWithStore(
      <Variants id="g">
        <Variant id="one">1</Variant>
        <Variant id="all">everything</Variant>
      </Variants>,
    );
    expect(container.textContent).toBe("everything");
  });
});

describe("nesting", () => {
  const Nested = () => (
    <Variants id="features" label="Feature list">
      <Variant id="grid" label="Grid">
        <Variants id="card-style" label="Card style">
          <Variant id="outlined">outlined</Variant>
          <Variant id="filled">filled</Variant>
        </Variants>
      </Variant>
      <Variant id="list" label="List">
        list
      </Variant>
    </Variants>
  );

  it("registers a nested group with its parent variant", () => {
    renderWithStore(<Nested />);
    const inner = store
      .getSnapshot()
      .groups.find((group) => group.id === "card-style");
    expect(inner?.parent).toEqual({ group: "features", variant: "grid" });
    expect(
      store.getSnapshot().groups.find((group) => group.id === "features")
        ?.parent,
    ).toBeUndefined();
  });

  it("shows the nested group indented under its parent only while that variant is selected", () => {
    renderWithStore(<Nested />);
    const panels = () =>
      Array.from(
        switcherRoot().querySelectorAll<HTMLElement>(
          "[data-group-panel]:not([data-leaving])",
        ),
      ).map((panel) => [panel.dataset["groupPanel"], panel.dataset["depth"]]);
    expect(panels()).toEqual([
      ["features", undefined],
      ["card-style", "1"],
    ]);
    fireEvent.click(radio("List"));
    expect(panels()).toEqual([["features", undefined]]);
  });

  it("keeps a nested selection when the parent switches away and back", () => {
    renderWithStore(<Nested />);
    fireEvent.click(radio("filled"));
    fireEvent.click(radio("List"));
    expect(window.location.search).toBe(
      "?variant=card-style:filled&variant=features:list",
    );
    fireEvent.click(radio("Grid"));
    expect(radio("filled").getAttribute("aria-checked")).toBe("true");
  });

  it("ignores a stale nested selection whose parent is hidden", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setUrl("?variant=features:list&variant=card-style:filled");
    const { container } = renderWithStore(<Nested />);
    expect(container.textContent).toBe("list");
    expect(error).not.toHaveBeenCalled();
  });
});

describe("switcher", () => {
  it("lists mounted groups and selects a variant, updating the URL", () => {
    window.history.replaceState(null, "", "/page?q=1#top");
    const { container } = renderWithStore(<Hero />);
    const { ui } = switcher();
    expect(ui.getByRole("region", { name: "Design variants" })).toBeTruthy();
    const group = ui.getByRole("radiogroup", { name: "Hero" });
    const split = within(group).getByRole("radio", { name: "Split" });
    expect(split.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(split);

    expect(shown(container)).toEqual(["b"]);
    expect(window.location.search).toBe("?q=1&variant=hero:b");
    expect(window.location.hash).toBe("#top");
    expect(window.sessionStorage.getItem(storageKey("hero"))).toBe("b");
    expect(radio("Split").getAttribute("aria-checked")).toBe("true");
  });

  it("reserves the selected weight so selecting never changes a segment's size", () => {
    renderWithStore(<Hero />);
    const segment = radio("Split");
    const labels = segment.querySelectorAll(".stack > span");
    expect(Array.from(labels).map((label) => label.textContent)).toEqual([
      "Split",
      "Split",
    ]);
    expect(labels[1]!.getAttribute("aria-hidden")).toBe("true");
    const normalize = (html: string) =>
      html.replace(/ (aria-checked|tabindex)="[^"]*"/g, "");
    const before = normalize(segment.outerHTML);
    fireEvent.click(segment);
    expect(normalize(segment.outerHTML)).toBe(before);
  });

  it("keeps switcher elements across state changes so transitions run", () => {
    renderWithStore(<Hero />);
    const before = radio("Split");
    fireEvent.click(before);
    expect(radio("Split")).toBe(before);
  });

  it("is a single tab stop that follows the checked variant", () => {
    renderWithStore(
      <>
        <Hero />
        <Variants id="nav" label="Nav">
          <Variant id="x">x</Variant>
          <Variant id="y">y</Variant>
        </Variants>
      </>,
    );
    const stops = () =>
      Array.from(switcherRoot().querySelectorAll<HTMLElement>("[role=radio]"))
        .filter((item) => item.tabIndex === 0)
        .map((item) => item.dataset["key"]);
    expect(stops()).toEqual(["hero:a"]);
    fireEvent.click(radio("Split"));
    expect(stops()).toEqual(["hero:b"]);
  });

  it("moves and selects with Left/Right/Home/End and moves rows with Up/Down", () => {
    const { container } = renderWithStore(
      <>
        <Hero />
        <Variants id="nav" label="Nav">
          <Variant id="x">
            <span>x</span>
          </Variant>
          <Variant id="y">
            <span>y</span>
          </Variant>
        </Variants>
      </>,
    );
    radio("Big headline").focus();
    fireEvent.keyDown(active()!, { key: "ArrowRight" });
    expect(shown(container)).toEqual(["b", "x"]);
    expect(active()?.textContent).toContain("Split");
    fireEvent.keyDown(active()!, { key: "End" });
    expect(shown(container)).toEqual(["c", "x"]);
    fireEvent.keyDown(active()!, { key: "Home" });
    expect(shown(container)).toEqual(["a", "x"]);
    fireEvent.keyDown(active()!, { key: "ArrowLeft" });
    expect(shown(container)).toEqual(["c", "x"]);
    expect(window.location.search).toBe("?variant=hero:c");

    fireEvent.keyDown(active()!, { key: "ArrowDown" });
    expect(active()?.dataset["key"]).toBe("nav:x");
    expect(shown(container)).toEqual(["c", "x"]);
    fireEvent.keyDown(active()!, { key: "ArrowDown" });
    expect(active()?.dataset["key"]).toBe("nav:x");
    fireEvent.keyDown(active()!, { key: "ArrowUp" });
    expect(active()?.dataset["key"]).toBe("hero:c");
  });

  it("focuses the list with Alt+V, skips editable targets, and returns focus with Escape", () => {
    renderWithStore(
      <>
        <input aria-label="search" />
        <button type="button">page</button>
        <Hero default="b" />
      </>,
    );
    const page = document.querySelector<HTMLButtonElement>("button")!;
    const input = document.querySelector("input")!;
    input.focus();
    fireEvent.keyDown(input, { code: "KeyV", key: "√", altKey: true });
    expect(active()).toBeNull();

    page.focus();
    fireEvent.keyDown(page, { code: "KeyV", key: "√", altKey: true });
    expect(active()?.dataset["key"]).toBe("hero:b");
    fireEvent.keyDown(active()!, { key: "Escape" });
    expect(document.activeElement).toBe(page);
  });

  it("expands a collapsed switcher for the shortcut and honours a custom one", () => {
    configureVariants({ shortcut: { code: "KeyK", ctrl: true } });
    renderWithStore(<Hero />);
    fireEvent.click(
      switcher().ui.getByRole("button", { name: "Collapse variant switcher" }),
    );
    fireEvent.keyDown(document.body, { code: "KeyV", altKey: true });
    expect(switcher().ui.queryByRole("radio")).toBeNull();
    fireEvent.keyDown(document.body, { code: "KeyK", ctrlKey: true });
    expect(active()?.dataset["key"]).toBe("hero:a");
    expect(switcherRoot().querySelector("footer")!.textContent).toContain(
      "Ctrl+K",
    );
    configureVariants({ shortcut: false });
    expect(switcherRoot().querySelector("footer")!.textContent).not.toContain(
      "Ctrl+K",
    );
  });

  it("collapses and hides with ?variants=noui", () => {
    renderWithStore(<Hero />);
    fireEvent.click(
      switcher().ui.getByRole("button", { name: "Collapse variant switcher" }),
    );
    expect(switcher().ui.queryByRole("radiogroup")).toBeNull();
    fireEvent.click(
      switcher().ui.getByRole("button", { name: "Expand variant switcher" }),
    );
    expect(switcher().ui.getAllByRole("radiogroup")).toHaveLength(1);

    cleanup();
    store.reset();
    setUrl("?variants=noui");
    renderWithStore(<Hero />);
    expect(switcher().host.hidden).toBe(true);
  });

  it("mounts one switcher for many groups and removes it with the last", () => {
    const { unmount } = renderWithStore(
      <StrictMode>
        <Hero />
        <Variants id="nav" label="Nav">
          <Variant id="x">x</Variant>
        </Variants>
      </StrictMode>,
    );
    expect(document.querySelectorAll(`[${SWITCHER_ATTRIBUTE}]`)).toHaveLength(
      1,
    );
    expect(switcher().ui.getAllByRole("radiogroup")).toHaveLength(2);
    unmount();
    expect(document.querySelector(`[${SWITCHER_ATTRIBUTE}]`)).toBeNull();
  });

  it("follows popstate", () => {
    const { container } = renderWithStore(<Hero />);
    setUrl("?variant=hero:c");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(shown(container)).toEqual(["c"]);
  });
});

describe("anchoring", () => {
  const ROW = 60;
  const Tree = () => (
    <>
      <Variants id="parent" label="Parent">
        <Variant id="plain" label="Plain">
          <p>plain</p>
        </Variant>
        <Variant id="nested" label="Nested">
          <Variants id="child" label="Child">
            <Variant id="one">
              <p>one</p>
            </Variant>
            <Variant id="two">
              <p>two</p>
            </Variant>
          </Variants>
        </Variant>
      </Variants>
      <Variants id="after" label="After">
        <Variant id="x">
          <p>x</p>
        </Variant>
        <Variant id="y">
          <p>y</p>
        </Variant>
      </Variants>
    </>
  );

  // Rows are 60px tall, the list scrolls inside a 120px box and moves with
  // its translateY, so a stationary control keeps the same `top`.
  const mockLayout = () => {
    const list = switcherRoot().querySelector<HTMLElement>(".list")!;
    const scroll = list.parentElement!;
    Object.defineProperty(scroll, "clientHeight", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(scroll, "scrollHeight", {
      configurable: true,
      get: () => list.children.length * ROW,
    });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        const slot = this.closest?.(".slot");
        if (!slot || slot.parentElement !== list) return box(0, 0, 0, 0);
        const index = Array.from(list.children).indexOf(slot);
        const shift = Number.parseFloat(
          /-?[\d.]+/.exec(list.style.transform)?.[0] ?? "0",
        );
        const top = index * ROW - scroll.scrollTop + shift;
        return box(top, 0, 100, top + ROW);
      },
    );
    return scroll;
  };

  it("keeps the clicked segment still when a nested group appears below it", () => {
    renderWithStore(<Tree />);
    const scroll = mockLayout();
    const nested = radio("Nested");
    const top = nested.getBoundingClientRect().top;
    fireEvent.click(nested);
    expect(
      switcher().ui.getByRole("radiogroup", { name: "Child" }),
    ).toBeTruthy();
    expect(radio("Nested").getBoundingClientRect().top).toBe(top);
    expect(scroll.scrollTop).toBe(0);
  });

  it("compensates when rows are inserted above the control", () => {
    renderWithStore(<Tree />);
    const scroll = mockLayout();
    const y = radio("y");
    const top = y.getBoundingClientRect().top;
    fireEvent.click(y);
    act(() => {
      store.register({
        id: "late",
        label: "Late",
        variants: [{ id: "a", label: "a" }],
        defaultId: undefined,
        persist: false,
        parent: { group: "parent", variant: "plain" },
      });
    });
    expect(radio("y")).toBe(y);
    expect(y.getBoundingClientRect().top).toBe(top);
    expect(scroll.scrollTop).toBe(ROW);
  });

  it("holds with a temporary shift when the list cannot scroll far enough", () => {
    renderWithStore(<Tree />);
    const scroll = mockLayout();
    fireEvent.click(radio("Nested"));
    const x = radio("x");
    fireEvent.click(x);
    const top = x.getBoundingClientRect().top;
    act(() => {
      store.select("parent", "plain");
    });
    const list = switcherRoot().querySelector<HTMLElement>(".list")!;
    expect(scroll.scrollTop).toBe(0);
    expect(list.style.transform).toBe(`translateY(${ROW}px)`);
    expect(x.getBoundingClientRect().top).toBe(top);

    fireEvent.wheel(scroll);
    expect(list.style.transform).toBe("");
  });

  it("keeps focus on the same segment element across reconciles", () => {
    renderWithStore(<Tree />);
    const x = radio("x");
    x.focus();
    fireEvent.keyDown(x, { key: "ArrowRight" });
    const y = radio("y");
    expect(active()).toBe(y);
    fireEvent.click(radio("Nested"));
    y.focus();
    act(() => {
      store.select("parent", "plain");
    });
    expect(active()).toBe(y);
    expect(radio("y")).toBe(y);
  });

  it("animates rows below the control in and out, and skips the animation with reduced motion", () => {
    renderWithStore(<Tree />);
    fireEvent.click(radio("Nested"));
    const row = switcherRoot().querySelector<HTMLElement>(
      '[data-group-panel="child"]',
    )!;
    expect(row.hasAttribute("data-animate")).toBe(true);
    fireEvent.click(radio("Plain"));
    expect(row.hasAttribute("data-leaving")).toBe(true);
    expect(row.getAttribute("aria-hidden")).toBe("true");

    cleanup();
    store.reset();
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      renderWithStore(<Tree />);
      fireEvent.click(radio("Nested"));
      const instant = switcherRoot().querySelector<HTMLElement>(
        '[data-group-panel="child"]',
      )!;
      expect(instant.hasAttribute("data-animate")).toBe(false);
      fireEvent.click(radio("Plain"));
      expect(
        switcherRoot().querySelector('[data-group-panel="child"]'),
      ).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });
});

describe("hover and focus linking", () => {
  const outlineRoot = () =>
    document.querySelector(`[${OUTLINE_ATTRIBUTE}]`)?.shadowRoot ?? null;
  const tab = () => outlineRoot()!.querySelector<HTMLElement>(".tab")!;
  const row = (group: string) =>
    switcherRoot().querySelector<HTMLElement>(`[data-group-panel="${group}"]`)!;

  it("highlights the page outline while a switcher row is hovered or focused", () => {
    rects["a1"] = box(100, 0, 200, 150);
    renderWithStore(<Hero outline={false} />);
    act(() => flushOutlines());
    expect(tab().hasAttribute("data-hover")).toBe(false);

    fireEvent.pointerOver(radio("Split"));
    expect(tab().hasAttribute("data-hover")).toBe(true);
    expect(store.getSnapshot().highlight).toEqual({
      group: "hero",
      source: "switcher",
    });
    fireEvent.pointerOut(radio("Split"), { relatedTarget: document.body });
    expect(tab().hasAttribute("data-hover")).toBe(false);

    fireEvent.focusIn(
      switcher().ui.getByRole("button", { name: "Copy prompt for Hero" }),
    );
    expect(tab().hasAttribute("data-hover")).toBe(true);
    fireEvent.focusOut(
      switcher().ui.getByRole("button", { name: "Copy prompt for Hero" }),
    );
    expect(tab().hasAttribute("data-hover")).toBe(false);
  });

  it("highlights the switcher row while its region is hovered on the page", () => {
    rects["a1"] = box(100, 0, 200, 150);
    renderWithStore(<Hero />);
    act(() => {
      window.dispatchEvent(
        new MouseEvent("pointermove", { clientX: 50, clientY: 120 }),
      );
      flushOutlines();
    });
    expect(row("hero").hasAttribute("data-highlight")).toBe(true);
    act(() => {
      document.documentElement.dispatchEvent(new Event("pointerleave"));
    });
    expect(row("hero").hasAttribute("data-highlight")).toBe(false);
  });

  it("offers to scroll to an off-screen region", () => {
    rects["a1"] = box(2000, 0, 200, 2100);
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    renderWithStore(<Hero />);
    fireEvent.pointerOver(radio("Split"));
    const hint = switcher().ui.getByRole("button", {
      name: "Scroll down to hero",
    });
    expect(hint.textContent).toBe("↓ Off-screen");
    fireEvent.click(hint);
    expect(scroll).toHaveBeenCalledWith(
      expect.objectContaining({ block: "center" }),
    );
  });

  it("does nothing in clean mode", () => {
    setUrl("?variants=clean");
    renderWithStore(<Hero />);
    expect(outlineRoot()?.querySelector(".box") ?? null).toBeNull();
    expect(switcher().host.hidden).toBe(true);
  });
});

describe("outline", () => {
  const outlineRoot = () =>
    document.querySelector(`[${OUTLINE_ATTRIBUTE}]`)?.shadowRoot ?? null;
  const texts = (selector: string) =>
    Array.from(outlineRoot()?.querySelectorAll(selector) ?? []).map(
      (element) => element.textContent,
    );
  const tab = () => outlineRoot()!.querySelector<HTMLElement>(".tab")!;
  const hover = (x: number, y: number) => {
    act(() => {
      window.dispatchEvent(
        new MouseEvent("pointermove", { clientX: x, clientY: y }),
      );
      flushOutlines();
    });
  };

  it("outlines the active variant with a group · variant · index tab", () => {
    renderWithStore(<Hero default="b" />);
    expect(texts(".tab")).toEqual(["Hero · Split · 2/3"]);
    expect(tab().dataset["mode"]).toBe("always");
  });

  it("draws square frames that hug the content's own boxes", () => {
    rects["b1"] = box(100, 20, 220, 140);
    renderWithStore(<Hero default="b" />);
    act(() => flushOutlines());
    const frame = outlineRoot()!.querySelector<HTMLElement>(".box")!;
    expect([
      frame.style.top,
      frame.style.left,
      frame.style.width,
      frame.style.height,
    ]).toEqual(["97px", "17px", "206px", "46px"]);
  });

  it("only reveals the tab on hover with outline={false}", () => {
    rects["g1"] = box(100, 0, 200, 150);
    renderWithStore(
      <Variants id="g" label="Group" outline={false}>
        <Variant id="x" label="X">
          <p id="g1">x</p>
        </Variant>
      </Variants>,
    );
    act(() => flushOutlines());
    expect(tab().dataset["mode"]).toBe("hover");
    expect(tab().hasAttribute("data-hover")).toBe(false);
    hover(50, 120);
    expect(tab().hasAttribute("data-hover")).toBe(true);
    expect(tab().textContent).toBe("Group · X · 1/1");
    hover(500, 500);
    expect(tab().hasAttribute("data-hover")).toBe(false);
  });

  it("follows switches without tearing the layer down, and keeps hover over the tab", async () => {
    rects["h1"] = box(100, 0, 200, 150);
    rects["h2"] = box(100, 0, 200, 150);
    renderWithStore(
      <Variants id="g" label="G" outline={false}>
        <Variant id="x" label="X">
          <p id="h1">x</p>
        </Variant>
        <Variant id="y" label="Y">
          <p id="h2">y</p>
        </Variant>
      </Variants>,
    );
    act(() => flushOutlines());
    hover(50, 120);
    tab().id = "tab";
    rects["tab"] = box(70, 0, 120, 90);
    hover(10, 80);
    expect(tab().hasAttribute("data-hover")).toBe(true);

    const layer = outlineRoot();
    fireEvent.click(radio("Y"));
    expect(outlineRoot()).toBe(layer);
    expect(texts(".tab")).toEqual(["G · Y · 2/2"]);

    window.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 50, clientY: 120 }),
    );
    window.dispatchEvent(new Event("resize"));
    await act(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    expect(tab().hasAttribute("data-hover")).toBe(true);
  });

  it("toggles from the switcher to hover-only and persists the choice", () => {
    renderWithStore(<Hero />);
    const toggle = switcher().ui.getByRole("button", { name: "Outline" });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(tab().dataset["mode"]).toBe("hover");
    expect(window.sessionStorage.getItem(OUTLINE_KEY)).toBe("0");

    cleanup();
    store.reset();
    renderWithStore(<Hero />);
    expect(tab().dataset["mode"]).toBe("hover");
    fireEvent.click(switcher().ui.getByRole("button", { name: "Outline" }));
    expect(tab().dataset["mode"]).toBe("always");
    expect(window.sessionStorage.getItem(OUTLINE_KEY)).toBeNull();
  });

  it("focuses the group's checked variant in the switcher when the tab is clicked", () => {
    renderWithStore(<Hero />);
    fireEvent.click(
      switcher().ui.getByRole("button", { name: "Collapse variant switcher" }),
    );
    expect(tab().tabIndex).toBe(-1);
    fireEvent.click(tab());
    expect(active()?.dataset["key"]).toBe("hero:a");
  });

  it("steps nested frames apart using the React nesting", () => {
    rects["outer1"] = box(100, 20, 220, 140);
    rects["inner"] = box(160, 20, 100, 200);
    renderWithStore(
      <Variants id="outer">
        <Variant id="x">
          <div style={{ display: "contents" }}>
            <p id="outer1">1</p>
          </div>
          <Variants id="inner">
            <Variant id="y">
              <p id="inner">2</p>
            </Variant>
          </Variants>
        </Variant>
      </Variants>,
    );
    act(() => flushOutlines());
    const boxes = Array.from(
      outlineRoot()!.querySelectorAll<HTMLElement>(".box"),
    ).map((element) => [
      element.style.top,
      element.style.left,
      element.style.width,
      element.style.height,
    ]);
    expect(boxes).toHaveLength(2);
    expect(boxes).toEqual(
      expect.arrayContaining([
        ["93px", "13px", "214px", "114px"],
        ["157px", "17px", "86px", "46px"],
      ]),
    );
  });

  it("removes the layer a frame after the last outlined region", async () => {
    const { unmount } = renderWithStore(<Hero />);
    expect(outlineRoot()).not.toBeNull();
    unmount();
    await act(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    expect(outlineRoot()).toBeNull();
  });
});

describe("dev validation", () => {
  const errors = () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    return () => spy.mock.calls.map((call) => String(call[0]));
  };

  it("reports duplicate variant ids, bad defaults and foreign children", () => {
    const messages = errors();
    const { container } = renderWithStore(
      <Variants id="g" default="nope">
        <Variant id="x">first</Variant>
        <Variant id="x">second</Variant>
        <div>stray</div>
        <Variant id="a:b">colon</Variant>
      </Variants>,
    );
    expect(container.textContent).toBe("first");
    expect(messages()).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Group "g" has two <Variant>s with id "x"'),
        expect.stringContaining('<Variants id="g"> only accepts <Variant>'),
        expect.stringContaining('Variant id "a:b" in group "g" contains ":"'),
        expect.stringContaining('default="nope" matches no <Variant>'),
      ]),
    );
  });

  it("reports duplicate group ids and unknown URL selections", () => {
    const messages = errors();
    setUrl("?variant=hero:zzz");
    renderWithStore(
      <>
        <Hero />
        <Hero />
      </>,
    );
    expect(messages()).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Two mounted <Variants> share the id "hero"'),
        expect.stringContaining('Selected variant "zzz"'),
      ]),
    );
  });

  it("reports a Variant outside Variants", () => {
    const messages = errors();
    renderWithStore(<Variant id="lonely">x</Variant>);
    expect(messages()).toEqual([
      expect.stringContaining('<Variant id="lonely"> rendered outside'),
    ]);
  });

  it("stays silent in production with the escape hatch", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const messages = errors();
      const { container } = renderWithStore(
        <Variants id="g" default="nope" allowInProduction>
          <Variant id="x">x</Variant>
        </Variants>,
      );
      expect(container.textContent).toBe("x");
      expect(messages()).toEqual([]);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("production guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws while rendering in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => renderToString(<Hero />)).toThrow(
      /<Variants id="hero"> rendered in a production build/,
    );
  });

  it("renders in production with CONTENDERS_ALLOW_IN_PRODUCTION", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONTENDERS_ALLOW_IN_PRODUCTION", "1");
    expect(renderToString(<Hero />)).toBe('<h1 id="a1">A</h1>');
  });
});

describe("server component children", () => {
  const syncLazy = (component: ComponentType<any>) =>
    lazy(
      () =>
        ({
          then(resolve: (module: { default: ComponentType<any> }) => void) {
            resolve({ default: component });
          },
        }) as unknown as Promise<{ default: ComponentType<any> }>,
    );

  it("accepts <Variant> passed as a lazy client reference", () => {
    const LazyVariant = syncLazy(Variant);
    const Pending = lazy(
      () => new Promise<{ default: typeof Variant }>(() => {}),
    );
    const { container } = renderWithStore(
      <Variants id="rsc">
        <LazyVariant id="one">one</LazyVariant>
        <Pending id="two">two</Pending>
      </Variants>,
    );
    expect(container.textContent).toBe("one");
    expect(radio("two")).toBeTruthy();
  });

  it("rejects a lazy component that resolves to something else", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const Other = syncLazy(() => <p>other</p>);
    const { container } = renderWithStore(
      <Variants id="rsc">
        <Variant id="one">one</Variant>
        <Other id="two" />
      </Variants>,
    );
    expect(container.textContent).toBe("one");
    expect(spy.mock.calls.map((call) => String(call[0]))).toEqual([
      expect.stringContaining("only accepts <Variant> children"),
    ]);
  });
});
