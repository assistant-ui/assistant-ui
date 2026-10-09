// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useResource } from "@assistant-ui/tap";
import { AuiProvider, useAui, type ClientOutput } from "@assistant-ui/store";
import * as SpanPrimitive from "../primitives/span";
import { SpanResource, type SpanData } from "./SpanResource";

const createSpan = (
  id: string,
  parentSpanId: string | null,
  startedAt = 0,
): SpanData => ({
  id,
  parentSpanId,
  name: id,
  type: "test",
  status: "completed",
  startedAt,
  endedAt: startedAt + 1,
  latencyMs: 1,
});

const SpanFixture = ({ spans }: { spans: SpanData[] }) => {
  const aui = useAui({ span: SpanResource({ spans }) });

  return (
    <AuiProvider value={aui}>
      <SpanPrimitive.Children>
        {({ span }) => (
          <span
            data-span-id={span.id}
            data-parent-span-id={span.parentSpanId ?? "root"}
            data-span-depth={span.depth}
          />
        )}
      </SpanPrimitive.Children>
    </AuiProvider>
  );
};

const renderSpans = (spans: SpanData[]) =>
  renderToStaticMarkup(<SpanFixture spans={spans} />);

describe("SpanResource", () => {
  it("preserves valid parent hierarchies", () => {
    const html = renderSpans([
      createSpan("root", null),
      createSpan("child", "root"),
    ]);

    expect(html).toContain(
      'data-span-id="root" data-parent-span-id="root" data-span-depth="0"',
    );
    expect(html).toContain(
      'data-span-id="child" data-parent-span-id="root" data-span-depth="1"',
    );
  });

  it("renders cyclic parent hierarchies without recursing indefinitely", () => {
    const html = renderSpans([
      createSpan("first", "second"),
      createSpan("second", "first"),
    ]);

    expect(html.match(/data-span-id=/g)).toHaveLength(2);
    expect(html).toContain(
      'data-span-id="first" data-parent-span-id="root" data-span-depth="0"',
    );
    expect(html).toContain(
      'data-span-id="second" data-parent-span-id="first" data-span-depth="1"',
    );
  });

  it("renders every span when a parent chain enters a longer cycle", () => {
    const html = renderSpans([
      createSpan("branch", "first"),
      createSpan("first", "second"),
      createSpan("second", "third"),
      createSpan("third", "first"),
    ]);

    expect(html.match(/data-span-id=/g)).toHaveLength(4);
    expect(html).toContain(
      'data-span-id="first" data-parent-span-id="root" data-span-depth="0"',
    );
    expect(html).toContain(
      'data-span-id="third" data-parent-span-id="first" data-span-depth="1"',
    );
    expect(html).toContain(
      'data-span-id="second" data-parent-span-id="third" data-span-depth="2"',
    );
    expect(html).toContain(
      'data-span-id="branch" data-parent-span-id="first" data-span-depth="1"',
    );
  });

  it("renders self-parented and orphaned spans as roots", () => {
    const html = renderSpans([
      createSpan("self", "self"),
      createSpan("orphan", "missing"),
    ]);

    expect(html.match(/data-span-id=/g)).toHaveLength(2);
    expect(html).toContain(
      'data-span-id="self" data-parent-span-id="root" data-span-depth="0"',
    );
    expect(html).toContain(
      'data-span-id="orphan" data-parent-span-id="root" data-span-depth="0"',
    );
  });

  it("preserves depth-first start-time ordering", () => {
    const html = renderSpans([
      createSpan("root", null),
      createSpan("later", "root", 2),
      createSpan("earlier", "root", 1),
      createSpan("nested", "earlier", 3),
    ]);

    const spanIds = [...html.matchAll(/data-span-id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(spanIds).toEqual(["root", "earlier", "nested", "later"]);
  });

  it("keeps sibling resources and flat list order when a span is toggled", () => {
    const spans = [
      createSpan("root", null),
      createSpan("later", "root", 2),
      createSpan("earlier", "root", 1),
      createSpan("nested", "earlier", 3),
    ];
    let spanResource: ClientOutput<"span"> | undefined;
    const container = document.createElement("div");
    const root = createRoot(container);

    const Fixture = () => {
      spanResource = useResource(SpanResource({ spans }));
      return null;
    };

    try {
      act(() => root.render(<Fixture />));
      const initial = spanResource!.getState().children;
      expect(initial.map((span) => span.id)).toEqual([
        "root",
        "earlier",
        "nested",
        "later",
      ]);

      act(() => spanResource!.child({ key: "earlier" }).toggleCollapse());
      const collapsed = spanResource!.getState().children;
      expect(collapsed.map((span) => span.id)).toEqual([
        "root",
        "earlier",
        "later",
      ]);
      expect(collapsed[0]).toBe(initial[0]);
      expect(collapsed[2]).toBe(initial[3]);
      expect(collapsed[1]?.isCollapsed).toBe(true);

      act(() => spanResource!.child({ key: "earlier" }).toggleCollapse());
      const expanded = spanResource!.getState().children;
      expect(expanded.map((span) => span.id)).toEqual([
        "root",
        "earlier",
        "nested",
        "later",
      ]);
      expect(expanded[0]).toBe(initial[0]);
      expect(expanded[3]).toBe(initial[3]);
      expect(expanded[1]?.isCollapsed).toBe(false);
    } finally {
      act(() => root.unmount());
    }
  });

  it("renders deeply nested parent chains without overflowing the stack", () => {
    const spans = Array.from({ length: 20_000 }, (_, index) =>
      createSpan(`span-${index}`, index === 0 ? null : `span-${index - 1}`),
    );

    const html = renderSpans(spans);

    expect(html).toContain(
      'data-span-id="span-19999" data-parent-span-id="span-19998" data-span-depth="19999"',
    );
  });
});
