import type { FC } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuiConfig, AuiProvider } from "@assistant-ui/store";
import {
  McpCustomStorage,
  McpManagerResource,
  type MCPCustomServerRecord,
} from "@assistant-ui/react-mcp";

import { McpConfigDialog as BaseDialog } from "./mcp-config.aui";
import { McpConfigDialog as RadixDialog } from "./mcp-config.aui.radix";

const UNAVAILABLE_URL = "https://unavailable.test/mcp";

let unavailable: PromiseWithResolvers<Response>;

const respond = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (init?.method !== "POST") return new Response(null, { status: 405 });
  if (String(input) === UNAVAILABLE_URL) return unavailable.promise;
  const message = JSON.parse(String(init.body)) as {
    id?: number;
    method: string;
    params?: { protocolVersion?: string };
  };
  if (message.id === undefined) return new Response(null, { status: 202 });
  return Response.json({
    jsonrpc: "2.0",
    id: message.id,
    result:
      message.method === "initialize"
        ? {
            protocolVersion: message.params?.protocolVersion,
            capabilities: { tools: {} },
            serverInfo: { name: "test", version: "1.0.0" },
          }
        : { tools: [] },
  });
};

beforeEach(() => {
  unavailable = Promise.withResolvers();
  vi.stubGlobal("fetch", vi.fn(respond));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const server = (name: string, url = `https://${name}.test/mcp`) =>
  ({
    id: name,
    name,
    url,
    auth: { type: "none" },
    createdAt: 0,
  }) satisfies MCPCustomServerRecord;

const renderDialog = (Dialog: FC, servers: MCPCustomServerRecord[] = []) =>
  render(
    <AuiProvider
      config={AuiConfig({
        mcp: McpManagerResource({
          autoConnect: false,
          storage: McpCustomStorage({
            loadCustomServers: async () => servers,
            saveCustomServers: async () => {},
            loadAuthState: async () => null,
            saveAuthState: async () => {},
            clearAuthState: async () => {},
          }),
        }),
      })}
    >
      <Dialog />
    </AuiProvider>,
  );

describe.each([
  ["Base", BaseDialog],
  ["Radix", RadixDialog],
] as const)("%s MCP config dialog", (_flavor, Dialog) => {
  it("connects visible labels to their controls and reports field errors", async () => {
    renderDialog(Dialog);
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
      renderDialog(Dialog);
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
    renderDialog(Dialog);
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
    expect(await screen.findByText("Docs")).toBeTruthy();
  });

  const openServers = async (servers: MCPCustomServerRecord[]) => {
    renderDialog(Dialog, servers);
    fireEvent.click(screen.getByRole("button", { name: "MCP servers" }));
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(
        servers.length,
      ),
    );
  };

  const press = (button: HTMLElement) => {
    button.focus();
    fireEvent.click(button);
  };

  const expectFocused = (name: string) =>
    waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name })),
    );

  it("moves focus to Disconnect when Connect starts a connection", async () => {
    await openServers([server("docs")]);
    press(screen.getByRole("button", { name: "Connect" }));
    await screen.findByText("Connected");
    await expectFocused("Disconnect");
  });

  it("returns focus to Connect when the connection fails", async () => {
    await openServers([server("unavailable", UNAVAILABLE_URL)]);
    press(screen.getByRole("button", { name: "Connect" }));
    await expectFocused("Disconnect");
    unavailable.resolve(new Response(null, { status: 503 }));
    await screen.findByText("Error");
    await expectFocused("Connect");
  });

  it("returns focus to Connect when the dialog holds focus as the connection fails", async () => {
    await openServers([server("unavailable", UNAVAILABLE_URL)]);
    press(screen.getByRole("button", { name: "Connect" }));
    await expectFocused("Disconnect");
    screen.getByRole("dialog").focus();
    unavailable.resolve(new Response(null, { status: 503 }));
    await expectFocused("Connect");
  });

  it("leaves focus where the user moved it during a connection", async () => {
    await openServers([server("unavailable", UNAVAILABLE_URL)]);
    press(screen.getByRole("button", { name: "Connect" }));
    await expectFocused("Disconnect");
    const addServer = screen.getByRole("button", { name: "Add server" });
    addServer.focus();
    unavailable.resolve(new Response(null, { status: 503 }));
    await screen.findByText("Error");
    expect(document.activeElement).toBe(addServer);
  });

  it("returns focus to Connect after Disconnect", async () => {
    await openServers([server("docs")]);
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    await screen.findByText("Connected");
    press(screen.getByRole("button", { name: "Disconnect" }));
    await expectFocused("Connect");
  });

  it("moves focus to the next server after Remove", async () => {
    await openServers([server("docs"), server("search")]);
    press(screen.getAllByRole("button", { name: "Remove" })[0]!);
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1),
    );
    expect(screen.getByText("search")).toBeTruthy();
    await expectFocused("Connect");
  });

  it("moves focus to Add server after removing the last server", async () => {
    await openServers([server("docs")]);
    press(screen.getByRole("button", { name: "Remove" }));
    await expectFocused("Add server");
  });

  it("moves focus into the open add form after removing the last server", async () => {
    await openServers([server("docs")]);
    fireEvent.click(screen.getByRole("button", { name: "Add server" }));
    press(screen.getByRole("button", { name: "Remove" }));
    await expectFocused("Close form");
  });

  it("announces connection changes and shows errors after the card remounts", async () => {
    await openServers([server("unavailable", UNAVAILABLE_URL)]);

    expect(screen.getByRole("status").textContent).toBe("Disconnected");
    expect(screen.getByRole("alert").textContent).toBe("");

    press(screen.getByRole("button", { name: "Connect" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Connecting…"),
    );

    unavailable.resolve(new Response(null, { status: 503 }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).not.toBe("");
      const status = screen.getByRole("status");
      expect(status.textContent).toBe("Error");
    });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "MCP servers" }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).not.toBe("");
      const status = screen.getByRole("status");
      expect(status.textContent).toBe("Error");
    });
  });
});
