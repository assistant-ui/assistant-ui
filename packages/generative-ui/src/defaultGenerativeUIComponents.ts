import type { GenerativeUILibrary } from "./types";

const defaultComponents = new WeakMap<object, Set<string>>();

export function registerDefaultGenerativeUILibrary(
  library: GenerativeUILibrary,
) {
  for (const [name, component] of Object.entries(library)) {
    const names =
      defaultComponents.get(component.properties) ?? new Set<string>();
    names.add(name);
    defaultComponents.set(component.properties, names);
  }
}

export function isDefaultGenerativeUIComponent(
  name: string,
  properties: object,
) {
  return defaultComponents.get(properties)?.has(name) ?? false;
}
