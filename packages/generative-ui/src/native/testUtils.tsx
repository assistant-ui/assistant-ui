import { act, createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import {
  createStateStore,
  type Spec,
  type SpecStateStore,
} from "generative-frame/spec";
import { SpecRenderer } from "generative-frame/spec/react";
import { toSpecCatalog as toWebSpecCatalog } from "../spec/toSpecCatalog";
import { toSpecCatalog } from "./toSpecCatalog";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Handlers = Record<string, (params: Record<string, unknown>) => unknown>;
type Actions = Record<string, { description: string }>;

export type RenderedSpec = {
  container: HTMLElement;
  state: SpecStateStore;
  update(spec: Spec): Promise<void>;
};

const unmounts: (() => void)[] = [];

function renderSpec(
  build: typeof toSpecCatalog,
  input: Spec,
  handlers: Handlers,
  actions: Actions | undefined,
): RenderedSpec {
  const { catalog, components } = build(undefined, actions ? { actions } : {});
  const container = document.createElement("div");
  document.body.append(container);
  const state = createStateStore(input.state ?? {});
  const root = createRoot(container);
  const element = (spec: Spec) =>
    createElement(SpecRenderer, { spec, catalog, components, state, handlers });
  act(() => root.render(element(input)));
  unmounts.push(() => act(() => root.unmount()));
  return {
    container,
    state,
    update: async (spec) => {
      await act(async () => root.render(element(spec)));
    },
  };
}

/** Renders a spec with the React Native vocabulary, through react-native-web. */
export const renderNativeSpec = (
  input: Spec,
  handlers: Handlers = {},
  actions?: Actions,
) => renderSpec(toSpecCatalog, input, handlers, actions);

/** Renders the same spec with the web vocabulary, to compare what each dispatches. */
export const renderWebSpec = (
  input: Spec,
  handlers: Handlers = {},
  actions?: Actions,
) => renderSpec(toWebSpecCatalog, input, handlers, actions);

/** Renders any element, for a component that needs a context a spec cannot set. */
export function renderElement(element: ReactElement): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(element));
  unmounts.push(() => act(() => root.unmount()));
  return container;
}

export function cleanupSpecs() {
  for (const unmount of unmounts.splice(0)) unmount();
  document.body.replaceChildren();
}

export const spec = (
  elements: Spec["elements"],
  state: Spec["state"] = {},
): Spec => ({ root: "main", elements, state });

/** The element a React Native component with this accessible role and name renders. */
export const byRole = (container: HTMLElement, role: string, name?: string) => {
  const matches = [
    ...container.querySelectorAll<HTMLElement>(`[role="${role}"]`),
  ].filter(
    (element) =>
      name === undefined ||
      element.getAttribute("aria-label") === name ||
      element.textContent === name,
  );
  if (matches.length !== 1)
    throw new Error(
      `expected one ${role} named ${name}, found ${matches.length}`,
    );
  return matches[0]!;
};

/** Presses a `Pressable` the way assistive technology and keyboards do, through a click. */
export const press = async (element: HTMLElement) => {
  await act(async () => element.click());
};

/** Replaces a `TextInput`'s text as typing would. */
export const typeText = async (
  input: HTMLInputElement | HTMLTextAreaElement,
  text: string,
) => {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(input),
    "value",
  )!.set!;
  await act(async () => {
    setter.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

/** Presses the return key in a `TextInput`. */
export const pressEnter = async (input: HTMLElement) => {
  await act(async () => {
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  });
};
