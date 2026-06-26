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
      '<div data-aui="carousel"></div>',
    );
  });
});
