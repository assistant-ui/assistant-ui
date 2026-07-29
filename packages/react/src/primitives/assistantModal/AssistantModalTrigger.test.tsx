import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AssistantModalPrimitiveAnchor } from "./AssistantModalAnchor";
import { AssistantModalPrimitiveContent } from "./AssistantModalContent";
import { AssistantModalPrimitiveRoot } from "./AssistantModalRoot";
import { AssistantModalPrimitiveTrigger } from "./AssistantModalTrigger";

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => ({
      on: () => () => {},
    }),
  };
});

describe("AssistantModalPrimitive render props", () => {
  it("Trigger render matches asChild", () => {
    const renderHtml = renderToStaticMarkup(
      <AssistantModalPrimitiveRoot open>
        <AssistantModalPrimitiveTrigger
          render={<button type="button" className="trigger" />}
        >
          Open
        </AssistantModalPrimitiveTrigger>
      </AssistantModalPrimitiveRoot>,
    );

    const asChildHtml = renderToStaticMarkup(
      <AssistantModalPrimitiveRoot open>
        <AssistantModalPrimitiveTrigger asChild>
          <button type="button" className="trigger">
            Open
          </button>
        </AssistantModalPrimitiveTrigger>
      </AssistantModalPrimitiveRoot>,
    );

    expect(renderHtml).toBe(asChildHtml);
    expect(renderHtml).toContain('class="trigger"');
    expect(renderHtml).toContain("Open");
    expect(renderHtml).toContain('type="button"');
    expect(renderHtml).toMatch(/aria-haspopup|aria-expanded|data-state/);
  });

  it("Anchor render matches asChild", () => {
    const renderHtml = renderToStaticMarkup(
      <AssistantModalPrimitiveRoot open>
        <AssistantModalPrimitiveAnchor render={<div className="anchor" />}>
          Anchor
        </AssistantModalPrimitiveAnchor>
      </AssistantModalPrimitiveRoot>,
    );

    const asChildHtml = renderToStaticMarkup(
      <AssistantModalPrimitiveRoot open>
        <AssistantModalPrimitiveAnchor asChild>
          <div className="anchor">Anchor</div>
        </AssistantModalPrimitiveAnchor>
      </AssistantModalPrimitiveRoot>,
    );

    expect(renderHtml).toBe(asChildHtml);
    expect(renderHtml).toContain('class="anchor"');
    expect(renderHtml).toContain("Anchor");
  });

  it("accepts render on Trigger, Anchor, and Content", () => {
    const tree = (
      <AssistantModalPrimitiveRoot open>
        <AssistantModalPrimitiveTrigger render={<button type="button" />} />
        <AssistantModalPrimitiveAnchor render={<div />} />
        <AssistantModalPrimitiveContent render={<div />} />
      </AssistantModalPrimitiveRoot>
    );

    expect(tree).toBeTruthy();
  });
});
