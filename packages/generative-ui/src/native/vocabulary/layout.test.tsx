// @vitest-environment jsdom
import { act, createElement } from "react";
import { CardSurfaceProvider, toneTextColor } from "../theme";
import { layoutVocabulary } from "./layout";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  byRole,
  cleanupSpecs,
  contrastRatio,
  press,
  renderElement,
  renderNativeSpec,
  renderWebSpec,
  spec,
  typeText,
} from "../testUtils";

const scheme = vi.hoisted(() => ({ current: "light" as "light" | "dark" }));

vi.mock("react-native", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-native")>()),
  useColorScheme: () => scheme.current,
}));

afterEach(() => {
  cleanupSpecs();
  scheme.current = "light";
});

const actions = {
  save: { description: "Save values" },
  dismiss: { description: "Dismiss card" },
};

const card = (props: Record<string, unknown>, children?: string[]) =>
  spec({
    main: {
      type: "Card",
      props,
      ...(children ? { children } : {}),
      on: {
        confirm: { action: "save", params: { values: { $event: "" } } },
        cancel: { action: "dismiss", params: { values: { $event: "" } } },
      },
    },
    email: { type: "Input", props: { name: "email", label: "Email" } },
    plan: {
      type: "Input",
      props: { name: "plan", label: "Plan", defaultValue: "pro" },
    },
  });

describe("layout vocabulary on React Native", () => {
  it("names the tab row and ties each panel to its tab", () => {
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Tabs",
          props: { tabs: ["First", "Second"], label: "Trip days" },
          children: ["one", "two"],
        },
        one: { type: "Text", props: { value: "One" } },
        two: { type: "Text", props: { value: "Two" } },
      }),
    );
    expect(
      container.querySelector('[role="tablist"]')?.getAttribute("aria-label"),
    ).toBe("Trip days");
    const tabs = [...container.querySelectorAll<HTMLElement>('[role="tab"]')];
    const panels = [
      ...container.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
    ];
    expect(
      panels.map((panel) => panel.getAttribute("aria-labelledby")),
    ).toEqual(tabs.map((tab) => tab.id));
  });

  it("switches Tabs while keeping every panel mounted", async () => {
    const input = spec({
      main: {
        type: "Tabs",
        props: { tabs: ["First"] },
        children: ["one", "two"],
      },
      one: { type: "Input", props: { label: "Name" } },
      two: { type: "Text", props: { value: "Second panel" } },
    });
    const native = renderNativeSpec(input);
    const web = renderWebSpec(input);
    const tabs = () => [
      ...native.container.querySelectorAll<HTMLElement>('[role="tab"]'),
    ];
    const panels = () => [
      ...native.container.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
    ];
    expect(tabs().map((tab) => tab.textContent)).toEqual(
      [...web.container.querySelectorAll('[role="tab"]')].map(
        (tab) => tab.textContent,
      ),
    );
    expect(tabs().map((tab) => tab.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
    ]);
    expect(getComputedStyle(tabs()[0]!).borderBottomColor).toBe(
      "rgb(23, 23, 23)",
    );
    expect(panels()).toHaveLength(2);
    expect(panels()[1]!.style.display).toBe("none");
    await typeText(native.container.querySelector("input")!, "Saved");
    await press(byRole(native.container, "tab", "2"));
    await press(
      web.container.querySelectorAll<HTMLElement>('[role="tab"]')[1]!,
    );
    expect(tabs().map((tab) => tab.getAttribute("aria-selected"))).toEqual([
      "false",
      "true",
    ]);
    expect(getComputedStyle(tabs()[1]!).borderBottomColor).toBe(
      "rgb(23, 23, 23)",
    );
    expect(panels()[0]!.style.display).toBe("none");
    expect(panels()[1]!.textContent).toBe("Second panel");
    expect(panels()[1]!.textContent).toBe(
      [
        ...web.container.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
      ].find((panel) => !panel.hidden)!.textContent,
    );
    await press(byRole(native.container, "tab", "First"));
    expect(native.container.querySelector("input")!.value).toBe("Saved");
  });

  it("omits Tabs with no labels or panels", () => {
    const container = renderElement(
      layoutVocabulary.Tabs.render({ tabs: [] } as never),
    );
    expect(container.textContent).toBe("");
  });

  it("omits an empty Card title", () => {
    const { container } = renderNativeSpec(card({ title: "" }));
    expect(container.querySelector('[role="heading"]')).toBeNull();
  });
  it.each([false, true])(
    "dispatches Card footer events like the web with asForm %s",
    async (asForm) => {
      const input = card(
        { asForm, confirm: { label: "Save" }, cancel: { label: "Dismiss" } },
        ["email", "plan"],
      );
      const native = { save: vi.fn(), dismiss: vi.fn() };
      const web = { save: vi.fn(), dismiss: vi.fn() };
      const nativeSpec = renderNativeSpec(input, native, actions);
      const webSpec = renderWebSpec(input, web, actions);
      await typeText(nativeSpec.container.querySelector("input")!, "a@x.com");
      await typeText(webSpec.container.querySelector("input")!, "a@x.com");

      await press(byRole(nativeSpec.container, "button", "Save"));
      await act(async () =>
        asForm
          ? webSpec.container.querySelector("form")!.requestSubmit()
          : webSpec.container
              .querySelector<HTMLButtonElement>('[data-aui="card-confirm"]')!
              .click(),
      );
      expect(native.save).toHaveBeenCalledOnce();
      expect(native.save.mock.calls[0]![0]).toEqual(web.save.mock.calls[0]![0]);
      expect(native.save.mock.calls[0]![0]).toEqual({
        values: asForm ? { email: "a@x.com", plan: "pro" } : undefined,
      });

      await press(byRole(nativeSpec.container, "button", "Dismiss"));
      await act(async () =>
        webSpec.container
          .querySelector<HTMLButtonElement>('[data-aui="card-cancel"]')!
          .click(),
      );
      expect(native.dismiss).toHaveBeenCalledOnce();
      expect(native.dismiss.mock.calls[0]![0]).toEqual(
        web.dismiss.mock.calls[0]![0],
      );
      expect(native.save).toHaveBeenCalledOnce();
    },
  );

  it("submits an asForm Card from a field's return key", async () => {
    const save = vi.fn();
    const { container } = renderNativeSpec(
      card({ asForm: true, confirm: { label: "Save" } }, ["email"]),
      { save, dismiss: vi.fn() },
      actions,
    );
    const field = container.querySelector("input")!;
    await typeText(field, "a@x.com");
    await act(async () =>
      field.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(save).toHaveBeenCalledWith(
      { values: { email: "a@x.com" } },
      expect.anything(),
    );
  });

  it("tints a Card with a color and turns its own text white", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "Card", props: { title: "Plan", background: "#123456" } },
      }),
    );
    const title = byRole(container, "heading", "Plan");
    expect(title.parentElement!.style.backgroundColor).toBe("rgb(18, 52, 86)");
    expect(title.style.color).toBe("rgb(255, 255, 255)");
  });

  it("mixes Fact delta and Badge text with a tinted Card's white ink", () => {
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Card",
          props: { background: "#123456" },
          children: ["fact", "badge"],
        },
        fact: {
          type: "Fact",
          props: { label: "Revenue", value: "$12k", delta: "+8%" },
        },
        badge: {
          type: "Badge",
          props: { value: "Caution", variant: "warning" },
        },
      }),
    );
    const text = [...container.querySelectorAll<HTMLElement>("div")];
    const delta = text.find(
      (element) =>
        element.textContent === "↑ 8%" && element.children.length === 0,
    )!;
    const badge = text.find(
      (element) =>
        element.textContent === "Caution" && element.children.length === 0,
    )!;
    expect(delta.style.color).toBe(toneTextColor("#2a984b", "#ffffff"));
    expect(badge.style.color).toBe(toneTextColor("#d58300", "#ffffff"));
  });

  it("frames a plain Card as a surface inside a Carousel slide", () => {
    const container = renderElement(
      createElement(
        CardSurfaceProvider,
        { value: true },
        layoutVocabulary.Card.render({ title: "Slide" } as never),
      ),
    );
    const title = byRole(container, "heading", "Slide");
    expect(title.parentElement!.style.backgroundColor).toBe(
      "rgb(255, 255, 255)",
    );
  });

  it("keeps a Card plain for a background React Native cannot paint", () => {
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Card",
          props: { title: "Plan", background: "linear-gradient(red, blue)" },
        },
      }),
    );
    const title = byRole(container, "heading", "Plan");
    expect(title.parentElement!.style.backgroundColor).toBe("");
    expect(title.style.color).toBe("rgb(10, 10, 10)");
  });

  it("spaces and aligns Col and Row children", () => {
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Col",
          props: { gap: 3, align: "center" },
          children: ["row"],
        },
        row: {
          type: "Row",
          props: { justify: "between" },
          children: ["badge"],
        },
        badge: { type: "Badge", props: { value: "New", variant: "success" } },
      }),
    );
    const col = container.firstElementChild as HTMLElement;
    expect(col.style.gap).toBe("12px");
    expect(col.style.alignItems).toBe("center");
    const row = col.firstElementChild as HTMLElement;
    expect(row.style.gap).toBe("8px");
    expect(row.style.justifyContent).toBe("space-between");
    const badge = row.firstElementChild!.firstElementChild as HTMLElement;
    expect(badge.style.backgroundColor).toBe("rgba(42, 152, 75, 0.15)");
    expect(badge.textContent).toBe("New");
  });

  it("lets the parent place a Badge without stretching it", () => {
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Col",
          props: { align: "center" },
          children: ["direct", "form"],
        },
        direct: { type: "Badge", props: { value: "Direct" } },
        form: { type: "Form", props: {}, children: ["nested"] },
        nested: { type: "Badge", props: { value: "Nested" } },
      }),
    );
    const col = container.firstElementChild as HTMLElement;
    const form = col.lastElementChild as HTMLElement;
    for (const [parent, value] of [
      [col, "Direct"],
      [form, "Nested"],
    ] as const) {
      const slot = [...parent.children].find(
        (child) => child.textContent === value,
      ) as HTMLElement;
      const pill = slot.firstElementChild as HTMLElement;
      expect(getComputedStyle(slot).flexDirection).toBe("row");
      expect(getComputedStyle(slot).alignItems).toBe("flex-start");
      expect(["", "auto"]).toContain(getComputedStyle(slot).alignSelf);
      expect(["", "auto"]).toContain(getComputedStyle(pill).alignSelf);
    }
  });

  it("sizes a Box from points, pixels, rems, and percentages", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "Row", props: {}, children: ["a", "b"] },
        a: {
          type: "Box",
          props: {
            width: "50%",
            height: "2rem",
            radius: "full",
            background: "red",
          },
        },
        b: { type: "Box", props: { width: 12, height: "8px", radius: 4 } },
      }),
    );
    const [a, b] = [
      ...(container.firstElementChild as HTMLElement).children,
    ] as HTMLElement[];
    expect([a!.style.width, a!.style.height, a!.style.backgroundColor]).toEqual(
      ["50%", "32px", "rgb(255, 0, 0)"],
    );
    expect([b!.style.width, b!.style.height]).toEqual(["12px", "8px"]);
  });

  it.each([
    ["info", "rgba(23, 23, 23, 0.15)", "rgb(23, 23, 23)"],
    ["success", "rgba(42, 152, 75, 0.15)", "rgb(35, 90, 48)"],
    ["warning", "rgba(213, 131, 0, 0.15)", "rgb(123, 79, 24)"],
    ["danger", "rgba(231, 0, 11, 0.15)", "rgb(134, 27, 22)"],
    ["unknown", "rgb(245, 245, 245)", "rgba(10, 10, 10, 0.62)"],
  ] as const)("colors a %s Badge", (variant, background, color) => {
    const { container } = renderNativeSpec(
      spec({ main: { type: "Badge", props: { value: "Tag", variant } } }),
    );
    const badge = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(badge.style.backgroundColor).toBe(background);
    expect((badge.firstElementChild as HTMLElement).style.color).toBe(color);
  });

  it.each(["light", "dark"] as const)(
    "keeps tone Badge text above 4.5:1 in the %s theme",
    (mode) => {
      scheme.current = mode;
      const surfaces =
        mode === "light"
          ? ["rgb(255, 255, 255)"]
          : ["rgb(10, 10, 10)", "rgb(23, 23, 23)"];

      for (const variant of ["info", "success", "warning", "danger"] as const) {
        const { container } = renderNativeSpec(
          spec({ main: { type: "Badge", props: { value: "Tag", variant } } }),
        );
        const badge = container.firstElementChild!
          .firstElementChild as HTMLElement;
        const text = badge.firstElementChild as HTMLElement;
        for (const surface of surfaces)
          expect(
            contrastRatio(
              text.style.color,
              badge.style.backgroundColor,
              surface,
            ),
          ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("pads a Card by its token and frames a cancel-only footer", async () => {
    const dismiss = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Card",
          props: { title: "Plan", padding: 2, cancel: { label: "Close" } },
          on: { cancel: { action: "dismiss" } },
        },
      }),
      { dismiss },
      actions,
    );
    const title = byRole(container, "heading", "Plan");
    expect(title.parentElement!.style.padding).toBe("8px");
    expect(title.parentElement!.style.backgroundColor).toBe(
      "rgb(255, 255, 255)",
    );
    await press(byRole(container, "button", "Close"));
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it("rounds a Box by points", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "Box", props: { radius: 6, background: "#000000" } },
      }),
    );
    const box = container.firstElementChild as HTMLElement;
    expect(box.style.borderTopLeftRadius || box.style.borderRadius).toBe("6px");
  });
});
