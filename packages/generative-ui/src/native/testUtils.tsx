import { act, createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import {
  createStateStore,
  type Spec,
  type SpecStateStore,
} from "generative-frame/spec";
import { SpecRenderer } from "generative-frame/spec/react";
import { toSpecCatalog as toWebSpecCatalog } from "../spec/toSpecCatalog";
import type { GenerativeUILibrary } from "../types";
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
  library?: GenerativeUILibrary,
): RenderedSpec {
  const { catalog, components } = build(library, actions ? { actions } : {});
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

/** Renders a spec with the React Native vocabulary, or a library built on it, through react-native-web. */
export const renderNativeSpec = (
  input: Spec,
  handlers: Handlers = {},
  actions?: Actions,
  library?: GenerativeUILibrary,
) => renderSpec(toSpecCatalog, input, handlers, actions, library);

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

const colorChannels = (value: string) => {
  const channels = value.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length < 3)
    throw new Error(`expected an rgb color, received ${value}`);
  return [channels[0]!, channels[1]!, channels[2]!, channels[3] ?? 1] as const;
};

const relativeLuminance = (red: number, green: number, blue: number) => {
  const linearize = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return (
    0.2126 * linearize(red / 255) +
    0.7152 * linearize(green / 255) +
    0.0722 * linearize(blue / 255)
  );
};

export const contrastRatio = (
  textColor: string,
  tintColor: string,
  surfaceColor: string,
) => {
  const [red, green, blue] = colorChannels(textColor);
  const [tintRed, tintGreen, tintBlue, alpha] = colorChannels(tintColor);
  const [surfaceRed, surfaceGreen, surfaceBlue] = colorChannels(surfaceColor);
  const background = [
    tintRed * alpha + surfaceRed * (1 - alpha),
    tintGreen * alpha + surfaceGreen * (1 - alpha),
    tintBlue * alpha + surfaceBlue * (1 - alpha),
  ];
  const textLuminance = relativeLuminance(red, green, blue);
  const backgroundLuminance = relativeLuminance(
    background[0]!,
    background[1]!,
    background[2]!,
  );
  return (
    (Math.max(textLuminance, backgroundLuminance) + 0.05) /
    (Math.min(textLuminance, backgroundLuminance) + 0.05)
  );
};

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
      (element.hasAttribute("aria-label")
        ? element.getAttribute("aria-label") === name
        : element.textContent === name),
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
