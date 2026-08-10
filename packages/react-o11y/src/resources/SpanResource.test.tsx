import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import * as SpanPrimitive from "../primitives/span";
import { SpanResource, type SpanData } from "./SpanResource";

const createSpan = (id: string, parentSpanId: string | null): SpanData => ({
  id,
  parentSpanId,
  name: id,
  type: "test",
  status: "completed",
  startedAt: 0,
  endedAt: 1,
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
});
