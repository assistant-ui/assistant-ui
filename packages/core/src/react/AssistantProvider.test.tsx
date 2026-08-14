// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { FC, ReactNode } from "react";
import { render } from "@testing-library/react";
import { AssistantProviderBase } from "./AssistantProvider";
import { useComposerInputPluginRegistryOptional } from "./primitives/composer/ComposerInputPluginContext";
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

describe("AssistantProviderBase", () => {
  it("mounts the composer input plugin registry at the assistant scope", () => {
    let registry: unknown;
    const Probe = () => {
      registry = useComposerInputPluginRegistryOptional();
      return null;
    };

    render(
      <AssistantProviderBase runtime={{} as AssistantRuntime}>
        <Probe />
      </AssistantProviderBase>,
    );

    expect(registry).not.toBeNull();
    expect(registry).toBeDefined();
  });
});
