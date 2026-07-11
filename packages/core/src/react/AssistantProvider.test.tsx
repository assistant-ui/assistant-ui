import { describe, expect, it, vi } from "vitest";
import type { FC, ReactElement, ReactNode } from "react";
import {
  AssistantProviderBase,
  type AssistantProviderBaseProps,
} from "./AssistantProvider";
import { ComposerInputPluginProvider } from "./primitives/composer/ComposerInputPluginContext";
import type { AssistantRuntime } from "../runtime/api/assistant-runtime";

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

const renderBase = (children: ReactNode) => {
  const render = (
    AssistantProviderBase as unknown as {
      type: (props: AssistantProviderBaseProps) => ReactElement<{
        children: [unknown, ReactElement<{ children: ReactNode }>];
      }>;
    }
  ).type;
  return render({ runtime: {} as AssistantRuntime, children });
};

describe("AssistantProviderBase", () => {
  it("mounts the composer input plugin registry at the assistant scope", () => {
    const sentinel = <div />;
    const element = renderBase(sentinel);

    expect(element.type).toBe(MockAuiProvider);
    const [, pluginProvider] = element.props.children;
    expect(pluginProvider.type).toBe(ComposerInputPluginProvider);
    expect(pluginProvider.props.children).toBe(sentinel);
  });
});
