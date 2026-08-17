import { describe, expect, it, vi } from "vitest";
import type { FC, ReactElement, ReactNode } from "react";
import { MessageByIndexProvider } from "./MessageByIndexProvider";
import { ComposerInputPluginProvider } from "../primitives/composer/ComposerInputPluginContext";

const { MockAuiProvider } = vi.hoisted(() => ({
  MockAuiProvider: (({ children }) => children) as FC<{
    value: unknown;
    children?: ReactNode;
  }>,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => ({}),
    AuiProvider: MockAuiProvider,
  };
});

describe("MessageByIndexProvider", () => {
  it("mounts a fresh composer input plugin registry inside the message scope", () => {
    const sentinel = <div />;
    const element = MessageByIndexProvider({
      index: 0,
      children: sentinel,
    }) as ReactElement<{ children: ReactElement<{ children: ReactNode }> }>;

    expect(element.type).toBe(MockAuiProvider);
    expect(element.props.children.type).toBe(ComposerInputPluginProvider);
    expect(element.props.children.props.children).toBe(sentinel);
  });
});
