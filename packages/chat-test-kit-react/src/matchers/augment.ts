interface ChatTestKitMatchers<R = unknown> {
  toHaveAssistantText(expected: string | RegExp): R;
  toShowError(match?: string | RegExp): R;
  toHaveText(expected: string): R;
  toStreamCompletely(): R;
  toBeInterrupted(): R;
  toRenderResult(): R;
  toHaveReceivedArgs(expected: Record<string, unknown>): R;
}

declare module "vitest" {
  interface Assertion<T = any> extends ChatTestKitMatchers<T> {}
  interface AsymmetricMatchersContaining extends ChatTestKitMatchers {}
}

export {};
