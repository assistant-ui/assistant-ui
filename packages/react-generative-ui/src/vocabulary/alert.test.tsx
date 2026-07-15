import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { alertVocabulary } from "./alert";
import { defaultGenerativeUILibrary } from "./index";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, alertVocabulary)}</>);

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

  it("Carousel with no children renders an empty container", () => {
    expect(render({ $type: "Carousel" })).toBe(
      '<div data-aui="carousel" role="region" aria-roledescription="carousel" tabindex="0"></div>',
    );
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
});
