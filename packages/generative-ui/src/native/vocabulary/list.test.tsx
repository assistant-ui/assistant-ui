// @vitest-environment jsdom
import { act, type ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  byRole,
  cleanupSpecs,
  press,
  renderElement,
  renderNativeSpec,
  renderWebSpec,
  spec,
} from "../testUtils";
import {
  createRowLabelStore,
  RowLabelProvider,
  useListViewItemText,
} from "../rowLabel";
import { listVocabulary } from "./list";

const pressables = vi.hoisted(() => ({
  props: [] as ComponentProps<typeof import("react-native").Pressable>[],
}));

vi.mock("react-native", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-native")>();
  const OriginalPressable = original.Pressable;
  return {
    ...original,
    Pressable: (props: ComponentProps<typeof OriginalPressable>) => {
      pressables.props.push(props);
      return <OriginalPressable {...props} />;
    },
  };
});

afterEach(() => {
  cleanupSpecs();
  pressables.props.length = 0;
});

const input = spec({
  main: { type: "ListView", children: ["plain", "linked"] },
  plain: { type: "ListViewItem", children: ["plainText"] },
  plainText: { type: "Text", props: { value: "Plain" } },
  linked: {
    type: "ListViewItem",
    children: ["linkedText"],
    on: { press: { action: "open", params: { value: { $event: "" } } } },
  },
  linkedText: { type: "Text", props: { value: "Linked" } },
});

describe("list vocabulary on React Native", () => {
  it("sets the native row and row action accessibility props", () => {
    renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["name"],
          on: { press: { action: "open" } },
        },
        name: { type: "Text", props: { value: "Order 42" } },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    const row = pressables.props.find(
      (props) => typeof props.style === "function",
    );
    const action = pressables.props.findLast(
      (props) => typeof props.style !== "function",
    );
    expect(row).toBeDefined();
    expect(action).toBeDefined();
    expect(row?.accessible).toBe(false);
    expect(row?.focusable).toBe(false);
    expect(row?.importantForAccessibility).toBe("no");
    expect(action?.accessibilityRole).toBe("button");
    expect(action?.accessibilityLabel).toBe("Order 42");
    expect(action?.onAccessibilityTap).toBe(row?.onPress);
  });

  it("server renders row text registration without layout effect warnings", () => {
    const Registrant = () => {
      useListViewItemText("Photo");
      return null;
    };
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      renderToString(
        <RowLabelProvider value={createRowLabelStore()}>
          <Registrant />
        </RowLabelProvider>,
      );
      expect(error.mock.calls.flat().join(" ")).not.toContain(
        "useLayoutEffect does nothing on the server",
      );
    } finally {
      error.mockRestore();
    }
  });

  it("renders numbered Steps in web order and skips malformed entries", () => {
    const steps = [
      { title: "Prepare", detail: "Gather tools" },
      { detail: "Missing title" },
      null,
      { title: "Finish" },
    ];
    const container = renderElement(
      listVocabulary.Steps.render({ steps } as never),
    );
    const web = renderWebSpec(
      spec({ main: { type: "Steps", props: { steps: [steps[0], steps[3]] } } }),
    );
    expect(container.textContent).toBe("1PrepareGather tools2Finish");
    expect(container.textContent!.replace(/[12]/g, "")).toBe(
      web.container.textContent,
    );
    expect(container.querySelectorAll('[role="list"]')).toHaveLength(1);
  });

  it("renders Timeline time, title, and detail in web order", () => {
    const items = [
      { time: "09:00", title: "Depart", detail: "North gate" },
      { time: "10:00", title: "Arrive" },
    ];
    const native = renderNativeSpec(
      spec({ main: { type: "Timeline", props: { items } } }),
    );
    const web = renderWebSpec(
      spec({ main: { type: "Timeline", props: { items } } }),
    );
    expect(native.container.textContent).toBe(web.container.textContent);
    expect(native.container.textContent).toBe(
      "09:00DepartNorth gate10:00Arrive",
    );
    expect(native.container.querySelectorAll('[role="list"]')).toHaveLength(1);
    expect(
      renderElement(
        listVocabulary.Timeline.render({
          items: [{ title: "No time" }],
        } as never),
      ).textContent,
    ).toBe("No time");
  });

  it.each([
    ["Steps", "steps", [{ title: 0, detail: 12 }], "1012", "012"],
    [
      "Timeline",
      "items",
      [{ time: 0, title: 12, detail: 34 }],
      "01234",
      "01234",
    ],
  ] as const)(
    "renders numeric %s entries",
    (type, prop, entries, nativeText, webText) => {
      const input = spec({ main: { type, props: { [prop]: entries } } });
      const native = renderNativeSpec(input);
      const web = renderWebSpec(input);
      expect(native.container.textContent).toBe(nativeText);
      expect(web.container.textContent).toBe(webText);
    },
  );

  it("uses Steps titles and details to name a bound row", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["steps"],
          on: { press: { action: "open" } },
        },
        steps: {
          type: "Steps",
          props: {
            steps: [
              { title: "Prepare", detail: "Gather tools" },
              { title: "Finish" },
            ],
          },
        },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(
      byRole(container, "button", "Prepare, Gather tools, Finish"),
    ).toBeTruthy();
    for (const text of ["Prepare", "Gather tools", "Finish"]) {
      expect(
        [
          ...container.querySelectorAll<HTMLElement>("[aria-hidden='true']"),
        ].find((element) => element.textContent === text),
      ).toBeTruthy();
    }
  });

  it("uses Timeline time, title, and detail to name a bound row", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["timeline"],
          on: { press: { action: "open" } },
        },
        timeline: {
          type: "Timeline",
          props: {
            items: [{ time: "09:00", title: "Depart", detail: "North gate" }],
          },
        },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(
      byRole(container, "button", "09:00, Depart, North gate"),
    ).toBeTruthy();
    expect(
      [...container.querySelectorAll<HTMLElement>("[aria-hidden='true']")].map(
        (element) => element.textContent,
      ),
    ).toEqual(["09:00", "Depart", "North gate"]);
  });

  it("presses only bound rows with the web payload", async () => {
    const nativeHandler = vi.fn();
    const webHandler = vi.fn();
    const native = renderNativeSpec(
      input,
      { open: nativeHandler },
      { open: { description: "Open" } },
    );
    const web = renderWebSpec(
      input,
      { open: webHandler },
      { open: { description: "Open" } },
    );
    expect(native.container.querySelectorAll('[role="button"]')).toHaveLength(
      1,
    );
    await press(byRole(native.container, "button", "Linked"));
    await act(async () =>
      web.container
        .querySelector<HTMLElement>('[data-aui="listview-item-trigger"]')!
        .click(),
    );
    expect(nativeHandler).toHaveBeenCalledOnce();
    expect(nativeHandler.mock.calls[0]![0]).toEqual(
      webHandler.mock.calls[0]![0],
    );
    const list = native.container.firstElementChild as HTMLElement;
    expect(list.getAttribute("role")).toBe("list");
    const content = list.firstElementChild as HTMLElement;
    const rows = [...content.children] as HTMLElement[];
    expect(rows).toHaveLength(2);
    expect(getComputedStyle(content).marginBottom).toBe("-1px");
    expect(getComputedStyle(rows[0]!).borderBottomWidth).toBe("1px");
    expect(getComputedStyle(rows[1]!).borderBottomColor).toBe(
      "rgba(229, 229, 229, 0.6)",
    );
  });

  it("draws one divider when the middle item is hidden", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["first", "hidden", "last"] },
        first: { type: "ListViewItem", children: ["a"] },
        hidden: { type: "ListViewItem", visible: false, children: ["b"] },
        last: { type: "ListViewItem", children: ["c"] },
        a: { type: "Text", props: { value: "A" } },
        b: { type: "Text", props: { value: "B" } },
        c: { type: "Text", props: { value: "C" } },
      }),
    );
    const list = container.firstElementChild as HTMLElement;
    const content = list.firstElementChild as HTMLElement;
    const rows = [...content.children] as HTMLElement[];
    expect(rows.map((row) => row.textContent)).toEqual(["A", "C"]);
    expect(rows.map((row) => getComputedStyle(row).borderBottomWidth)).toEqual([
      "1px",
      "1px",
    ]);
    expect(getComputedStyle(content).marginBottom).toBe("-1px");
  });

  it("does not press an action without a dispatch function", () => {
    const container = renderElement(
      <>
        {listVocabulary.ListViewItem.render({
          $action: { action: "open" },
          children: "A",
        } as never)}
      </>,
    );
    expect(container.querySelector('[role="button"]')).toBeNull();
    expect(container.textContent).toBe("A");
  });

  it("keeps a nested Button separate from the row action", async () => {
    const open = vi.fn();
    const remove = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["name", "delete"],
          on: { press: { action: "open" } },
        },
        name: { type: "Text", props: { value: "Order 42" } },
        delete: {
          type: "Button",
          props: { label: "Delete" },
          on: { press: { action: "remove" } },
        },
      }),
      { open, remove },
      { open: { description: "Open" }, remove: { description: "Remove" } },
    );

    expect(
      byRole(container, "button", "Order 42").getAttribute("aria-label"),
    ).toBe("Order 42");
    await press(byRole(container, "button", "Delete"));
    expect(remove).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();

    await press(container.querySelector<HTMLElement>('[aria-hidden="true"]')!);
    expect(open).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
  });

  it("activates only the inner bound row and names each row separately", async () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["outer"] },
        outer: {
          type: "ListViewItem",
          children: ["outerText", "inner"],
          on: { press: { action: "outer" } },
        },
        outerText: { type: "Text", props: { value: "Orders" } },
        inner: {
          type: "ListViewItem",
          children: ["innerText"],
          on: { press: { action: "inner" } },
        },
        innerText: { type: "Text", props: { value: "Order 42" } },
      }),
      { outer, inner },
      {
        outer: { description: "Outer" },
        inner: { description: "Inner" },
      },
    );

    expect(container.querySelectorAll('[role="button"]')).toHaveLength(2);
    await press(byRole(container, "button", "Order 42"));
    expect(inner).toHaveBeenCalledOnce();
    expect(outer).not.toHaveBeenCalled();
    const innerText = [
      ...container.querySelectorAll<HTMLElement>('[aria-hidden="true"]'),
    ].find((text) => text.textContent === "Order 42")!;
    await press(innerText);
    expect(inner).toHaveBeenCalledTimes(2);
    expect(outer).not.toHaveBeenCalled();
    expect(
      byRole(container, "button", "Orders").getAttribute("aria-label"),
    ).toBe("Orders");
  });

  it("joins row text and updates its name when text changes", async () => {
    const input = (name: string) =>
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["name", "status"],
          on: { press: { action: "open" } },
        },
        name: { type: "Text", props: { value: name } },
        status: { type: "Caption", props: { value: "Shipped" } },
      });
    const rendered = renderNativeSpec(
      input("Order 42"),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(
      byRole(rendered.container, "button", "Order 42, Shipped"),
    ).toBeTruthy();
    await rendered.update(input("Order 43"));
    expect(
      byRole(rendered.container, "button", "Order 43, Shipped"),
    ).toBeTruthy();
  });

  it("hides consumed text only inside a bound row", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["bound", "plain"] },
        bound: {
          type: "ListViewItem",
          children: ["boundText"],
          on: { press: { action: "open" } },
        },
        boundText: { type: "Text", props: { value: "Bound" } },
        plain: { type: "ListViewItem", children: ["plainText"] },
        plainText: { type: "Text", props: { value: "Plain" } },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    const texts = container.querySelectorAll<HTMLElement>("[dir='auto']");
    expect(
      [...texts]
        .find((text) => text.textContent === "Bound")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      [...texts]
        .find((text) => text.textContent === "Plain")
        ?.getAttribute("aria-hidden"),
    ).not.toBe("true");

    const standalone = renderNativeSpec(
      spec({ main: { type: "Text", props: { value: "Standalone" } } }),
    );
    expect(
      standalone.container.firstElementChild?.getAttribute("aria-hidden"),
    ).not.toBe("true");
  });

  it("names a row in tree order when text sits inside other text", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["header", "card"],
          on: { press: { action: "open" } },
        },
        header: {
          type: "Header",
          props: { text: "Order 42" },
          children: ["badge"],
        },
        badge: { type: "Badge", props: { value: "New" } },
        card: {
          type: "Card",
          props: { title: "Shipping" },
          children: ["status"],
        },
        status: { type: "Text", props: { value: "Shipped" } },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(
      byRole(container, "button", "Order 42, New, Shipping, Shipped"),
    ).toBeTruthy();
  });

  it("keeps a text that clears and refills in its place", async () => {
    const input = (name: string) =>
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["name", "status"],
          on: { press: { action: "open" } },
        },
        name: { type: "Text", props: { value: name } },
        status: { type: "Caption", props: { value: "Shipped" } },
      });
    const rendered = renderNativeSpec(
      input("Order 42"),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(
      byRole(rendered.container, "button", "Order 42, Shipped"),
    ).toBeTruthy();
    await rendered.update(input(""));
    expect(byRole(rendered.container, "button", "Shipped")).toBeTruthy();
    await rendered.update(input("Order 42"));
    expect(
      byRole(rendered.container, "button", "Order 42, Shipped"),
    ).toBeTruthy();
  });

  it("keeps a sibling that shows later in its place in the row name", async () => {
    const rendered = renderNativeSpec(
      spec(
        {
          main: { type: "ListView", children: ["row"] },
          row: {
            type: "ListViewItem",
            children: ["name", "status", "note"],
            on: { press: { action: "open" } },
          },
          name: { type: "Text", props: { value: "Order 42" } },
          status: {
            type: "Caption",
            props: { value: "Shipped" },
            visible: { $state: "/shipped" },
          },
          note: { type: "Caption", props: { value: "Fragile" } },
        },
        { shipped: false },
      ),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    const named = (name: string) =>
      expect(byRole(rendered.container, "button", name)).toBeTruthy();
    named("Order 42, Fragile");
    await act(async () => rendered.state.set("/shipped", true));
    named("Order 42, Shipped, Fragile");
    await act(async () => rendered.state.set("/shipped", false));
    named("Order 42, Fragile");
    await act(async () => rendered.state.set("/shipped", true));
    named("Order 42, Shipped, Fragile");
  });

  it("keeps text in a repeated item in its place when it shows again", async () => {
    const rendered = renderNativeSpec(
      spec(
        {
          main: { type: "ListView", children: ["row"] },
          row: {
            type: "ListViewItem",
            repeat: { path: "/orders" },
            children: ["name", "status", "total"],
            on: { press: { action: "open" } },
          },
          name: { type: "Text", props: { value: { $item: "/name" } } },
          status: {
            type: "Caption",
            props: { value: { $item: "/status" } },
            visible: { $item: "/shown" },
          },
          total: { type: "Caption", props: { value: { $item: "/total" } } },
        },
        {
          orders: [
            { name: "Order 42", status: "Shipped", total: "$12", shown: true },
            { name: "Order 43", status: "Packed", total: "$30", shown: true },
          ],
        },
      ),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    await act(async () => rendered.state.set("/orders/0/shown", false));
    expect(
      byRole(
        rendered.container,
        "button",
        "Order 42, $12, Order 43, Packed, $30",
      ),
    ).toBeTruthy();
    await act(async () => rendered.state.set("/orders/0/shown", true));
    expect(
      byRole(
        rendered.container,
        "button",
        "Order 42, Shipped, $12, Order 43, Packed, $30",
      ),
    ).toBeTruthy();
  });

  it.each([
    {
      type: "Timeline",
      prop: "items",
      entries: (first: boolean) => [
        { ...(first ? { time: "09:00" } : {}), title: "Depart" },
        { time: "10:00", title: "Arrive" },
      ],
      names: ["Depart, 10:00, Arrive", "09:00, Depart, 10:00, Arrive"],
    },
    {
      type: "Map",
      prop: "places",
      entries: (first: boolean) => [
        {
          label: "Pier",
          lat: 36.6,
          lng: -121.9,
          ...(first ? { detail: "Gate A" } : {}),
        },
        { label: "Lab", lat: 36.62, lng: -121.9, detail: "Gate B" },
      ],
      names: ["Gate B", "Gate A, Gate B"],
    },
  ])(
    "keeps a $type entry's text in its place when it clears and returns",
    async ({ type, prop, entries, names }) => {
      const rendered = renderNativeSpec(
        spec(
          {
            main: { type: "ListView", children: ["row"] },
            row: {
              type: "ListViewItem",
              children: ["entries"],
              on: { press: { action: "open" } },
            },
            entries: { type, props: { [prop]: { $state: "/entries" } } },
          },
          { entries: entries(true) },
        ),
        { open: vi.fn() },
        { open: { description: "Open" } },
      );
      await act(async () => rendered.state.set("/entries", entries(false)));
      expect(byRole(rendered.container, "button", names[0])).toBeTruthy();
      await act(async () => rendered.state.set("/entries", entries(true)));
      expect(byRole(rendered.container, "button", names[1])).toBeTruthy();
    },
  );

  it("names a row made of Markdown or an Image", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["notes", "photo"] },
        notes: {
          type: "ListViewItem",
          children: ["markdown"],
          on: { press: { action: "open" } },
        },
        markdown: { type: "Markdown", props: { value: "Order 42 shipped" } },
        photo: {
          type: "ListViewItem",
          children: ["image"],
          on: { press: { action: "open" } },
        },
        image: {
          type: "Image",
          props: { src: "https://example.com/box.png", alt: "Order photo" },
        },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(byRole(container, "button", "Order 42 shipped")).toBeTruthy();
    expect(byRole(container, "button", "Order photo")).toBeTruthy();
    expect(
      [...container.querySelectorAll("[aria-hidden='true']")].map(
        (element) => element.textContent,
      ),
    ).toEqual(["Order 42 shipped", ""]);
  });

  it("keeps an Image alt in place when its source changes", async () => {
    const input = (src: string) =>
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["name", "image", "status"],
          on: { press: { action: "open" } },
        },
        name: { type: "Text", props: { value: "Order 42" } },
        image: { type: "Image", props: { src, alt: "Photo" } },
        status: { type: "Caption", props: { value: "Shipped" } },
      });
    const rendered = renderNativeSpec(
      input("https://example.com/a.png"),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(
      byRole(rendered.container, "button", "Order 42, Photo, Shipped"),
    ).toBeTruthy();
    await rendered.update(input("https://example.com/b.png"));
    expect(
      byRole(rendered.container, "button", "Order 42, Photo, Shipped"),
    ).toBeTruthy();
  });

  it.each(["Select", "CheckboxGroup", "RadioGroup"] as const)(
    "leaves text inside a nested %s out of the row name",
    (type) => {
      const { container } = renderNativeSpec(
        spec({
          main: { type: "ListView", children: ["row"] },
          row: {
            type: "ListViewItem",
            children: ["name", "control"],
            on: { press: { action: "open" } },
          },
          name: { type: "Text", props: { value: "Order 42" } },
          control: {
            type,
            props: { options: [{ value: "a", label: "Choice A" }] },
            children: ["hint"],
          },
          hint: { type: "Caption", props: { value: "Choose carefully" } },
        }),
        { open: vi.fn() },
        { open: { description: "Open" } },
      );
      expect(byRole(container, "button", "Order 42")).toBeTruthy();
      expect(
        [
          ...container.querySelectorAll<HTMLElement>('[aria-hidden="true"]'),
        ].map((text) => text.textContent),
      ).toEqual(["Order 42"]);
    },
  );

  it("leaves text inside a nested Button out of the row name", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["name", "buy"],
          on: { press: { action: "open" } },
        },
        name: { type: "Text", props: { value: "Order 42" } },
        buy: {
          type: "Button",
          props: { label: "Buy" },
          children: ["price"],
          on: { press: { action: "buy" } },
        },
        price: { type: "Caption", props: { value: "Cannot undo" } },
      }),
      { open: vi.fn(), buy: vi.fn() },
      { open: { description: "Open" }, buy: { description: "Buy" } },
    );
    expect(byRole(container, "button", "Order 42")).toBeTruthy();
    expect(
      [...container.querySelectorAll('[aria-hidden="true"]')].map(
        (text) => text.textContent,
      ),
    ).toEqual(["Order 42"]);
  });

  it("names rows from Header, Alert, Fact, Badge, and Card text", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["header", "alert", "fact", "badge", "card"],
          on: { press: { action: "open" } },
        },
        header: { type: "Header", props: { text: "Order 42" } },
        alert: {
          type: "Alert",
          props: { title: "Delayed", description: "One day" },
        },
        fact: {
          type: "Fact",
          props: { label: "Items", value: 2, delta: "+1" },
        },
        badge: { type: "Badge", props: { value: "New" } },
        card: { type: "Card", props: { title: "Shipping" } },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(
      byRole(
        container,
        "button",
        "Order 42, Delayed, One day, Items, 2, ↑ 1, New, Shipping",
      ),
    ).toBeTruthy();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(8);
  });

  it("does not add whitespace-only text to a row name", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["blank", "name"],
          on: { press: { action: "open" } },
        },
        blank: { type: "Text", props: { value: "   " } },
        name: { type: "Caption", props: { value: "Shipped" } },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(byRole(container, "button", "Shipped")).toBeTruthy();
    expect(
      container.querySelector('[dir="auto"]')?.getAttribute("aria-hidden"),
    ).not.toBe("true");
  });

  it("removes an unmounted text child from the row name", async () => {
    const row = (show: boolean) =>
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: show ? ["name", "status"] : ["name"],
          on: { press: { action: "open" } },
        },
        name: { type: "Text", props: { value: "Order 42" } },
        status: { type: "Caption", props: { value: "Shipped" } },
      });
    const rendered = renderNativeSpec(
      row(true),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(
      byRole(rendered.container, "button", "Order 42, Shipped"),
    ).toBeTruthy();
    await rendered.update(row(false));
    expect(byRole(rendered.container, "button", "Order 42")).toBeTruthy();
  });

  it("switches a row between bound and unbound without console errors", async () => {
    const row = (bound: boolean) =>
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["name", "status"],
          ...(bound ? { on: { press: { action: "open" } } } : {}),
        },
        name: { type: "Text", props: { value: "Order 42" } },
        status: { type: "Caption", props: { value: "Shipped" } },
      });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const rendered = renderNativeSpec(
        row(true),
        { open: vi.fn() },
        { open: { description: "Open" } },
      );
      expect(
        byRole(rendered.container, "button", "Order 42, Shipped"),
      ).toBeTruthy();
      await rendered.update(row(false));
      expect(rendered.container.querySelector('[role="button"]')).toBeNull();
      await rendered.update(row(true));
      expect(
        byRole(rendered.container, "button", "Order 42, Shipped"),
      ).toBeTruthy();
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it("covers the row with a non-intercepting action button", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["name"],
          on: { press: { action: "open" } },
        },
        name: { type: "Text", props: { value: "Order 42" } },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    const style = getComputedStyle(byRole(container, "button", "Order 42"));
    expect(style.position).toBe("absolute");
    expect(style.pointerEvents).toBe("none");
  });
});
