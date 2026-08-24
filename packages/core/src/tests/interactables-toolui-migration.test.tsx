// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withKey } from "@assistant-ui/tap";
import { useAui } from "@assistant-ui/store";
import { Tools } from "../react/client/Tools";
import { unstable_Interactables } from "../react/client/Interactables";

type AnyClient = Record<string, any>;

afterEach(() => {
  cleanup();
});

describe("interactables update-tool UI registration", () => {
  it("migrates to a structurally replaced tools scope", async () => {
    let aui!: AnyClient;
    const Harness = ({ generation }: { generation: number }) => {
      aui = useAui({
        tools: withKey(String(generation), Tools({})),
        unstable_interactables: unstable_Interactables({}),
      } as never);
      return null;
    };
    const view = render(<Harness generation={0} />);

    const toolUIs = () =>
      (aui.tools().getState().toolUIs ?? {}) as Record<string, unknown[]>;
    // setToolUI lands after the tap scheduler drains its macrotask
    await act(async () => {
      aui.unstable_interactables.register({
        id: "call-1",
        name: "note",
        description: "a note",
        stateSchema: { type: "object", properties: {} },
        initialState: {},
        updateRender: () => null,
      });
      await vi.waitFor(() => expect(Object.keys(toolUIs())).toHaveLength(1));
    });
    const [toolName] = Object.keys(toolUIs());
    const firstRegistration = toolUIs()[toolName!]![0];

    // A rerender inside an outer act would not land until that act exits,
    // so the swap happens first and only the scheduler wait is wrapped
    view.rerender(<Harness generation={1} />);

    // The remounted tools scope starts from fresh state; a registration
    // object distinct from the pre-swap one proves the retained entry was
    // re-applied on the replacement instance rather than read stale. It
    // lands one scheduler macrotask after the swap, once the tap scheduler
    // drains.
    await act(async () => {
      await vi.waitFor(() => {
        const registration = toolUIs()[toolName!]?.[0];
        expect(registration).toBeDefined();
        expect(registration).not.toBe(firstRegistration);
      });
    });

    // Post-settle cardinality: a duplicate re-apply would leave a second
    // registration whose disposer was dropped
    expect(toolUIs()[toolName!]).toHaveLength(1);
  });
});
