// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AuiProvider,
  type ThreadAssistantMessage,
  useAui,
} from "@assistant-ui/react";
import { ThreadMessageClient } from "../../../react/src/client/ThreadMessageClient";
import { JsonRenderHost } from "./JsonRenderHost";

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

describe("JsonRenderHost", () => {
  it("renders spec JSON by default", () => {
    const wrapper = createAuiWrapper(createComponentMessage());
    render(
      <JsonRenderHost
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
      <JsonRenderHost
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
});
