// @vitest-environment jsdom
import { act } from "react";
import { AccessibilityInfo } from "react-native";
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

afterEach(() => {
  cleanupSpecs();
  vi.useRealTimers();
});

const actions = {
  go: { description: "Go" },
  capture: { description: "Capture a value" },
};

describe("interactive vocabulary on React Native", () => {
  it("presses a Button like the web", async () => {
    const input = spec({
      main: {
        type: "Button",
        props: { label: "Go", buttonStyle: "primary" },
        on: { press: { action: "go", params: { from: "button" } } },
      },
    });
    const native = vi.fn();
    const web = vi.fn();
    const { container } = renderNativeSpec(input, { go: native }, actions);
    const webSpec = renderWebSpec(input, { go: web }, actions);
    await press(byRole(container, "button", "Go"));
    await act(async () => webSpec.container.querySelector("button")!.click());
    expect(native.mock.calls[0]![0]).toEqual(web.mock.calls[0]![0]);
    expect(byRole(container, "button", "Go").style.backgroundColor).toBe(
      "rgb(23, 23, 23)",
    );
  });

  it("counts an undoable Button down and fires after the window", async () => {
    vi.useFakeTimers();
    const announce = vi
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
    const go = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Button",
          props: { label: "Delete", undoable: true },
          on: { press: { action: "go" } },
        },
      }),
      { go },
      actions,
    );
    await press(byRole(container, "button", "Delete"));
    expect(byRole(container, "button", "Undo Delete").textContent).toBe(
      "Undo 5",
    );
    expect(announce).toHaveBeenCalledWith("Delete in 5 seconds");
    for (let second = 0; second < 4; second++)
      await act(async () => vi.advanceTimersByTime(1_000));
    expect(byRole(container, "button", "Undo Delete").textContent).toBe(
      "Undo 1",
    );
    expect(go).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1_000));
    expect(go).toHaveBeenCalledOnce();
    expect(byRole(container, "button", "Delete").textContent).toBe("Delete");
  });

  it("cancels an undoable Button on a second press", async () => {
    vi.useFakeTimers();
    vi.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(
      () => {},
    );
    const go = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Button",
          props: { label: "Delete", undoable: true },
          on: { press: { action: "go" } },
        },
      }),
      { go },
      actions,
    );
    await press(byRole(container, "button", "Delete"));
    await press(byRole(container, "button", "Undo Delete"));
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(go).not.toHaveBeenCalled();
    expect(byRole(container, "button", "Delete").textContent).toBe("Delete");
  });

  it("submits the enclosing asForm Card from a submit Button", async () => {
    const capture = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Card",
          props: { asForm: true },
          children: ["name", "send"],
          on: {
            confirm: { action: "capture", params: { values: { $event: "" } } },
          },
        },
        name: { type: "Input", props: { name: "name", label: "Name" } },
        send: { type: "Button", props: { label: "Send", submit: true } },
      }),
      { capture },
      actions,
    );
    await typeText(container.querySelector("input")!, "Ada");
    await press(byRole(container, "button", "Send"));
    expect(capture.mock.calls[0]![0]).toEqual({ values: { name: "Ada" } });
  });

  it("submits an unbound Input's text on return like the web", async () => {
    const input = spec({
      main: {
        type: "Input",
        props: { label: "Search", defaultValue: "a" },
        on: {
          submit: { action: "capture", params: { value: { $event: "" } } },
        },
      },
    });
    const native = vi.fn();
    const web = vi.fn();
    const nativeSpec = renderNativeSpec(input, { capture: native }, actions);
    const webSpec = renderWebSpec(input, { capture: web }, actions);
    await typeText(nativeSpec.container.querySelector("input")!, "abc");
    await typeText(webSpec.container.querySelector("input")!, "abc");
    await pressEnter(nativeSpec.container.querySelector("input")!);
    await pressEnter(webSpec.container.querySelector("input")!);
    expect(native.mock.calls[0]![0]).toEqual(web.mock.calls[0]![0]);
    expect(native.mock.calls[0]![0]).toEqual({ value: "abc" });
  });

  it("writes a bound Input back to state and follows it", async () => {
    const { container, state } = renderNativeSpec(
      spec(
        {
          main: {
            type: "Input",
            props: { label: "Name", defaultValue: { $bindState: "/name" } },
          },
        },
        { name: "Ada" },
      ),
    );
    const field = container.querySelector("input")!;
    expect(field.value).toBe("Ada");
    await typeText(field, "Grace");
    expect(state.get("/name")).toBe("Grace");
    await act(async () => state.set("/name", "Hopper"));
    expect(field.value).toBe("Hopper");
  });

  it("restarts an unbound Input when its initial value changes", async () => {
    const view = (defaultValue: string) =>
      spec({ main: { type: "Input", props: { label: "Name", defaultValue } } });
    const rendered = renderNativeSpec(view("a"));
    await typeText(rendered.container.querySelector("input")!, "typed");
    await rendered.update(view("a"));
    expect(rendered.container.querySelector("input")!.value).toBe("typed");
    await rendered.update(view("b"));
    expect(rendered.container.querySelector("input")!.value).toBe("b");
  });

  it("hides a password and keeps a multiline Input from submitting on return", async () => {
    const capture = vi.fn();
    const { container } = renderNativeSpec(
      spec({
        main: { type: "Col", props: {}, children: ["secret", "notes"] },
        secret: {
          type: "Input",
          props: { label: "Secret", inputType: "password" },
        },
        notes: {
          type: "Input",
          props: { label: "Notes", multiline: true },
          on: { submit: { action: "capture" } },
        },
      }),
      { capture },
      actions,
    );
    expect(container.querySelector("input")!.type).toBe("password");
    const notes = container.querySelector("textarea")!;
    await pressEnter(notes);
    expect(capture).not.toHaveBeenCalled();
  });
});
