// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  byRole,
  cleanupSpecs,
  press,
  pressEnter,
  renderNativeSpec,
  renderWebSpec,
  spec,
  typeText,
} from "../testUtils";

afterEach(cleanupSpecs);

const actions = { capture: { description: "Capture" } };
const picker = (inputType: string, value: unknown) => ({
  type: "DatePicker",
  props: { inputType, name: "when", label: "When", value },
  on: { change: { action: "capture", params: { value: { $event: "" } } } },
});
const field = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>("input")!;
const webType = async (input: HTMLInputElement, text: string) => {
  await act(async () =>
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "1", bubbles: true }),
    ),
  );
  await typeText(input, text);
  await act(async () =>
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })),
  );
};

describe("native DatePicker", () => {
  it.each([
    ["date", "2026-07-15", "2026-07-16", "2026-07-16", "YYYY-MM-DD"],
    ["time", "12:00:05.1200", "08:30", "08:30", "HH:MM"],
    [
      "datetime",
      "2025-12-15T17:00:00",
      "2025-12-16 08:30",
      "2025-12-16T08:30",
      "YYYY-MM-DD HH:MM",
    ],
    [
      "datetime",
      "2025-12-15T17:00:00Z",
      "2025-12-16 09:30",
      "2025-12-16T14:30:00Z",
      "YYYY-MM-DD HH:MM",
    ],
    [
      "datetime",
      "2025-12-15T17:00:00+02:00",
      "2025-12-16 09:30",
      "2025-12-16T16:30:00+02:00",
      "YYYY-MM-DD HH:MM",
    ],
  ])(
    "commits and submits %s like the web from %s",
    async (inputType, initial, local, expected, placeholder) => {
      const input = spec({
        main: {
          type: "Card",
          props: { asForm: true, confirm: { label: "Send" } },
          children: ["when"],
          on: {
            confirm: { action: "capture", params: { values: { $event: "" } } },
          },
        },
        when: picker(inputType, initial),
      });
      const native = vi.fn();
      const web = vi.fn();
      const n = renderNativeSpec(input, { capture: native }, actions);
      const w = renderWebSpec(input, { capture: web }, actions);
      expect(field(n.container).placeholder).toBe(placeholder);
      await typeText(field(n.container), local);
      await pressEnter(field(n.container));
      await webType(field(w.container), local.replace(" ", "T"));
      expect(native.mock.calls[0]![0]).toEqual(web.mock.calls[0]![0]);
      expect(native.mock.calls[0]![0]).toEqual({ value: expected });
      await press(byRole(n.container, "button", "Send"));
      await act(async () => w.container.querySelector("form")!.requestSubmit());
      expect(native.mock.lastCall![0]).toEqual(web.mock.lastCall![0]);
      expect(native.mock.lastCall![0]).toEqual({ values: { when: expected } });
    },
  );

  it("keeps invalid text, shows an error border, and emits nothing", async () => {
    const capture = vi.fn();
    const { container } = renderNativeSpec(
      spec({ main: picker("date", "2026-07-15") }),
      { capture },
      actions,
    );
    await typeText(field(container), "2026-02-30");
    await pressEnter(field(container));
    expect(field(container).value).toBe("2026-02-30");
    expect(field(container).style.borderTopColor).toBe("rgb(231, 0, 11)");
    expect(capture).not.toHaveBeenCalled();
  });

  it("commits on blur once and accepts T in a datetime", async () => {
    const capture = vi.fn();
    const { container } = renderNativeSpec(
      spec({ main: picker("datetime", "2025-12-15T17:00:00Z") }),
      { capture },
      actions,
    );
    const input = field(container);
    await typeText(input, "2025-12-16T09:30");
    await act(async () =>
      input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })),
    );
    expect(capture.mock.calls[0]![0]).toEqual({
      value: "2025-12-16T14:30:00Z",
    });
    await act(async () =>
      input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })),
    );
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it("writes a bound instant back to state and follows external changes", async () => {
    const { container, state } = renderNativeSpec(
      spec(
        { main: picker("datetime", { $bindState: "/when" }) },
        { when: "2025-12-15T17:00:00Z" },
      ),
    );
    expect(field(container).value).toBe("2025-12-15 12:00");
    await typeText(field(container), "2025-12-16 09:30");
    await pressEnter(field(container));
    expect(state.get("/when")).toBe("2025-12-16T14:30:00Z");
    await act(async () => state.set("/when", "2025-12-17T17:00:00Z"));
    expect(field(container).value).toBe("2025-12-17 12:00");
  });

  it("restarts an unbound field when its initial value changes", async () => {
    const view = (value: string) => spec({ main: picker("date", value) });
    const rendered = renderNativeSpec(view("2026-07-15"));
    await typeText(field(rendered.container), "2026-07-20");
    await rendered.update(view("2026-07-15"));
    expect(field(rendered.container).value).toBe("2026-07-20");
    await rendered.update(view("2026-07-16"));
    expect(field(rendered.container).value).toBe("2026-07-16");
  });
});
