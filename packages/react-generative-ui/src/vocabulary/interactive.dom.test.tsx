// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convertSurfaceToUISpec } from "../a2ui/convert";
import { applyA2uiOperations } from "../a2ui/reducer";
import { createActionRegistry, type ActionHandler } from "../actionRegistry";
import type { GenerativeUIDispatch } from "../types";
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

const view = (node: unknown, dispatch?: GenerativeUIDispatch) => (
  <div data-aui="root">
    {renderGenerativeUI(node, defaultGenerativeUILibrary, {
      status: "done",
      ...(dispatch ? { dispatch } : {}),
    })}
  </div>
);

const mount = async (
  node: unknown,
  handlers: Readonly<Record<string, ActionHandler>>,
  parent: HTMLElement = document.body,
) => {
  const container = document.createElement("div");
  parent.append(container);
  const registry = createActionRegistry(handlers);
  root = createRoot(container);
  await act(async () => {
    root!.render(view(node, registry.dispatch));
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

  it("renders a converted A2UI multipleSelection ChoicePicker with its bound values checked", async () => {
    const { state } = applyA2uiOperations(new Map(), [
      { version: "v0.9", createSurface: { surfaceId: "s" } },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "s",
          components: [
            {
              id: "root",
              component: "ChoicePicker",
              variant: "multipleSelection",
              options: toppings,
              value: { path: "/picked" },
            },
          ],
        },
      },
      {
        version: "v0.9",
        updateDataModel: {
          surfaceId: "s",
          path: "/",
          value: { picked: ["basil", "onion"] },
        },
      },
    ]);
    const container = await mount(
      convertSurfaceToUISpec(state.get("s")!).spec,
      {},
    );

    expect(
      [...container.querySelectorAll("input")].map((input) => input.checked),
    ).toEqual([true, false, true]);
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

describe("$field references", () => {
  it("resolve from the enclosing form, or else the generative UI root, at the moment the action fires", async () => {
    const save = vi.fn();
    const container = await mount(
      {
        $type: "Col",
        children: [
          { $type: "Input", name: "title", defaultValue: "Draft" },
          {
            $type: "Select",
            name: "size",
            options: [
              { label: "Medium", value: "m" },
              { label: "Large", value: "l" },
            ],
            defaultValue: "l",
          },
          {
            $type: "Form",
            $action: { type: "submit" },
            children: [
              { $type: "Input", name: "note" },
              {
                $type: "Button",
                label: "Save note",
                $action: {
                  type: "save",
                  note: { $field: "note" },
                  title: { $field: "title" },
                },
              },
            ],
          },
          {
            $type: "Button",
            label: "Save",
            $action: {
              type: "save",
              fields: [{ $field: "title" }, { $field: "missing" }],
              size: { $field: "size" },
              note: { $field: "note" },
              missing: { $field: "missing" },
            },
          },
        ],
      },
      { save },
    );
    const [title, note] = container.querySelectorAll("input");
    const [saveNote, saveAll] = container.querySelectorAll("button");

    expect(title!.value).toBe("Draft");
    expect(container.querySelector("select")!.value).toBe("l");
    title!.value = "Final";
    note!.value = "Ship it";
    await act(async () => saveNote!.click());
    await act(async () => saveAll!.click());

    expect(save.mock.calls.map(([{ payload }]) => payload)).toEqual([
      { type: "save", note: "Ship it" },
      { type: "save", fields: ["Final"], size: "l", note: "Ship it" },
    ]);
  });
  it("never read a host form around the generative UI root", async () => {
    const save = vi.fn();
    const hostForm = document.createElement("form");
    hostForm.innerHTML = '<input name="secret" value="host">';
    document.body.append(hostForm);
    const container = await mount(
      {
        $type: "Button",
        label: "Save",
        $action: { type: "save", secret: { $field: "secret" } },
      },
      { save },
      hostForm,
    );

    await act(async () => container.querySelector("button")!.click());

    expect(save).toHaveBeenCalledWith({ payload: { type: "save" } });
  });
  it("read nothing outside a vocabulary form when the tree has no generative UI root", async () => {
    const save = vi.fn();
    const registry = createActionRegistry({ save });
    const hostForm = document.createElement("form");
    hostForm.innerHTML = '<input name="secret" value="host">';
    const inHost = document.createElement("div");
    const standalone = document.createElement("div");
    hostForm.append(inHost);
    document.body.append(hostForm, standalone);
    const roots = [createRoot(inHost), createRoot(standalone)];
    await act(async () => {
      roots[0]!.render(
        renderGenerativeUI(
          {
            $type: "Button",
            label: "Save",
            $action: { type: "save", secret: { $field: "secret" } },
          },
          defaultGenerativeUILibrary,
          { status: "done", dispatch: registry.dispatch },
        ),
      );
      roots[1]!.render(
        renderGenerativeUI(
          {
            $type: "Form",
            children: [
              { $type: "Input", name: "note", defaultValue: "kept" },
              {
                $type: "Button",
                label: "Save note",
                $action: { type: "save", note: { $field: "note" } },
              },
            ],
          },
          defaultGenerativeUILibrary,
          { status: "done", dispatch: registry.dispatch },
        ),
      );
    });

    await act(async () => inHost.querySelector("button")!.click());
    await act(async () => standalone.querySelector("button")!.click());
    await act(async () => roots.forEach((r) => r.unmount()));

    expect(save.mock.calls.map(([{ payload }]) => payload)).toEqual([
      { type: "save" },
      { type: "save", note: "kept" },
    ]);
  });
});

describe("A2UI two-way binding", () => {
  it("renders bound input values and sends the values the user entered as the action context", async () => {
    const { state } = applyA2uiOperations(new Map(), [
      { version: "v0.9", createSurface: { surfaceId: "s" } },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "s",
          components: [
            {
              id: "root",
              component: "Column",
              children: ["name", "plan", "send"],
            },
            {
              id: "name",
              component: "TextField",
              label: "Name",
              value: { path: "/form/name" },
            },
            {
              id: "plan",
              component: "ChoicePicker",
              options: [
                { label: "Free", value: "free" },
                { label: "Pro", value: "pro" },
              ],
              value: { path: "/form/plan" },
            },
            {
              id: "send",
              component: "Button",
              label: "Send",
              action: {
                event: {
                  name: "send",
                  context: {
                    name: { path: "/form/name" },
                    form: { path: "/form" },
                  },
                },
              },
            },
          ],
        },
      },
      {
        version: "v0.9",
        updateDataModel: {
          surfaceId: "s",
          path: "/",
          value: { form: { name: "Ada", plan: ["free"], id: 7 } },
        },
      },
    ]);
    const send = vi.fn();
    const container = await mount(
      convertSurfaceToUISpec(state.get("s")!).spec,
      { "a2ui:action": send },
    );
    const name = container.querySelector<HTMLInputElement>(
      'input[data-aui="input"]',
    )!;
    const [free, pro] = container.querySelectorAll<HTMLInputElement>(
      'input[type="radio"]',
    );

    expect(name.value).toBe("Ada");
    expect(free!.checked).toBe(true);
    name.value = "Grace";
    await act(async () => pro!.click());
    await act(async () => container.querySelector("button")!.click());

    expect(send).toHaveBeenCalledWith({
      payload: {
        type: "a2ui:action",
        name: "send",
        surfaceId: "s",
        sourceComponentId: "send",
        context: {
          name: "Grace",
          form: { name: "Grace", plan: ["pro"], id: 7 },
        },
      },
    });
  });

  it("keeps what the user entered until the agent updates the bound value", async () => {
    const options = [
      { label: "Free", value: "free" },
      { label: "Pro", value: "pro" },
      { label: "Team", value: "team" },
    ];
    const surface = (data: Record<string, unknown>) =>
      convertSurfaceToUISpec(
        applyA2uiOperations(new Map(), [
          { version: "v0.9", createSurface: { surfaceId: "s" } },
          {
            version: "v0.9",
            updateComponents: {
              surfaceId: "s",
              components: [
                {
                  id: "root",
                  component: "Column",
                  children: ["name", "agree", "plan", "size", "extras", "day"],
                },
                {
                  id: "name",
                  component: "TextField",
                  value: { path: "/name" },
                },
                {
                  id: "agree",
                  component: "CheckBox",
                  value: { path: "/agree" },
                },
                {
                  id: "plan",
                  component: "ChoicePicker",
                  options,
                  value: { path: "/plan" },
                },
                {
                  id: "size",
                  component: "ChoicePicker",
                  displayStyle: "chips",
                  options,
                  value: { path: "/size" },
                },
                {
                  id: "extras",
                  component: "ChoicePicker",
                  variant: "multipleSelection",
                  options,
                  value: { path: "/extras" },
                },
                {
                  id: "day",
                  component: "DateTimeInput",
                  value: { path: "/day" },
                },
              ],
            },
          },
          {
            version: "v0.9",
            updateDataModel: { surfaceId: "s", path: "/", value: data },
          },
        ]).state.get("s")!,
      ).spec;
    const initial = {
      name: "Ada",
      agree: false,
      plan: ["free"],
      size: ["free"],
      extras: [],
      day: "2026-01-02",
    };
    const container = await mount(surface(initial), {});
    const read = () => ({
      name: container.querySelector<HTMLInputElement>(
        'input[data-aui="input"]',
      )!.value,
      agree: container.querySelector<HTMLInputElement>(
        'label[data-aui="checkbox"] input',
      )!.checked,
      plan: container.querySelector<HTMLInputElement>(
        'input[type="radio"]:checked',
      )?.value,
      size: container.querySelector("select")!.value,
      extras: [
        ...container.querySelectorAll<HTMLInputElement>(
          'fieldset[data-aui="checkboxgroup"] input:checked',
        ),
      ].map((input) => input.value),
      day: container.querySelector<HTMLInputElement>('input[type="date"]')!
        .value,
    });
    const edited = {
      name: "Grace",
      agree: false,
      plan: "pro",
      size: "pro",
      extras: ["pro"],
      day: "2026-03-04",
    };
    container.querySelector<HTMLInputElement>(
      'input[data-aui="input"]',
    )!.value = edited.name;
    container.querySelectorAll<HTMLInputElement>(
      'input[type="radio"]',
    )[1]!.checked = true;
    container.querySelector("select")!.value = edited.size;
    container.querySelectorAll<HTMLInputElement>(
      'fieldset[data-aui="checkboxgroup"] input',
    )[1]!.checked = true;
    container.querySelector<HTMLInputElement>('input[type="date"]')!.value =
      edited.day;

    await act(async () => root!.render(view(surface(initial))));
    expect(read()).toEqual(edited);

    await act(async () =>
      root!.render(
        view(
          surface({
            name: "Hopper",
            agree: true,
            plan: ["team"],
            size: ["team"],
            extras: ["team"],
            day: "2026-05-06",
          }),
        ),
      ),
    );
    expect(read()).toEqual({
      name: "Hopper",
      agree: true,
      plan: "team",
      size: "team",
      extras: ["team"],
      day: "2026-05-06",
    });
  });
});
