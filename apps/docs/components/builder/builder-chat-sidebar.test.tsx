import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuiProvider, useAui, type AssistantClient } from "@assistant-ui/store";
import { describe, expect, it, vi } from "vitest";
import { PlaygroundChatProvider } from "./builder-chat-sidebar";
import { DEFAULT_CONFIG } from "./types";

const mocks = vi.hoisted(() => ({
  runtime: {},
}));

vi.mock("@assistant-ui/react-ai-sdk", async (importOriginal) => ({
  ...(await importOriginal()),
  useChatRuntime: () => mocks.runtime,
}));

describe("PlaygroundChatProvider", () => {
  it("preserves the parent assistant client for builder children", () => {
    let parentClient: AssistantClient | undefined;
    let childClient: AssistantClient | undefined;

    const ParentProvider = ({ children }: { children: ReactNode }) => {
      const aui = useAui({});
      parentClient = aui;
      return <AuiProvider value={aui}>{children}</AuiProvider>;
    };

    const ClientProbe = () => {
      childClient = useAui();
      return null;
    };

    renderToStaticMarkup(
      <ParentProvider>
        <PlaygroundChatProvider config={DEFAULT_CONFIG} setConfig={vi.fn()}>
          <ClientProbe />
        </PlaygroundChatProvider>
      </ParentProvider>,
    );

    expect(childClient).toBe(parentClient);
  });
});
