// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiProvider, useAui, type ClientOutput } from "@assistant-ui/store";
import type { ModelContextProvider } from "../../model-context/types";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import type { Toolkit } from "../model-context/toolbox";
import { Tools } from "./Tools";
import { unstable_Interactables } from "./Interactables";

const createModelContext = (active: Set<ModelContextProvider>) => {
  const useModelContext = (): ClientOutput<"modelContext"> => ({
    getState: () => ({ toolNames: [] }),
    getModelContext: () => ({}),
    register: (provider) => {
      active.add(provider);
      return () => active.delete(provider);
    },
  });
  return resource(useModelContext);
};

type ToolUIRegistration = {
  name: string;
  render: ToolCallMessagePartComponent;
  standalone: boolean;
};

const createTools = (
  id: string,
  active: Set<ToolUIRegistration>,
  log: string[],
) => {
  const useTools = (): ClientOutput<"tools"> => ({
    getState: () => ({ toolUIs: {} }),
    setToolUI: (name, render, options) => {
      const registration = {
        name,
        render,
        standalone: options?.standalone ?? false,
      };
      active.add(registration);
      log.push(`setup ${id}`);
      return () => {
        if (active.delete(registration)) log.push(`cleanup ${id}`);
      };
    },
  });
  return resource(useTools);
};

const toolkit = (name: string): Toolkit =>
  ({
    [name]: {
      type: "backend",
    },
  }) satisfies Toolkit;

afterEach(() => {
  cleanup();
});

describe("client registration migration", () => {
  it("moves Tools registrations to the newly committed model context", () => {
    const activeA = new Set<ModelContextProvider>();
    const activeB = new Set<ModelContextProvider>();
    const ModelContextA = createModelContext(activeA);
    const ModelContextB = createModelContext(activeB);

    const Child = ({ tools }: { tools: Toolkit }) => {
      useAui({ tools: Tools({ toolkit: tools }) });
      return null;
    };
    const Harness = ({
      parent,
      tools,
    }: {
      parent: "a" | "b";
      tools: Toolkit;
    }) => {
      const a = useAui({ modelContext: ModelContextA() });
      const b = useAui({ modelContext: ModelContextB() });
      return (
        <AuiProvider value={parent === "a" ? a : b}>
          <Child tools={tools} />
        </AuiProvider>
      );
    };

    const { rerender, unmount } = render(
      <Harness parent="a" tools={toolkit("one")} />,
    );
    expect(activeA.size).toBe(1);
    expect(activeB.size).toBe(0);
    expect(Object.keys([...activeA][0]!.getModelContext().tools ?? {})).toEqual(
      ["one"],
    );

    rerender(<Harness parent="b" tools={toolkit("two")} />);
    expect(activeA.size).toBe(0);
    expect(activeB.size).toBe(1);
    expect(Object.keys([...activeB][0]!.getModelContext().tools ?? {})).toEqual(
      ["two"],
    );

    unmount();
    expect(activeA.size).toBe(0);
    expect(activeB.size).toBe(0);
  });

  it("moves retained Interactables tool UIs when the tools scope changes", async () => {
    const activeA = new Set<ToolUIRegistration>();
    const activeB = new Set<ToolUIRegistration>();
    const log: string[] = [];
    const ToolsA = createTools("a", activeA, log);
    const ToolsB = createTools("b", activeB, log);
    let interactables!: ReturnType<typeof useAui>["unstable_interactables"];
    let selectedTools!: ReturnType<typeof useAui>["tools"];
    let parentA!: ReturnType<typeof useAui>;
    let parentB!: ReturnType<typeof useAui>;

    const Child = () => {
      const aui = useAui({
        unstable_interactables: unstable_Interactables(),
      });
      interactables = aui.unstable_interactables;
      selectedTools = aui.tools;
      return null;
    };
    const Harness = ({ parent }: { parent: "a" | "b" }) => {
      const a = useAui({ tools: ToolsA() });
      const b = useAui({ tools: ToolsB() });
      parentA = a;
      parentB = b;
      return (
        <AuiProvider value={parent === "a" ? a : b}>
          <Child />
        </AuiProvider>
      );
    };

    const { rerender } = render(<Harness parent="a" />);
    expect(parentA.tools).not.toBe(parentB.tools);
    expect(selectedTools).toBe(parentA.tools);
    const updateRender = () => null;
    let unregister!: () => void;
    act(() => {
      unregister = interactables.register({
        id: "note-1",
        name: "note",
        description: "a note",
        stateSchema: { type: "object", properties: {} } as never,
        initialState: {},
        updateRender,
      });
    });
    expect([...activeA]).toEqual([
      { name: "update_note", render: updateRender, standalone: true },
    ]);
    expect(activeB.size).toBe(0);

    rerender(<Harness parent="b" />);
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(selectedTools).toBe(parentB.tools);
    expect(activeA.size).toBe(0);
    expect([...activeB]).toEqual([
      { name: "update_note", render: updateRender, standalone: true },
    ]);
    expect(log).toEqual(["setup a", "cleanup a", "setup b"]);

    act(unregister);
    expect(activeB.size).toBe(0);
    expect(log).toEqual(["setup a", "cleanup a", "setup b", "cleanup b"]);
  });
});
