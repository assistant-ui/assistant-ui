import type { Mock } from "vitest";

export type Selector = (state: unknown) => unknown;

// The createRuntimeExtras brand symbol is module-private. To stand in for
// runtime-produced extras, wrap a plain object in a Proxy whose `has` trap
// claims any symbol described "useAISDKRuntime extras" is present.
export const makeExtras = (extras: Record<string, unknown>) =>
  new Proxy(extras, {
    has: (target, key) =>
      (typeof key === "symbol" &&
        key.description === "useAISDKRuntime extras") ||
      Reflect.has(target, key),
  });

export const createRunSelectorAgainst =
  (mock: Mock) =>
  (extras: unknown): void => {
    mock.mockImplementationOnce((selector: Selector) =>
      selector({ thread: { extras } }),
    );
  };
