// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  BuilderControls: vi.fn(() => null),
  BuilderPreview: vi.fn(() => null),
  BuilderCodeOutput: vi.fn(() => null),
  CreateDialog: vi.fn(({ children }: { children: ReactNode }) => children),
  PlaygroundChatProvider: vi.fn(
    ({ children }: { children: ReactNode }) => children,
  ),
  PlaygroundRuntimeProvider: vi.fn(
    ({ children }: { children: ReactNode }) => children,
  ),
}));

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/react")>();
  const { createElement } = await import("react");

  return {
    ...actual,
    ThreadListPrimitive: {
      ...actual.ThreadListPrimitive,
      New: (props: React.ComponentProps<"button">) =>
        createElement("button", props, props.children),
    },
  };
});

vi.mock(
  "@/components/pages/playground/builder-controls",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/components/pages/playground/builder-controls")
    >()),
    BuilderControls: mocks.BuilderControls,
  }),
);

vi.mock(
  "@/components/pages/playground/builder-preview",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/components/pages/playground/builder-preview")
    >()),
    BuilderPreview: mocks.BuilderPreview,
  }),
);

vi.mock(
  "@/components/pages/playground/builder-code-output",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/components/pages/playground/builder-code-output")
    >()),
    BuilderCodeOutput: mocks.BuilderCodeOutput,
  }),
);

vi.mock(
  "@/components/pages/playground/create-dialog",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/components/pages/playground/create-dialog")
    >()),
    CreateDialog: mocks.CreateDialog,
  }),
);

vi.mock(
  "@/components/pages/playground/builder-chat-sidebar",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/components/pages/playground/builder-chat-sidebar")
    >()),
    PlaygroundChatProvider: mocks.PlaygroundChatProvider,
    PlaygroundChatThread: () => null,
  }),
);

vi.mock("@/runtimes/playground", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/runtimes/playground")>()),
  PlaygroundRuntimeProvider: mocks.PlaygroundRuntimeProvider,
}));

vi.mock("@/lib/playground-url-state", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/playground-url-state")>();
  const { useState } = await import("react");
  const { DEFAULT_CONFIG } =
    await import("@/components/pages/playground/types");

  return {
    ...actual,
    usePlaygroundState: () => {
      const [showCode, setShowCode] = useState(false);

      return {
        config: DEFAULT_CONFIG,
        showCode,
        viewportPreset: "desktop" as const,
        viewportWidth: "100%" as const,
        setConfig: () => {},
        setShowCode,
        setViewportPreset: () => {},
        setViewportWidth: () => {},
      };
    },
  };
});

const { default: PlaygroundPage } = await import("./page");

afterEach(() => cleanup());

const hideResponsiveLabels = (container: HTMLElement) => {
  for (const label of container.querySelectorAll<HTMLElement>("span.hidden")) {
    label.style.display = "none";
  }
};

describe("PlaygroundPage header controls", () => {
  it("keeps the Code toggle and project trigger named when their text is hidden", () => {
    const { container } = render(<PlaygroundPage />);
    hideResponsiveLabels(container);

    const codeButton = screen.getByRole("button", { name: "Code" });
    expect(codeButton).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create Project" })).toBeTruthy();

    fireEvent.click(codeButton);
    hideResponsiveLabels(container);

    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });
});
