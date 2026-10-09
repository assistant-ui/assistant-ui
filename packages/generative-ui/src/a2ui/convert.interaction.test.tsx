/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { defaultGenerativeUILibrary } from "../vocabulary";
import { convertSurfaceToUISpec } from "./convert";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("A2UI action bindings", () => {
  it.each(["event", "functionCall"])(
    "reads nested %s bindings from edited inputs",
    async (kind) => {
      const payload = {
        flat: { path: "/name" },
        booking: { name: { path: "/name" } },
        passengers: [{ name: { path: "/name" } }, { path: "/name" }],
        missing: [{ path: "/new" }, "fixed"],
        literal: { name: "Ada" },
        unresolved: ["before", { path: "/unbound" }, "after"],
      };
      const nodes = [
        { id: "root", component: "Column", children: ["name", "new", "send"] },
        { id: "name", component: "TextField", value: { path: "/name" } },
        { id: "new", component: "TextField", value: { path: "/new" } },
        {
          id: "send",
          component: "Button",
          label: "Send",
          action:
            kind === "event"
              ? { event: { name: "send", context: payload } }
              : { functionCall: { call: "send", args: payload } },
        },
      ];
      const { spec, warnings } = convertSurfaceToUISpec({
        components: new Map(nodes.map((node) => [node.id, node])),
        dataModel: { name: "Ada" },
      });
      expect(warnings).toEqual([]);
      const dispatch = vi.fn();
      const container = document.createElement("div");
      const root = createRoot(container);
      try {
        await act(async () =>
          root.render(
            <div data-aui="root">
              {renderGenerativeUI(spec, defaultGenerativeUILibrary, {
                status: "done",
                dispatch,
              })}
            </div>,
          ),
        );
        container.querySelector<HTMLInputElement>(
          'input[name="/name"]',
        )!.value = "Grace";
        container.querySelector<HTMLInputElement>('input[name="/new"]')!.value =
          "New value";
        await act(async () => container.querySelector("button")!.click());
        expect(dispatch).toHaveBeenCalledOnce();
        expect(
          dispatch.mock.calls[0]![0][kind === "event" ? "context" : "args"],
        ).toEqual({
          flat: "Grace",
          booking: { name: "Grace" },
          passengers: [{ name: "Grace" }, "Grace"],
          missing: ["New value", "fixed"],
          literal: { name: "Ada" },
          unresolved: ["before", "after"],
        });
      } finally {
        await act(async () => root.unmount());
      }
    },
  );
});
