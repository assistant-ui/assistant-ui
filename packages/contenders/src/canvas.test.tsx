import {
  act,
  cleanup,
  fireEvent,
  render,
  within,
} from "@testing-library/react";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CANVAS_ATTRIBUTE, mountCanvas } from "./canvas";
import { createStore, type Store } from "./store";
import { mountSwitcher, SWITCHER_ATTRIBUTE } from "./switcher";
import { StoreContext, Variant, Variants } from "./Variants";

let store: Store;

const setUrl = (search: string) =>
  window.history.replaceState(null, "", `/page${search}`);

const Theme = createContext("page");

function Probe({ name }: { name: string }) {
  const theme = useContext(Theme);
  return (
    <p>
      {name} in {theme}
    </p>
  );
}

const Page = () => (
  <Theme.Provider value="dark">
    <Variants id="hero" label="Hero" default="split">
      <Variant id="centered" label="Centered">
        <Probe name="centered" />
      </Variant>
      <Variant id="split" label="Split">
        <Probe name="split" />
      </Variant>
    </Variants>
    <Variants id="cta">
      <Variant id="button">
        <Variants id="tone" label="Tone">
          <Variant id="loud">
            <span>LOUD</span>
          </Variant>
          <Variant id="quiet">
            <span>quiet</span>
          </Variant>
        </Variants>
      </Variant>
      <Variant id="link">
        <span>link</span>
      </Variant>
    </Variants>
  </Theme.Provider>
);

const renderPage = (ui: ReactNode = <Page />) =>
  render(<StoreContext.Provider value={store}>{ui}</StoreContext.Provider>);

const dialog = () =>
  document.querySelector<HTMLElement>(`[${CANVAS_ATTRIBUTE}]`);

const toolbar = () =>
  within(
    dialog()!.querySelector(".cc-toolbar")!
      .shadowRoot as unknown as HTMLElement,
  );

const switcher = () =>
  within(
    document.querySelector(`[${SWITCHER_ATTRIBUTE}]`)!
      .shadowRoot as unknown as HTMLElement,
  );

const card = (group: string, variant: string) =>
  dialog()!.querySelector<HTMLElement>(
    `[data-canvas-group="${group}"][data-canvas-variant="${variant}"]`,
  )!;

const rows = () =>
  Array.from(dialog()!.querySelectorAll<HTMLElement>("[data-canvas-row]")).map(
    (row) => [
      row.dataset["canvasRow"],
      Array.from(row.querySelectorAll<HTMLElement>("[data-canvas-card]")).map(
        (item) => item.dataset["canvasVariant"],
      ),
    ],
  );

const pageShows = (container: HTMLElement, group: string) =>
  container
    .querySelector(`[data-variant-group="${group}"]`)
    ?.getAttribute("data-variant");

const openFromSwitcher = () => {
  const button = switcher().getByRole("button", { name: "Canvas" });
  button.focus();
  fireEvent.click(button);
};

beforeEach(() => {
  store = createStore(mountSwitcher, mountCanvas);
  setUrl("");
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  store.reset();
});

describe("canvas", () => {
  it("opens from the switcher with one row per group in page order", () => {
    renderPage();
    expect(dialog()).toBeNull();
    openFromSwitcher();
    const element = dialog()!;
    expect(element.getAttribute("role")).toBe("dialog");
    expect(element.getAttribute("aria-modal")).toBe("false");
    expect(element.getAttribute("aria-label")).toBe("Variants canvas");
    expect(window.location.search).toBe("?variants=canvas");
    expect(rows()).toEqual([
      ["hero", ["centered", "split"]],
      ["cta", ["button", "link"]],
      ["tone", ["loud", "quiet"]],
    ]);
    expect(
      dialog()!.querySelector<HTMLElement>('[data-canvas-row="tone"]')!.dataset[
        "depth"
      ],
    ).toBe("1");
    expect(
      document.querySelector(`[${SWITCHER_ATTRIBUTE}]`)!.hasAttribute("hidden"),
    ).toBe(false);
  });

  it("lets focus move to the sidebar beside it", () => {
    renderPage();
    openFromSwitcher();
    const radio = switcher().getAllByRole("radio")[0]!;
    radio.focus();
    expect(
      document.querySelector(`[${SWITCHER_ATTRIBUTE}]`)!.shadowRoot!
        .activeElement,
    ).toBe(radio);
  });

  it("renders every variant with the page's React context and marks the current one", () => {
    renderPage();
    openFromSwitcher();
    expect(card("hero", "centered").textContent).toContain("centered in dark");
    expect(card("hero", "split").hasAttribute("data-current")).toBe(true);
    expect(card("hero", "split").getAttribute("aria-label")).toBe(
      "Split (current)",
    );
    expect(card("hero", "centered").hasAttribute("data-current")).toBe(false);
    expect(
      card("hero", "centered")
        .querySelector(".cc-card-body")!
        .hasAttribute("inert"),
    ).toBe(true);
  });

  it("embeds nested groups without registering them twice", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    openFromSwitcher();
    expect(card("cta", "button").textContent).toContain("LOUD");
    expect(error).not.toHaveBeenCalled();
    expect(store.getSnapshot().groups.map((group) => group.id)).toEqual([
      "hero",
      "tone",
      "cta",
    ]);
  });

  it("sizes cards from the group's on-page width", () => {
    renderPage();
    openFromSwitcher();
    const slot = dialog()!.querySelector<HTMLElement>(
      '[data-canvas-slot="hero"]',
    )!;
    expect(slot.style.getPropertyValue("--cw")).toBe("1024px");
    expect(slot.style.getPropertyValue("--cz")).toBe(`${480 / 1024}`);
  });

  it("selects on click, keeps the canvas open, and closes on double-click", () => {
    const { container } = renderPage();
    openFromSwitcher();
    fireEvent.click(card("hero", "centered"));
    expect(pageShows(container, "hero")).toBe("centered");
    expect(card("hero", "centered").hasAttribute("data-current")).toBe(true);
    expect(dialog()).not.toBeNull();
    expect(window.location.search).toBe(
      "?variant=hero:centered&variants=canvas",
    );

    fireEvent.dblClick(card("cta", "link"));
    expect(pageShows(container, "cta")).toBe("link");
    expect(dialog()).toBeNull();
    expect(window.location.search).toBe(
      "?variant=hero:centered&variant=cta:link",
    );
  });

  it("uses a variant and returns to the page with the Use this button", () => {
    const { container } = renderPage();
    openFromSwitcher();
    fireEvent.click(
      within(card("hero", "centered")).getByRole("button", {
        name: "Use this",
      }),
    );
    expect(pageShows(container, "hero")).toBe("centered");
    expect(dialog()).toBeNull();
  });

  it("navigates cards with the keyboard and selects with Enter", () => {
    const { container } = renderPage();
    openFromSwitcher();
    const start = card("hero", "centered");
    start.focus();
    fireEvent.keyDown(start, { key: "ArrowRight" });
    expect(document.activeElement).toBe(card("hero", "split"));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(card("cta", "button"));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(card("tone", "loud"));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });
    expect(pageShows(container, "tone")).toBe("quiet");
    expect(dialog()).not.toBeNull();
  });

  it("zooms with buttons and keys", () => {
    renderPage();
    openFromSwitcher();
    const label = () =>
      dialog()!
        .querySelector(".cc-toolbar")!
        .shadowRoot!.querySelector(".zoom")!.textContent;
    expect(label()).toBe("100%");
    fireEvent.click(toolbar().getByRole("button", { name: "Zoom out" }));
    expect(label()).toBe("80%");
    fireEvent.click(toolbar().getByRole("button", { name: "Zoom in" }));
    expect(label()).toBe("100%");
    fireEvent.keyDown(dialog()!, { key: "-" });
    expect(label()).toBe("80%");
    fireEvent.keyDown(dialog()!, { key: "0" });
    expect(label()).toBe("100%");
    fireEvent.keyDown(dialog()!, { key: "+" });
    expect(label()).toBe("125%");
    fireEvent.click(toolbar().getByRole("button", { name: "Fit to screen" }));
    expect(label()).toBe("100%");
  });

  it("pans by dragging the background and with the wheel, and zooms with ctrl+wheel", () => {
    renderPage();
    openFromSwitcher();
    const viewport = dialog()!.querySelector<HTMLElement>(".cc-viewport")!;
    const world = dialog()!.querySelector<HTMLElement>(".cc-world")!;
    fireEvent.pointerDown(viewport, {
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 40, clientY: 30 });
    fireEvent.pointerUp(viewport, { pointerId: 1 });
    expect(world.style.transform).toBe("translate(30px, 20px) scale(1)");
    fireEvent.wheel(viewport, { deltaX: 10, deltaY: 5 });
    expect(world.style.transform).toBe("translate(20px, 15px) scale(1)");
    fireEvent.wheel(viewport, { deltaY: -100, ctrlKey: true });
    expect(world.style.transform).toMatch(/scale\(2\.7\d+\)/);
  });

  it("closes with Escape and the close button, restoring focus", () => {
    renderPage();
    openFromSwitcher();
    fireEvent.keyDown(dialog()!, { key: "Escape" });
    expect(dialog()).toBeNull();
    expect(window.location.search).toBe("");
    const switcherRoot = document.querySelector(
      `[${SWITCHER_ATTRIBUTE}]`,
    )!.shadowRoot!;
    expect(switcherRoot.activeElement?.getAttribute("aria-label")).toBe(
      "Canvas",
    );

    openFromSwitcher();
    fireEvent.click(toolbar().getByRole("button", { name: "Close canvas" }));
    expect(dialog()).toBeNull();
  });

  it("opens from ?variants=canvas and unmounts variant content when closed", () => {
    const mounts: string[] = [];
    function Counter({ name }: { name: string }) {
      useEffect(() => {
        mounts.push(name);
      }, [name]);
      return <span>{name}</span>;
    }
    setUrl("?variants=canvas");
    renderPage(
      <Variants id="g">
        <Variant id="a">
          <Counter name="a" />
        </Variant>
        <Variant id="b">
          <Counter name="b" />
        </Variant>
      </Variants>,
    );
    expect(dialog()).not.toBeNull();
    expect(mounts.sort()).toEqual(["a", "a", "b"]);
    act(() => store.setCanvas(false));
    expect(document.body.textContent).not.toContain("b");
  });

  it("keeps focus inside the dialog", () => {
    renderPage();
    const outside = document.createElement("button");
    document.body.append(outside);
    openFromSwitcher();
    outside.focus();
    expect(dialog()!.contains(document.activeElement)).toBe(true);
    outside.remove();
  });

  it("hides chrome but keeps labels in clean mode", () => {
    setUrl("?variants=canvas,clean");
    renderPage();
    expect(dialog()!.hasAttribute("data-clean")).toBe(true);
    expect(
      card("hero", "split").querySelector(".cc-card-label")!.textContent,
    ).toBe("Split");
  });

  it("follows popstate", () => {
    renderPage();
    setUrl("?variants=canvas");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(dialog()).not.toBeNull();
    setUrl("");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(dialog()).toBeNull();
  });
});

describe("sidebar", () => {
  const html = document.documentElement;
  const pushed = () =>
    html.style.getPropertyValue("--contenders-sidebar-width");

  it("pushes the page aside while open and restores it", () => {
    const { unmount } = renderPage();
    expect(pushed()).toBe("300px");
    expect(html.hasAttribute("data-contenders-sidebar")).toBe(true);
    fireEvent.click(
      switcher().getByRole("button", { name: "Collapse variant switcher" }),
    );
    expect(pushed()).toBe("");
    expect(html.hasAttribute("data-contenders-sidebar")).toBe(false);
    fireEvent.click(
      switcher().getByRole("button", { name: "Expand variant switcher" }),
    );
    expect(pushed()).toBe("300px");
    unmount();
    expect(pushed()).toBe("");
    expect(html.hasAttribute("style")).toBe(false);
  });

  it("adds no margin in clean or noui mode", () => {
    setUrl("?variants=noui");
    renderPage();
    expect(pushed()).toBe("");
    cleanup();
    store.reset();
    setUrl("?variants=clean");
    renderPage();
    expect(pushed()).toBe("");
  });

  it("becomes a bottom sheet without pushing on narrow screens", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      renderPage();
      const host = document.querySelector<HTMLElement>(
        `[${SWITCHER_ATTRIBUTE}]`,
      )!;
      expect(host.dataset["mode"]).toBe("sheet");
      expect(pushed()).toBe("");
    } finally {
      window.matchMedia = original;
    }
  });
});

describe("container replication", () => {
  it("lays every card out at the container's content width with its formatting context and text styles", () => {
    const { container } = renderPage(
      <div
        className="prose wide"
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "12px",
          padding: "0 20px",
          fontFamily: "Georgia",
          letterSpacing: "1px",
        }}
      >
        <Variants id="cta">
          <Variant id="button">
            <button type="button">Get started</button>
          </Variant>
          <Variant id="link">
            <a href="#start">Get started →</a>
          </Variant>
        </Variants>
      </div>,
    );
    const parent = container.firstElementChild as HTMLElement;
    Object.defineProperty(parent, "clientWidth", { value: 640 });
    openFromSwitcher();
    const slot = dialog()!.querySelector<HTMLElement>(
      '[data-canvas-slot="cta"]',
    )!;
    expect(slot.style.getPropertyValue("--cw")).toBe("600px");
    expect(slot.style.getPropertyValue("--cz")).toBe(`${480 / 600}`);
    expect(slot.style.getPropertyValue("--cd")).toBe("block");
    expect(slot.style.getPropertyValue("font-family")).toBe("Georgia");
    expect(slot.style.getPropertyValue("letter-spacing")).toBe("1px");
    const link = card("cta", "link").querySelector("a")!;
    expect(link.closest(".prose")).not.toBeNull();
    expect(link.closest(".prose")!.getAttribute("style")).toBe(
      "display: contents;",
    );
  });
});

describe("copy prompt", () => {
  const writeText = vi.fn(async (_text: string) => {});
  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });
  afterEach(() => {
    delete (navigator as { clipboard?: unknown }).clipboard;
  });

  const flush = () => act(async () => {});

  it("copies a prompt for every group from the switcher footer", async () => {
    renderPage();
    const button = switcher().getByRole("button", { name: "Copy prompt" });
    fireEvent.click(button);
    await flush();
    expect(writeText).toHaveBeenCalledWith(
      "/variants choose hero:split cta:button tone:loud",
    );
    expect(button.hasAttribute("data-copied")).toBe(true);
    expect(switcher().getByRole("status").textContent).toBe(
      "Prompt copied to clipboard",
    );
  });

  it("copies a prompt for one group", async () => {
    renderPage();
    fireEvent.click(
      switcher().getByRole("button", { name: "Copy prompt for Tone" }),
    );
    await flush();
    expect(writeText).toHaveBeenCalledWith("/variants choose tone:loud");
  });

  it("announces a failed copy", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    renderPage();
    fireEvent.click(switcher().getByRole("button", { name: "Copy prompt" }));
    await flush();
    expect(switcher().getByRole("status").textContent).toBe(
      "Could not copy the prompt",
    );
  });

  it("copies from the canvas toolbar with the current selections", async () => {
    renderPage();
    openFromSwitcher();
    fireEvent.click(card("hero", "centered"));
    fireEvent.click(toolbar().getByRole("button", { name: "Copy prompt" }));
    await flush();
    expect(writeText).toHaveBeenCalledWith(
      "/variants choose hero:centered cta:button tone:loud",
    );
  });
});
