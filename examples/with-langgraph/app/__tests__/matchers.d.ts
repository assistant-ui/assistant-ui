import "vitest";

declare module "vitest" {
  interface Assertion<T = any> {
    toHaveAssistantText(expected: string | RegExp): T;
    toShowError(match?: string | RegExp): T;
    toHaveText(expected: string): T;
    toStreamCompletely(): T;
    toBeInterrupted(): T;
    toRenderResult(): T;
    toHaveReceivedArgs(expected: Record<string, unknown>): T;
  }

  interface AsymmetricMatchersContaining {
    toHaveAssistantText(expected: string | RegExp): void;
    toShowError(match?: string | RegExp): void;
    toHaveText(expected: string): void;
    toStreamCompletely(): void;
    toBeInterrupted(): void;
    toRenderResult(): void;
    toHaveReceivedArgs(expected: Record<string, unknown>): void;
  }
}
