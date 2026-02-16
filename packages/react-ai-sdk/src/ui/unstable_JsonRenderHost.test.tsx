// @vitest-environment jsdom

import { useEffect, useState, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AuiProvider,
  type ThreadAssistantMessage,
  useAui,
} from "@assistant-ui/react";
import { ThreadMessageClient } from "../../../react/src/client/ThreadMessageClient";
import { unstable_JsonRenderHost as UnstableJsonRenderHost } from "./unstable_JsonRenderHost";

const createComponentMessage = (): ThreadAssistantMessage => ({
  id: "m1",
  role: "assistant",
  createdAt: new Date("2026-02-15T12:00:00Z"),
  content: [
    {
      type: "component",
      name: "json-render",
      instanceId: "spec_1",
    },
  ],
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: {
      components: {
        spec_1: {
          seq: 1,
          lifecycle: "active",
          state: { phase: "ready" },
        },
      },
    },
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const createAuiWrapper = (
  message: ThreadAssistantMessage,
): ((props: { children: ReactNode }) => ReactNode) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    const aui = useAui({
      message: ThreadMessageClient({ message, index: 0 }),
    });

    return <AuiProvider value={aui}>{children}</AuiProvider>;
  };
};

describe("unstable_JsonRenderHost", () => {
  it("renders spec JSON by default", () => {
    const wrapper = createAuiWrapper(createComponentMessage());
    render(
      <UnstableJsonRenderHost
        type="component"
        name="json-render"
        status={{ type: "complete" }}
        instanceId="spec_1"
        props={{ spec: { type: "card", props: { title: "Ready" } } }}
      />,
      { wrapper },
    );

    expect(screen.getByTestId("json-render-host").textContent).toContain(
      '"title": "Ready"',
    );
  });

  it("supports custom render callback", () => {
    const wrapper = createAuiWrapper(createComponentMessage());
    render(
      <UnstableJsonRenderHost
        type="component"
        name="json-render"
        status={{ type: "complete" }}
        instanceId="spec_1"
        props={{ spec: { type: "card" } }}
        render={({ spec }) => (
          <div data-testid="custom-spec">
            {String((spec as { type: string }).type)}
          </div>
        )}
      />,
      { wrapper },
    );

    expect(screen.getByTestId("custom-spec").textContent).toBe("card");
  });

  it("dispatches catalog renderer by spec.type", () => {
    const wrapper = createAuiWrapper(createComponentMessage());
    render(
      <UnstableJsonRenderHost
        type="component"
        name="json-render"
        status={{ type: "complete" }}
        instanceId="spec_1"
        props={{ spec: { type: "status-board", props: { title: "Deploy" } } }}
        catalog={{
          by_type: {
            "status-board": ({ spec }) => (
              <div data-testid="catalog-status-board">
                {(spec as { props?: { title?: string } }).props?.title}
              </div>
            ),
          },
        }}
      />,
      { wrapper },
    );

    expect(screen.getByTestId("catalog-status-board").textContent).toBe(
      "Deploy",
    );
  });

  it("uses catalog fallback renderer when spec.type is unregistered", () => {
    const wrapper = createAuiWrapper(createComponentMessage());
    render(
      <UnstableJsonRenderHost
        type="component"
        name="json-render"
        status={{ type: "complete" }}
        instanceId="spec_1"
        props={{
          spec: { type: "unknown-widget", props: { title: "Unknown" } },
        }}
        catalog={{
          by_type: {
            "status-board": () => <div data-testid="catalog-status-board" />,
          },
          Fallback: ({ specType }) => (
            <div data-testid="catalog-fallback">
              {specType ?? "missing-type"}
            </div>
          ),
        }}
      />,
      { wrapper },
    );

    expect(screen.getByTestId("catalog-fallback").textContent).toBe(
      "unknown-widget",
    );
  });

  it("keeps invoke/emit working from catalog-rendered components", async () => {
    const wrapper = createAuiWrapper(createComponentMessage());
    const invokeListener = vi.fn(
      (payload: { ack: (value: unknown) => void; payload: unknown }) => {
        payload.ack({ ok: true, payload: payload.payload });
      },
    );
    const emitListener = vi.fn();

    const EventBridge = () => {
      const aui = useAui();
      useEffect(() => {
        const unsubInvoke = aui.on(
          { scope: "message", event: "component.invoke" },
          invokeListener,
        );
        const unsubEmit = aui.on(
          { scope: "message", event: "component.emit" },
          emitListener,
        );
        return () => {
          unsubInvoke();
          unsubEmit();
        };
      }, [aui]);
      return null;
    };

    const InteractiveRenderer = ({
      invoke,
      emit,
    }: {
      invoke: (action: string, payload?: unknown) => Promise<unknown>;
      emit: (event: string, payload?: unknown) => void;
    }) => {
      const [result, setResult] = useState<string>("");
      return (
        <div>
          <button
            type="button"
            onClick={async () => {
              const response = await invoke("refresh", { source: "catalog" });
              setResult(JSON.stringify(response));
            }}
          >
            invoke(refresh)
          </button>
          <button
            type="button"
            onClick={() => emit("selected", { source: "catalog" })}
          >
            emit(selected)
          </button>
          <div data-testid="catalog-invoke-result">{result}</div>
        </div>
      );
    };

    render(
      <>
        <EventBridge />
        <UnstableJsonRenderHost
          type="component"
          name="json-render"
          status={{ type: "complete" }}
          instanceId="spec_1"
          props={{ spec: { type: "metrics" } }}
          catalog={{
            by_type: {
              metrics: InteractiveRenderer,
            },
          }}
        />
      </>,
      { wrapper },
    );

    fireEvent.click(screen.getByRole("button", { name: "invoke(refresh)" }));
    await waitFor(() => {
      expect(screen.getByTestId("catalog-invoke-result").textContent).toContain(
        '"ok":true',
      );
    });
    expect(invokeListener).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: "m1",
        instanceId: "spec_1",
        action: "refresh",
        payload: { source: "catalog" },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "emit(selected)" }));
    await waitFor(() => {
      expect(emitListener).toHaveBeenCalledWith({
        messageId: "m1",
        instanceId: "spec_1",
        event: "selected",
        payload: { source: "catalog" },
      });
    });
  });
});
