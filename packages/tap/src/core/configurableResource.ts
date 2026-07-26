import { resource } from "./resource";
import type { Resource } from "./types";

export const configurableResource =
  <V, A extends any[], O>(hook: (options: O, ...args: A) => V) =>
  (options: O): Resource<V, A> =>
  (...args) =>
    resource(hook)(options, ...args);
