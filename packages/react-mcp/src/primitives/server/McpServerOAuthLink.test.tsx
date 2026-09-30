import type { AssistantState } from "@assistant-ui/store";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizationUrl: null as string | null,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAuiState: function useAuiState<T>(selector: (state: AssistantState) => T) {
    return selector({
      mcpServer: { authorizationUrl: mocks.authorizationUrl },
    } as AssistantState);
  },
}));

const { McpServerPrimitiveOAuthLink } = await import("./McpServerOAuthLink");

const renderLink = (props: Record<string, unknown> = {}) =>
  (
    McpServerPrimitiveOAuthLink as unknown as {
      render: (
        props: Record<string, unknown>,
        ref: null,
      ) => { props: { href: string } } | null;
    }
  ).render(props, null);

describe("McpServerPrimitiveOAuthLink", () => {
  it.each([
    "javascript:alert(document.domain)",
    "data:text/html,<script>alert(document.domain)</script>",
    "vbscript:msgbox(document.domain)",
  ])("does not render executable authorization URLs", (authorizationUrl) => {
    mocks.authorizationUrl = authorizationUrl;

    expect(renderLink()).toBeNull();
  });

  it.each([
    "https://auth.example.com/authorize",
    "http://localhost:3000/authorize",
    "/oauth/authorize",
  ])("renders safe authorization URLs", (authorizationUrl) => {
    mocks.authorizationUrl = authorizationUrl;

    expect(renderLink()?.props.href).toBe(authorizationUrl);
  });

  it("validates an href override before rendering it", () => {
    mocks.authorizationUrl = "https://auth.example.com/authorize";

    expect(
      renderLink({ href: "javascript:alert(document.domain)" }),
    ).toBeNull();
  });
});
