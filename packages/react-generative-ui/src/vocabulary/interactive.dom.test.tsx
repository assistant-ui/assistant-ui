// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createActionRegistry, type ActionHandler } from "../actionRegistry";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { defaultGenerativeUILibrary } from "./index";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const toppings = [
  { label: "Basil", value: "basil" },
  { label: "Olives", value: "olives" },
  { label: "Onion", value: "onion" },
];

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const mount = async (
  node: unknown,
  handlers: Readonly<Record<string, ActionHandler>>,
) => {
  const container = document.createElement("div");
  document.body.append(container);
  const registry = createActionRegistry(handlers);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <>
        {renderGenerativeUI(node, defaultGenerativeUILibrary, {
          status: "done",
          dispatch: registry.dispatch,
        })}
      </>,
    );
  });
  return container;
};

describe("CheckboxGroup", () => {
  it("dispatches its checked option values in option order on every change", async () => {
    const pick = vi.fn();
    const container = await mount(
      {
        $type: "CheckboxGroup",
        options: toppings,
        defaultValue: ["onion"],
        $action: { type: "pick" },
        children: { $type: "Checkbox", label: "Extra cheese" },
      },
      { pick },
    );
    const [basil, , onion, cheese] = container.querySelectorAll("input");

    await act(async () => basil!.click());
    await act(async () => cheese!.click());
    await act(async () => onion!.click());

    expect(pick.mock.calls.map(([{ payload }]) => payload)).toEqual([
      { type: "pick", $input: ["basil", "onion"] },
      { type: "pick", $input: ["basil"] },
    ]);
  });

  it("submits each group in a Form as its checked values keyed by name", async () => {
    const submit = vi.fn();
    const container = await mount(
      {
        $type: "Form",
        $action: { type: "submit" },
        children: [
          {
            $type: "CheckboxGroup",
            name: "toppings",
            options: toppings,
            defaultValue: ["olives"],
          },
          {
            $type: "CheckboxGroup",
            name: "sides",
            options: [{ label: "Fries", value: "fries" }],
          },
          { $type: "Button", label: "Order", submit: true },
        ],
      },
      { submit },
    );

    await act(async () => container.querySelector("input")!.click());
    await act(async () => container.querySelector("button")!.click());

    expect(submit).toHaveBeenCalledWith({
      payload: {
        type: "submit",
        $input: { toppings: ["basil", "olives"], sides: [] },
      },
    });
  });
});
