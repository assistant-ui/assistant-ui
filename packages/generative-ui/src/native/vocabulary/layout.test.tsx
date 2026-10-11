// @vitest-environment jsdom
import { act, createElement } from "react";
import { CardSurfaceProvider } from "../theme";
import { layoutVocabulary } from "./layout";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  byRole,
  cleanupSpecs,
  press,
  renderElement,
  renderNativeSpec,
  renderWebSpec,
  spec,
  typeText,
} from "../testUtils";

afterEach(cleanupSpecs);

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

  it("spaces and aligns Col and Row children, and lets a Badge follow", () => {
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
    const badge = row.firstElementChild as HTMLElement;
    expect(badge.style.alignSelf).toBe("flex-start");
    expect(badge.style.backgroundColor).toBe("rgba(42, 152, 75, 0.15)");
    expect(badge.textContent).toBe("New");
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
    ["warning", "rgba(213, 131, 0, 0.15)", "rgb(213, 131, 0)"],
    ["danger", "rgba(231, 0, 11, 0.15)", "rgb(231, 0, 11)"],
    ["unknown", "rgb(245, 245, 245)", "rgba(10, 10, 10, 0.62)"],
  ])("colors a %s Badge", (variant, background, color) => {
    const { container } = renderNativeSpec(
      spec({ main: { type: "Badge", props: { value: "Tag", variant } } }),
    );
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.style.backgroundColor).toBe(background);
    expect((badge.firstElementChild as HTMLElement).style.color).toBe(color);
  });

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
