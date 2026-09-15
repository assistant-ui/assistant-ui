import type { ComponentProps, ReactNode } from "react";
import type { AssistantState } from "@assistant-ui/store";
import type { MCPConnectionState } from "@assistant-ui/react-mcp";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addCustomServer: vi.fn(),
  server: {
    id: "docs",
    kind: "connector" as const,
    name: "Docs",
    icon: null,
    connectionState: "disconnected" as MCPConnectionState,
    lastError: null as { message: string } | null,
    authorizationUrl: null,
  },
}));
vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => ({ mcp: { addCustomServer: mocks.addCustomServer } }),
  useAuiState: function useAuiState<T>(selector: (state: AssistantState) => T) {
    return selector({ mcpServer: mocks.server } as unknown as AssistantState);
  },
}));

vi.mock("@assistant-ui/react-mcp", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@assistant-ui/react-mcp")>();
  return {
    ...original,
    McpManagerPrimitive: {
      ...original.McpManagerPrimitive,
      Root: ({ children }: ComponentProps<"div">) => <div>{children}</div>,
      Connectors: ({
        children,
      }: {
        children: (value: { server: unknown }) => ReactNode;
      }) => children({ server: mocks.server }),
      CustomServers: () => null,
    },
  };
});

import { McpConfigDialog as BaseDialog } from "./mcp-config.aui";
import { McpConfigDialog as RadixDialog } from "./mcp-config.aui.radix";

afterEach(() => {
  cleanup();
  mocks.server.connectionState = "disconnected";
  mocks.server.lastError = null;
});

describe.each([
  ["Base", BaseDialog],
  ["Radix", RadixDialog],
] as const)("%s MCP add form", (_flavor, Dialog) => {
  it("connects visible labels to their controls and reports field errors", async () => {
    render(<Dialog />);
    fireEvent.click(screen.getByRole("button", { name: "MCP servers" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add server" }));

    for (const label of ["Name", "URL", "Auth"]) {
      const field = screen.getByLabelText(label) as HTMLInputElement;
      expect(field.labels?.[0]?.htmlFor).toBe(field.id);
      expect(field.id).not.toBe("");
    }

    fireEvent.click(screen.getByRole("button", { name: "Add server" }));
    expect(screen.getByLabelText("Name").getAttribute("aria-describedby")).toBe(
      screen.getByRole("alert").id,
    );
  });

  it("announces connection changes and failures without announcing the initial state", async () => {
    const view = render(<Dialog />);
    fireEvent.click(screen.getByRole("button", { name: "MCP servers" }));
    const dialog = await screen.findByRole("dialog");
    const status = dialog.querySelector('[data-slot="badge"]')!;

    expect(status.getAttribute("role")).toBeNull();

    for (const [connectionState, label] of [
      ["connecting", "Connecting…"],
      ["connected", "Connected"],
      ["authRequired", "Auth required"],
    ] as const) {
      mocks.server.connectionState = connectionState;
      view.rerender(<Dialog />);
      expect(screen.getByText(label)).toBe(status);
      expect(status.getAttribute("role")).toBe("status");
    }

    mocks.server.connectionState = "error";
    mocks.server.lastError = { message: "Connection failed" };
    view.rerender(<Dialog />);
    expect(screen.getByRole("alert").textContent).toContain(
      "Connection failed",
    );
  });

  it.each([
    ["oauth", "OAuth scopes", "oauth-scopes"],
    ["bearer", "Bearer token", "bearer-token"],
  ])(
    "exposes label styling hooks for %s credentials",
    async (authType, text, hook) => {
      render(<Dialog />);
      fireEvent.click(screen.getByRole("button", { name: "MCP servers" }));
      fireEvent.click(
        await screen.findByRole("button", { name: "Add server" }),
      );
      fireEvent.change(screen.getByRole("combobox", { name: "Auth" }), {
        target: { value: authType },
      });
      const input = screen.getByLabelText(text) as HTMLInputElement;
      const label = input.labels?.[0];
      expect(label?.getAttribute("data-mcp-auth-field-label")).toBe(hook);
      expect(input.placeholder).not.toBe(text);
    },
  );

  const openAddForm = async () => {
    render(<Dialog />);
    fireEvent.click(screen.getByRole("button", { name: "MCP servers" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add server" }));
    return screen.getByLabelText("Name").closest("form")!;
  };

  const expectAddServerFocused = () =>
    waitFor(() => {
      expect(screen.queryByLabelText("Name")).toBeNull();
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Add server" }),
      );
    });

  it("keeps Close unique to the dialog while the add form is open", async () => {
    await openAddForm();
    expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(1);
  });

  it("moves focus to Name when the add form opens", async () => {
    await openAddForm();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText("Name")),
    );
  });

  it.each(["Cancel", "Close form"])(
    "returns focus to Add server after %s",
    async (name) => {
      const form = await openAddForm();
      fireEvent.click(within(form).getByRole("button", { name }));
      await expectAddServerFocused();
    },
  );

  it("returns focus to Add server after a successful submit", async () => {
    await openAddForm();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Docs" },
    });
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com/mcp" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add server" }));
    await expectAddServerFocused();
    expect(mocks.addCustomServer).toHaveBeenCalledOnce();
  });
});
