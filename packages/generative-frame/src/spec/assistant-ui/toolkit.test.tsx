import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { defineCatalog } from "../catalog";
import { SpecRenderer, type SpecComponentProps } from "../react/SpecRenderer";
import { specToolkitFor } from "./toolkit";

afterEach(cleanup);

const catalog = defineCatalog({
  components: {
    Label: {
      description: "Label",
      props: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  },
});
const Label = ({ props }: SpecComponentProps) => (
  <span>{String(props.text)}</span>
);
const previous = {
  root: "label",
  elements: { label: { type: "Label", props: { text: "before" } } },
  state: {},
};
const patches =
  '{"op":"replace","path":"/elements/label/props/text","value":"after"}\n';
type Entry = {
  render: ComponentType<{ args: Record<string, unknown>; toolCallId: string }>;
  execute?: (input: unknown, call: { toolCallId: string }) => Promise<unknown>;
};

it("forwards host confirmation to rendered catalog actions", async () => {
  const protectedCatalog = defineCatalog({
    components: { Button: { description: "Button", events: ["press"] } },
    actions: { deleteItem: { description: "Deletes an item", confirm: true } },
  });
  const confirmAction = vi.fn(() => true);
  const deleteItem = vi.fn();
  const toolkit = specToolkitFor({
    useMessages: () => [],
    useArgsComplete: () => true,
    SpecRenderer,
    Frame: ({ children }) => <>{children}</>,
    useSendMessage: () => () => {},
    useModelContext: () => {},
  })(protectedCatalog, {
    components: {
      Button: ({ emit }: SpecComponentProps) => (
        <button onClick={() => emit("press")}>Delete</button>
      ),
    },
    handlers: { deleteItem },
    confirmAction,
  });
  const Render = (
    toolkit.entries({ execution: "frontend", display: "standalone" })
      .render_spec as Entry
  ).render;
  const view = render(
    <Render
      toolCallId="s"
      args={{
        title: "s",
        spec: {
          root: "b",
          elements: {
            b: { type: "Button", on: { press: { action: "deleteItem" } } },
          },
        },
      }}
    />,
  );
  await act(async () => fireEvent.click(view.getByText("Delete")));
  expect(confirmAction).toHaveBeenCalledExactlyOnceWith({
    action: "deleteItem",
    params: {},
    elementId: "b",
  });
  expect(deleteItem).toHaveBeenCalledOnce();
});

it("dispatches a bound write while streaming without dispatching model state patches", () => {
  const refresh = vi.fn();
  const watchCatalog = defineCatalog({
    components: catalog.components,
    actions: { refresh: { description: "Refresh" } },
  });
  const base = {
    root: "label",
    elements: {
      label: {
        type: "Label",
        props: { text: { $bindState: "/text" } },
        watch: { "/text": { action: "refresh" } },
      },
    },
    state: { text: "model" },
  };
  const messages = [
    {
      content: [
        {
          type: "tool-call",
          toolCallId: "previous",
          toolName: "render_spec",
          args: { title: "board", spec: base },
        },
        {
          type: "tool-call",
          toolCallId: "next",
          toolName: "render_spec",
          args: {},
        },
      ],
    },
  ];
  const toolkit = specToolkitFor({
    useMessages: () => messages,
    useArgsComplete: () => false,
    SpecRenderer,
    Frame: ({ children }) => <>{children}</>,
    useSendMessage: () => () => {},
    useModelContext: () => {},
  })(watchCatalog, {
    components: {
      Label: ({ props, setProp }: SpecComponentProps) => (
        <button onClick={() => setProp("text", "user")}>
          {String(props.text)}
        </button>
      ),
    },
    handlers: { refresh },
  });
  const Render = (
    toolkit.entries({ execution: "frontend", display: "standalone" })
      .render_spec as Entry
  ).render;
  const patch = (text: string) =>
    JSON.stringify({ op: "replace", path: "/state/text", value: text }) + "\n";
  const first = patch("streamed");
  const view = render(<Render toolCallId="next" args={{ title: "board" }} />);
  view.rerender(
    <Render toolCallId="next" args={{ title: "board", patches: first }} />,
  );
  expect(view.getByRole("button").textContent).toBe("streamed");
  expect(refresh).not.toHaveBeenCalled();

  fireEvent.click(view.getByRole("button"));
  expect(view.getByRole("button").textContent).toBe("user");
  expect(refresh).toHaveBeenCalledTimes(1);

  view.rerender(
    <Render
      toolCallId="next"
      args={{ title: "board", patches: first + patch("later") }}
    />,
  );
  expect(view.getByRole("button").textContent).toBe("user");
  expect(refresh).toHaveBeenCalledTimes(1);
});

it.each(["frontend", "backend"] as const)(
  "renders %s patches when the title arrives after mount",
  async (execution) => {
    const messages = [
      {
        content: [
          {
            type: "tool-call",
            toolCallId: "previous",
            toolName: "render_spec",
            args: { title: "board", spec: previous },
          },
          {
            type: "tool-call",
            toolCallId: "next",
            toolName: "render_spec",
            args: {},
          },
        ],
      },
    ];
    let complete = false;
    const toolkit = specToolkitFor({
      useMessages: () => messages,
      useArgsComplete: () => complete,
      SpecRenderer,
      Frame: ({ children }) => <>{children}</>,
      useSendMessage: () => () => {},
      useModelContext: () => {},
    })(catalog, { components: { Label } });
    const entry = toolkit.entries({ execution, display: "standalone" })
      .render_spec as Entry;
    const Render = entry.render;
    const view = render(<Render toolCallId="next" args={{}} />);
    view.rerender(<Render toolCallId="next" args={{ title: "b", patches }} />);
    view.rerender(
      <Render toolCallId="next" args={{ title: "board", patches }} />,
    );
    expect(view.container.textContent).toBe("after");
    complete = true;
    view.rerender(
      <Render toolCallId="next" args={{ title: "board", patches }} />,
    );
    expect(view.container.textContent).toBe("after");
    if (entry.execute)
      expect(
        await entry.execute(
          { title: "board", patches },
          { toolCallId: "next" },
        ),
      ).toMatchObject({ ok: true, version: 2 });
  },
);

it("keeps the call's original history and applies each patch once", () => {
  const history = (items: string[]) => [
    {
      content: [
        {
          type: "tool-call",
          toolCallId: "previous",
          toolName: "render_spec",
          args: { title: "board", spec: { ...previous, state: { items } } },
        },
        {
          type: "tool-call",
          toolCallId: "next",
          toolName: "render_spec",
          args: {},
        },
      ],
    },
  ];
  let messages = history(["original"]);
  let complete = false;
  const toolkit = specToolkitFor({
    useMessages: () => messages,
    useArgsComplete: () => complete,
    SpecRenderer,
    Frame: ({ children }) => <>{children}</>,
    useSendMessage: () => () => {},
    useModelContext: () => {},
  })(catalog, {
    components: {
      Label: ({ state }: SpecComponentProps) => (
        <span>{JSON.stringify(state.get("/items"))}</span>
      ),
    },
  });
  const Render = (
    toolkit.entries({ execution: "frontend", display: "standalone" })
      .render_spec as Entry
  ).render;
  const view = render(<Render toolCallId="next" args={{}} />);
  messages = history(["other thread"]);
  const append = (value: string) =>
    JSON.stringify({ op: "add", path: "/state/items/-", value }) + "\n";
  const first = append("one");
  view.rerender(
    <Render toolCallId="next" args={{ title: "board", patches: first }} />,
  );
  expect(view.container.textContent).toBe('["original","one"]');
  const element = view.container.firstChild;
  const both = first + append("two");
  view.rerender(
    <Render toolCallId="next" args={{ title: "board", patches: both }} />,
  );
  expect(view.container.textContent).toBe('["original","one","two"]');
  expect(view.container.firstChild).toBe(element);
  complete = true;
  view.rerender(
    <Render toolCallId="next" args={{ title: "board", patches: both }} />,
  );
  expect(view.container.textContent).toBe('["original","one","two"]');
});
