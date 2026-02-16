import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MessagePartComponent,
  MessagePrimitivePartByIndex,
} from "../primitives/message/MessageParts";
import { MessagePrimitiveUnstable_PartsGrouped } from "../primitives/message/MessagePartsGrouped";

type MockPart = {
  type: "component";
  name: string;
  instanceId?: string;
  props?: Record<string, unknown>;
  status: { type: "complete" };
  parentId?: string;
};

let currentPart: MockPart | undefined;
const mockParts: MockPart[] = [];

const mockState = {
  message: {
    parts: mockParts,
    status: { type: "complete" },
  },
  tools: {
    tools: {},
  },
  get part() {
    return currentPart ?? this.message.parts[0];
  },
};

const setMockParts = (...parts: MockPart[]) => {
  mockParts.length = 0;
  mockParts.push(...parts);
  currentPart = parts[0];
};

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();

  return {
    ...actual,
    AuiProvider: ({ children }: PropsWithChildren) => children,
    Derived: (value: unknown) => value,
    useAuiState: (selector: (state: typeof mockState) => unknown) =>
      selector(mockState),
    useAui: () => ({
      part: () => ({
        addToolResult: vi.fn(),
        resumeToolCall: vi.fn(),
      }),
      message: () => ({
        part: ({ index }: { index: number }) => mockState.message.parts[index],
      }),
    }),
  };
});

describe("MessagePrimitive component part rendering", () => {
  it("renders a named component with full part state", () => {
    setMockParts({
      type: "component",
      name: "status-chip",
      instanceId: "status-chip-1",
      props: { label: "Ready" },
      status: { type: "complete" },
    });

    const html = renderToStaticMarkup(
      <MessagePartComponent
        components={{
          Component: {
            byName: {
              "status-chip": ({ name, instanceId, props, status }) => (
                <span>{`${name}:${instanceId}:${String(props?.label)}:${status.type}`}</span>
              ),
            },
          },
        }}
      />,
    );

    expect(html).toContain("status-chip:status-chip-1:Ready:complete");
  });

  it("renders the component fallback when no byName renderer exists", () => {
    setMockParts({
      type: "component",
      name: "missing-component",
      props: { label: "Fallback" },
      status: { type: "complete" },
    });

    const html = renderToStaticMarkup(
      <MessagePartComponent
        components={{
          Component: {
            Fallback: ({ name }) => <span>{`fallback:${name}`}</span>,
          },
        }}
      />,
    );

    expect(html).toContain("fallback:missing-component");
  });

  it("renders the component override for all component names", () => {
    setMockParts({
      type: "component",
      name: "anything",
      props: { label: "Override" },
      status: { type: "complete" },
      parentId: "group-2",
    });

    const html = renderToStaticMarkup(
      <MessagePartComponent
        components={{
          Component: {
            Override: ({ name, parentId, props }) => (
              <span>{`${name}:${parentId}:${String(props?.label)}`}</span>
            ),
          },
        }}
      />,
    );

    expect(html).toContain("anything:group-2:Override");
  });

  it("warns once in development when renderer is missing", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    setMockParts({
      type: "component",
      name: "missing-renderer",
      props: { label: "Missing" },
      status: { type: "complete" },
    });

    renderToStaticMarkup(
      <MessagePartComponent components={{ Component: {} }} />,
    );
    renderToStaticMarkup(
      <MessagePartComponent components={{ Component: {} }} />,
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain("missing-renderer");
  });

  it("renders through MessagePrimitive.PartByIndex", () => {
    setMockParts({
      type: "component",
      name: "status-chip",
      props: { label: "Index" },
      status: { type: "complete" },
    });

    const html = renderToStaticMarkup(
      <MessagePrimitivePartByIndex
        index={0}
        components={{
          Component: {
            byName: {
              "status-chip": ({ props }) => <span>{String(props?.label)}</span>,
            },
          },
        }}
      />,
    );

    expect(html).toContain("Index");
  });

  it("renders through MessagePrimitive.Unstable_PartsGrouped", () => {
    setMockParts({
      type: "component",
      name: "status-chip",
      props: { label: "Grouped" },
      status: { type: "complete" },
      parentId: "group-1",
    });

    const html = renderToStaticMarkup(
      <MessagePrimitiveUnstable_PartsGrouped
        groupingFunction={(parts) =>
          parts.length ? [{ groupKey: "group-1", indices: [0] }] : []
        }
        components={{
          Component: {
            byName: {
              "status-chip": ({ props }) => <span>{String(props?.label)}</span>,
            },
          },
          Group: ({ children }) => <section>{children}</section>,
        }}
      />,
    );

    expect(html).toContain("Grouped");
  });
});
