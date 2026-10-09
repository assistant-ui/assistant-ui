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
import { OUTLINE_ATTRIBUTE } from "./outline";
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
      <h1>A</h1>
    </Variant>
    <Variant id="b" label="Split">
      <h1>B</h1>
    </Variant>
    <Variant id="c">
      <h1>C</h1>
    </Variant>
  </Variants>
);

const renderWithStore = (ui: ReactNode) =>
  render(<StoreContext.Provider value={store}>{ui}</StoreContext.Provider>);

const switcher = () => {
  const host = document.querySelector(`[${SWITCHER_ATTRIBUTE}]`);
  if (!host?.shadowRoot) throw new Error("switcher not mounted");
  return {
    host: host as HTMLElement,
    ui: within(host.shadowRoot as unknown as HTMLElement),
  };
};

const shown = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-variant]")).map(
    (element) => (element as HTMLElement).dataset["variant"],
  );

beforeEach(() => {
  store = createStore(mountSwitcher);
  setUrl("");
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  store.reset();
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

  it("server-renders the default regardless of the URL", () => {
    setUrl("?variant=hero:c");
    const html = renderToString(
      <StoreContext.Provider value={store}>
        <Hero default="b" />
      </StoreContext.Provider>,
    );
    expect(html).toContain('data-variant="b"');
    expect(html).not.toContain('data-variant="c"');
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

describe("data attributes and show-all", () => {
  it("marks the group and the rendered variant", () => {
    const { container } = renderWithStore(<Hero default="b" />);
    const group = container.querySelector('[data-variant-group="hero"]');
    expect(group?.getAttribute("data-variant-mode")).toBe("single");
    const variant = group?.querySelector('[data-variant="b"]');
    expect(variant?.getAttribute("data-variant-label")).toBe("Split");
    expect(variant?.textContent).toBe("B");
    expect(container.querySelector("[data-variant-caption]")).toBeNull();
  });

  it("renders every variant with captions for ?variant=<group>:all", () => {
    setUrl("?variant=hero:all");
    const { container } = renderWithStore(<Hero />);
    expect(shown(container)).toEqual(["a", "b", "c"]);
    const captions = Array.from(
      container.querySelectorAll("[data-variant-caption]"),
    ).map((element) => element.textContent);
    expect(captions).toEqual([
      "hero · a · Big headline",
      "hero · b · Split",
      "hero · c",
    ]);
    expect(
      container
        .querySelector("[data-variant-group]")
        ?.getAttribute("data-variant-mode"),
    ).toBe("all");
  });

  it("renders every group in full for ?variants=all", () => {
    setUrl("?variants=all");
    const { container } = renderWithStore(
      <>
        <Hero />
        <Variants id="nav">
          <Variant id="x">x</Variant>
          <Variant id="y">y</Variant>
        </Variants>
      </>,
    );
    expect(shown(container)).toEqual(["a", "b", "c", "x", "y"]);
  });
});

describe("switcher", () => {
  it("lists mounted groups and selects a variant, updating the URL", () => {
    window.history.replaceState(null, "", "/page?q=1#top");
    const { container } = renderWithStore(<Hero />);
    const { ui } = switcher();
    expect(ui.getByRole("region", { name: "Design variants" })).toBeTruthy();
    const group = ui.getByRole("group", { name: /^Hero \(hero\)/ });
    const split = within(group).getByRole("button", { name: "Split" });
    expect(split.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(split);

    expect(shown(container)).toEqual(["b"]);
    expect(window.location.search).toBe("?q=1&variant=hero:b");
    expect(window.location.hash).toBe("#top");
    expect(window.sessionStorage.getItem(storageKey("hero"))).toBe("b");
    expect(
      switcher()
        .ui.getByRole("button", { name: "Split" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("cycles with arrow keys and toggles show-all with a", () => {
    const { container } = renderWithStore(<Hero />);
    const { ui, host } = switcher();
    const group = ui.getByRole("group", { name: /^Hero/ });

    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(shown(container)).toEqual(["b"]);
    expect(host.shadowRoot?.activeElement?.textContent).toBe("Split");

    fireEvent.keyDown(host.shadowRoot!.activeElement!, { key: "ArrowLeft" });
    fireEvent.keyDown(host.shadowRoot!.activeElement!, { key: "ArrowLeft" });
    expect(shown(container)).toEqual(["c"]);

    fireEvent.keyDown(switcher().ui.getByRole("group", { name: /^Hero/ }), {
      key: "a",
    });
    expect(shown(container)).toEqual(["a", "b", "c"]);
    expect(window.location.search).toBe("?variant=hero:all");

    fireEvent.keyDown(switcher().ui.getByRole("group", { name: /^Hero/ }), {
      key: "a",
    });
    expect(shown(container)).toEqual(["c"]);
    expect(window.location.search).toBe("?variant=hero:c");
  });

  it("toggles the group and global show-all buttons", () => {
    const { container } = renderWithStore(<Hero />);
    fireEvent.click(switcher().ui.getByRole("button", { name: "All" }));
    expect(shown(container)).toEqual(["a", "b", "c"]);
    fireEvent.click(switcher().ui.getByRole("button", { name: "All" }));
    expect(shown(container)).toEqual(["a"]);
    expect(window.location.search).toBe("?variant=hero:a");

    fireEvent.click(switcher().ui.getByRole("button", { name: "Show all" }));
    expect(shown(container)).toEqual(["a", "b", "c"]);
    expect(window.location.search).toBe("?variant=hero:a&variants=all");
  });

  it("collapses and hides with ?variants=noui", () => {
    renderWithStore(<Hero />);
    fireEvent.click(
      switcher().ui.getByRole("button", { name: "Collapse variant switcher" }),
    );
    expect(switcher().ui.queryByRole("group")).toBeNull();
    fireEvent.click(
      switcher().ui.getByRole("button", { name: "Expand variant switcher" }),
    );
    expect(switcher().ui.getAllByRole("group")).toHaveLength(1);

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
    expect(switcher().ui.getAllByRole("group")).toHaveLength(2);
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
        <Variant id="all">reserved</Variant>
      </Variants>,
    );
    expect(container.textContent).toBe("first");
    expect(messages()).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Group "g" has two <Variant>s with id "x"'),
        expect.stringContaining('<Variants id="g"> only accepts <Variant>'),
        expect.stringContaining('Variant id "all" in group "g" is reserved'),
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
    expect(renderToString(<Hero />)).toContain('data-variant="a"');
  });
});

describe("outline", () => {
  const outlineRoot = () =>
    document.querySelector(`[${OUTLINE_ATTRIBUTE}]`)?.shadowRoot ?? null;
  const labels = () =>
    Array.from(outlineRoot()?.querySelectorAll(".box button") ?? []).map(
      (button) => button.textContent,
    );

  it("outlines the active variant by default with a group · variant · index label", () => {
    renderWithStore(<Hero default="b" />);
    expect(labels()).toEqual(["Hero · Split · 2/3"]);
  });

  it("outlines each variant in show-all mode", () => {
    setUrl("?variant=hero:all");
    renderWithStore(<Hero />);
    expect(labels()).toEqual([
      "Hero · Big headline · 1/3",
      "Hero · Split · 2/3",
      "Hero · c · 3/3",
    ]);
  });

  it("is off with outline={false}", () => {
    renderWithStore(<Hero outline={false} />);
    expect(outlineRoot()).toBeNull();
  });

  it("is off with ?variants=clean, which also hides the switcher", () => {
    setUrl("?variants=clean");
    const { container } = renderWithStore(<Hero />);
    expect(outlineRoot()).toBeNull();
    expect(switcher().host.hidden).toBe(true);
    expect(
      container
        .querySelector('[data-variant="a"]')
        ?.getAttribute("data-variant-label"),
    ).toBe("Big headline");
  });

  it("toggles from the switcher and persists the choice", () => {
    renderWithStore(<Hero />);
    const toggle = switcher().ui.getByRole("button", { name: "Outline" });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(outlineRoot()).toBeNull();
    expect(window.sessionStorage.getItem(OUTLINE_KEY)).toBe("0");

    cleanup();
    store.reset();
    renderWithStore(<Hero />);
    expect(outlineRoot()).toBeNull();
    fireEvent.click(switcher().ui.getByRole("button", { name: "Outline" }));
    expect(labels()).toEqual(["Hero · Big headline · 1/3"]);
    expect(window.sessionStorage.getItem(OUTLINE_KEY)).toBeNull();
  });

  it("focuses the group in the switcher when the label is clicked", () => {
    renderWithStore(<Hero />);
    fireEvent.click(
      switcher().ui.getByRole("button", { name: "Collapse variant switcher" }),
    );
    const label =
      outlineRoot()!.querySelector<HTMLButtonElement>(".box button")!;
    expect(label.tabIndex).toBe(-1);
    fireEvent.click(label);
    const { host } = switcher();
    expect(host.shadowRoot?.activeElement?.getAttribute("role")).toBe("group");
    expect(host.shadowRoot?.activeElement?.getAttribute("aria-label")).toMatch(
      /^Hero \(hero\)/,
    );
  });

  it("adds no layout-affecting styles or elements to the content", () => {
    const { container } = renderWithStore(
      <div style={{ display: "grid" }} data-testid="grid">
        <Hero />
      </div>,
    );
    const group = container.querySelector<HTMLElement>("[data-variant-group]")!;
    const variant = group.querySelector<HTMLElement>("[data-variant]")!;
    expect(group.getAttribute("style")).toBe("display: contents;");
    expect(variant.getAttribute("style")).toBe("display: contents;");
    expect(variant.children).toHaveLength(1);
    expect(variant.firstElementChild?.outerHTML).toBe("<h1>A</h1>");
    expect(container.querySelector(`[${OUTLINE_ATTRIBUTE}]`)).toBeNull();
    expect(outlineRoot()).not.toBeNull();
  });

  it("positions the box around the union of the variant's boxes", () => {
    const rects: Record<string, Partial<DOMRect>> = {
      first: {
        top: 100,
        left: 20,
        right: 220,
        bottom: 140,
        width: 200,
        height: 40,
      },
      second: {
        top: 150,
        left: 10,
        right: 120,
        bottom: 300,
        width: 110,
        height: 150,
      },
    };
    const spy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        return (rects[this.id] ?? {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
        }) as DOMRect;
      });
    try {
      setUrl("?variant=g:all");
      renderWithStore(
        <Variants id="g">
          <Variant id="x">
            <div style={{ display: "contents" }}>
              <p id="first">1</p>
            </div>
            <p id="second">2</p>
          </Variant>
          <Variant id="empty">{null}</Variant>
        </Variants>,
      );
      const boxes = Array.from(
        outlineRoot()!.querySelectorAll<HTMLElement>(".box"),
      );
      expect(boxes[0]!.style.top).toBe("96px");
      expect(boxes[0]!.style.left).toBe("6px");
      expect(boxes[0]!.style.width).toBe("218px");
      expect(boxes[0]!.style.height).toBe("208px");
      expect(boxes[0]!.hasAttribute("data-empty")).toBe(false);
      expect(boxes[1]!.hasAttribute("data-empty")).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it("removes the layer with the last outlined region", () => {
    const { unmount } = renderWithStore(<Hero />);
    expect(outlineRoot()).not.toBeNull();
    unmount();
    expect(outlineRoot()).toBeNull();
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
    expect(switcher().ui.getByRole("button", { name: "two" })).toBeTruthy();
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
