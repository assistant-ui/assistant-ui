import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ addCustomServer: vi.fn() }));
vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => ({ mcp: { addCustomServer: mocks.addCustomServer } }),
}));

vi.mock("@assistant-ui/react-mcp", async (importOriginal) => ({
  ...(await importOriginal()),
  McpAddFormPrimitive:
    await import("../../../../../../react-mcp/src/primitives/addForm"),
  McpManagerPrimitive: {
    Root: ({ children }: ComponentProps<"div">) => <div>{children}</div>,
    Connectors: () => null,
    CustomServers: () => null,
    AddCustomTrigger: (
      await import("../../../../../../react-mcp/src/primitives/manager/McpManagerAddCustomTrigger")
    ).McpManagerPrimitiveAddCustomTrigger,
  },
}));

import { McpConfigDialog as BaseDialog } from "./mcp-config.aui";
import { McpConfigDialog as RadixDialog } from "./mcp-config.aui.radix";

afterEach(cleanup);

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
});
