// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { alertVocabulary } from "./alert";
import { defaultGenerativeUILibrary } from "./index";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, alertVocabulary)}</>);

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const carousel = {
  $type: "Carousel",
  children: [
    { $type: "Card", title: "One" },
    { $type: "Card", title: "Two" },
    { $type: "Card", title: "Three" },
  ],
};

const mountCarousel = async (node: unknown = carousel) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(renderGenerativeUI(node, defaultGenerativeUILibrary));
  });
  const track = container.querySelector<HTMLDivElement>(
    '[data-aui="carousel"]',
  );
  if (!track) throw new Error("Carousel track was not rendered.");
  return { container, track };
};

const setCarouselLayout = (
  track: HTMLDivElement,
  {
    scrollWidth,
    clientWidth,
    scrollLeft,
  }: { scrollWidth: number; clientWidth: number; scrollLeft: number },
) => {
  const rtl = track.style.direction === "rtl";
  const rect = (left: number, width: number) =>
    ({
      left,
      right: left + width,
      width,
      top: 0,
      bottom: 100,
      height: 100,
      x: left,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  const trackLeft = 140;
  Object.defineProperties(track, {
    scrollWidth: { configurable: true, value: scrollWidth },
    clientWidth: { configurable: true, value: clientWidth },
    scrollLeft: { configurable: true, value: scrollLeft, writable: true },
    getBoundingClientRect: {
      configurable: true,
      value: () => rect(trackLeft, clientWidth),
    },
  });
  track
    .querySelectorAll<HTMLElement>(':scope > [data-aui="carousel-slide"]')
    .forEach((slide, index) => {
      Object.defineProperty(slide, "getBoundingClientRect", {
        configurable: true,
        value: () => {
          const offset = index * 200 - Math.abs(track.scrollLeft);
          return rtl
            ? rect(trackLeft + clientWidth - offset - 188, 188)
            : rect(trackLeft + offset, 188);
        },
      });
    });
  const scrollBy = vi.fn();
  Object.defineProperty(track, "scrollBy", {
    configurable: true,
    value: scrollBy,
  });
  return scrollBy;
};

const measure = async () => {
  await act(async () => {
    window.dispatchEvent(new Event("resize"));
  });
};

describe("alertVocabulary", () => {
  it("Alert renders with title/description/tone, defaulting tone to info", () => {
    expect(
      render({
        $type: "Alert",
        title: "Heads up",
        description: "Something happened",
      }),
    ).toBe(
      '<div data-aui="alert" data-aui-tone="info" role="alert"><header data-aui="alert-title">Heads up</header><p data-aui="alert-desc">Something happened</p></div>',
    );
  });

  it("Alert renders an explicit tone", () => {
    expect(
      render({ $type: "Alert", tone: "danger", title: "Error" }),
    ).toContain('data-aui-tone="danger"');
  });

  it("Alert ignores malformed text properties", () => {
    expect(
      render({
        $type: "Alert",
        title: { unexpected: true },
        description: { unexpected: true },
      }),
    ).toBe('<div data-aui="alert" data-aui-tone="info" role="alert"></div>');
  });

  it("Carousel wraps each child Card in a slide, capped at 10", () => {
    const children = Array.from({ length: 12 }, (_, i) => ({
      $type: "Card",
      title: `c${i}`,
    }));
    const html = renderToStaticMarkup(
      <>
        {renderGenerativeUI(
          { $type: "Carousel", children },
          defaultGenerativeUILibrary,
        )}
      </>,
    );
    const slideCount = (html.match(/data-aui="carousel-slide"/g) ?? []).length;
    expect(slideCount).toBe(10);
  });

  it("Carousel renders a single non-array child Card in one slide", () => {
    const html = renderToStaticMarkup(
      <>
        {renderGenerativeUI(
          {
            $type: "Carousel",
            children: { $type: "Card", title: "only" } as never,
          },
          defaultGenerativeUILibrary,
        )}
      </>,
    );
    expect((html.match(/data-aui="carousel-slide"/g) ?? []).length).toBe(1);
  });

  it("Carousel without a label renders role=group, no aria-label, and no double-name landmark", () => {
    const html = render({ $type: "Carousel" });
    expect(html).toContain('data-aui="carousel"');
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain("aria-label");
  });

  it("Carousel with a label renders role=region and the given aria-label", () => {
    const html = render({ $type: "Carousel", label: "Featured" });
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Featured"');
  });

  it("Carousel container carries region semantics and an optional label", () => {
    const html = renderToStaticMarkup(
      <>
        {renderGenerativeUI(
          {
            $type: "Carousel",
            label: "Featured items",
            children: [
              { $type: "Card", title: "a" },
              { $type: "Card", title: "b" },
            ],
          },
          defaultGenerativeUILibrary,
        )}
      </>,
    );
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('aria-label="Featured items"');
    expect(html).toContain('tabindex="0"');
  });

  it("Carousel slides carry group semantics and a positional label", () => {
    const html = renderToStaticMarkup(
      <>
        {renderGenerativeUI(
          {
            $type: "Carousel",
            label: "Featured items",
            children: [
              { $type: "Card", title: "a" },
              { $type: "Card", title: "b" },
              { $type: "Card", title: "c" },
            ],
          },
          defaultGenerativeUILibrary,
        )}
      </>,
    );
    expect((html.match(/role="group"/g) ?? []).length).toBe(3);
    expect((html.match(/aria-roledescription="slide"/g) ?? []).length).toBe(3);
    expect(html).toContain('aria-label="1 of 3"');
    expect(html).toContain('aria-label="2 of 3"');
    expect(html).toContain('aria-label="3 of 3"');
  });

  it("Carousel slide labels reflect the 10-slide cap, not the raw child count", () => {
    const children = Array.from({ length: 12 }, (_, i) => ({
      $type: "Card",
      title: `c${i}`,
    }));
    const html = renderToStaticMarkup(
      <>
        {renderGenerativeUI(
          { $type: "Carousel", children },
          defaultGenerativeUILibrary,
        )}
      </>,
    );
    expect(html).toContain('aria-label="1 of 10"');
    expect(html).toContain('aria-label="10 of 10"');
    expect(html).not.toContain("11 of 10");
  });

  it("Carousel server markup keeps the track inside an always-present frame", () => {
    const html = renderToStaticMarkup(
      <>{renderGenerativeUI(carousel, defaultGenerativeUILibrary)}</>,
    );
    expect(html).toMatch(
      /<div data-aui="carousel-frame"><div id="[^"]+" data-aui="carousel"/,
    );
  });

  it("Carousel does not render controls when its slides fit", async () => {
    const { container, track } = await mountCarousel();
    setCarouselLayout(track, {
      scrollWidth: 300,
      clientWidth: 300,
      scrollLeft: 0,
    });
    await measure();
    expect(
      container.querySelector('[data-aui="carousel-controls"]'),
    ).toBeNull();
  });

  it("Carousel renders overflow controls with Previous disabled at the start", async () => {
    const { container, track } = await mountCarousel();
    setCarouselLayout(track, {
      scrollWidth: 600,
      clientWidth: 300,
      scrollLeft: 0,
    });
    await measure();

    const previous = container.querySelector<HTMLButtonElement>(
      '[data-aui="carousel-prev"]',
    );
    const next = container.querySelector<HTMLButtonElement>(
      '[data-aui="carousel-next"]',
    );
    expect(previous).not.toBeNull();
    expect(next).not.toBeNull();
    expect(previous!.disabled).toBe(true);
    expect(next!.disabled).toBe(false);
    expect(previous!.getAttribute("aria-controls")).toBe(track.id);
    expect(next!.getAttribute("aria-controls")).toBe(track.id);
  });

  it("Carousel remeasures streamed slides and observes each slide", async () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    class TestResizeObserver {
      static instances: TestResizeObserver[] = [];
      readonly observed = new Set<Element>();

      constructor() {
        TestResizeObserver.instances.push(this);
      }

      observe(element: Element) {
        this.observed.add(element);
      }

      disconnect() {}
    }
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;

    try {
      const { container, track } = await mountCarousel({
        $type: "Carousel",
        children: [{ $type: "Card", title: "One" }],
      });
      setCarouselLayout(track, {
        scrollWidth: 600,
        clientWidth: 300,
        scrollLeft: 0,
      });
      await act(async () => {
        root!.render(
          renderGenerativeUI(
            {
              $type: "Carousel",
              children: [
                { $type: "Card", title: "One" },
                { $type: "Card", title: "Two" },
                { $type: "Card", title: "Three" },
              ],
            },
            defaultGenerativeUILibrary,
          ),
        );
      });

      expect(
        container.querySelector('[data-aui="carousel-controls"]'),
      ).not.toBeNull();
      const observer = TestResizeObserver.instances.at(-1);
      expect([...observer!.observed]).toEqual([
        track,
        ...track.querySelectorAll('[data-aui="carousel-slide"]'),
      ]);
    } finally {
      globalThis.ResizeObserver = originalResizeObserver;
    }
  });

  it("Carousel moves to the next slide start", async () => {
    const { container, track } = await mountCarousel();
    const scrollBy = setCarouselLayout(track, {
      scrollWidth: 600,
      clientWidth: 300,
      scrollLeft: 0,
    });
    await measure();

    const next = container.querySelector<HTMLButtonElement>(
      '[data-aui="carousel-next"]',
    );
    await act(async () => next!.click());
    expect(scrollBy).toHaveBeenCalledWith({ left: 200 });
  });

  it("Carousel moves back one slide from the middle", async () => {
    const { container, track } = await mountCarousel();
    const scrollBy = setCarouselLayout(track, {
      scrollWidth: 600,
      clientWidth: 300,
      scrollLeft: 200,
    });
    await measure();

    const previous = container.querySelector<HTMLButtonElement>(
      '[data-aui="carousel-prev"]',
    );
    expect(previous!.disabled).toBe(false);
    await act(async () => previous!.click());
    expect(scrollBy).toHaveBeenCalledWith({ left: -200 });
  });

  it("Carousel pages toward the inline end in right-to-left layouts", async () => {
    const { container, track } = await mountCarousel();
    track.style.direction = "rtl";
    const scrollBy = setCarouselLayout(track, {
      scrollWidth: 600,
      clientWidth: 300,
      scrollLeft: 0,
    });
    await measure();

    const next = container.querySelector<HTMLButtonElement>(
      '[data-aui="carousel-next"]',
    );
    await act(async () => next!.click());
    expect(scrollBy).toHaveBeenCalledWith({ left: -200 });

    track.scrollLeft = -300;
    await act(async () => {
      track.dispatchEvent(new Event("scroll"));
    });
    expect(next!.disabled).toBe(true);
  });

  it("Carousel disables Next at the scroll end", async () => {
    const { container, track } = await mountCarousel();
    setCarouselLayout(track, {
      scrollWidth: 600,
      clientWidth: 300,
      scrollLeft: 300,
    });
    await measure();

    const next = container.querySelector<HTMLButtonElement>(
      '[data-aui="carousel-next"]',
    );
    expect(next!.disabled).toBe(true);
  });

  it("Carousel server markup does not contain controls", () => {
    const html = renderToStaticMarkup(
      <>{renderGenerativeUI(carousel, defaultGenerativeUILibrary)}</>,
    );
    expect(html).not.toContain('data-aui="carousel-controls"');
  });
});
