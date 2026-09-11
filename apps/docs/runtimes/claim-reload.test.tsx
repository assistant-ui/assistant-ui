// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { DocsRuntimeProvider } from "./docs";
import { ArtifactsRuntimeProvider } from "./artifacts";
import { InteractableRuntimeProvider } from "./interactable";

const reload = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const useDocsChatRuntime = vi.hoisted(() =>
  vi.fn(() => ({ threads: { reload } }) as never),
);
const useSpeechAdapters = vi.hoisted(() => vi.fn(() => ({})));
const mocks = vi.hoisted(() => ({ claims: 0 }));
const useDocsCloud = vi.hoisted(() =>
  vi.fn(() => ({ cloud: "cloud", claims: mocks.claims })),
);

vi.mock("./chat-runtime", () => ({
  useDocsChatRuntime,
  useSpeechAdapters,
  useDocsCloud,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  AssistantRuntimeProvider: ({ children }: { children?: unknown }) => children,
  useAui: () => ({}),
  Tools: (v: unknown) => v,
  Suggestions: (v: unknown) => v,
  unstable_Interactables: () => ({}),
  ModelContextClient: () => ({}),
  CloudFileAttachmentAdapter: class CloudFileAttachmentAdapter {},
  SimpleImageAttachmentAdapter: class SimpleImageAttachmentAdapter {},
}));

vi.mock("@assistant-ui/react-devtools", () => ({ DevToolsModal: () => null }));
vi.mock("@/lib/docs-toolkit", () => ({ default: {} }));
vi.mock("./assistant-analytics", () => ({
  AssistantAnalyticsTracker: () => null,
  AssistantPageContext: () => null,
}));

afterEach(() => {
  vi.clearAllMocks();
  mocks.claims = 0;
});

it.each([
  ["docs", DocsRuntimeProvider],
  ["artifacts", ArtifactsRuntimeProvider],
  ["interactable sample", InteractableRuntimeProvider],
])(
  "reloads the %s runtime's thread list only after a claim moved threads",
  (_name, Provider) => {
    const { rerender } = render(<Provider>{null}</Provider>);

    expect(reload).not.toHaveBeenCalled();

    mocks.claims = 1;
    rerender(<Provider>{null}</Provider>);

    expect(reload).toHaveBeenCalledOnce();
  },
);
