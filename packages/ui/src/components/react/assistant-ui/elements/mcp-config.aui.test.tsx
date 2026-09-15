import type { ComponentProps } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type TestServer = {
  id: string;
  name: string;
  kind: "custom";
  connectionState:
    | "disconnected"
    | "authRequired"
    | "authPending"
    | "connecting"
    | "connected"
    | "error";
  icon: null;
  lastError: null;
  authorizationUrl: null;
};

type UpdateServers = (
  updater: (previous: TestServer[]) => TestServer[],
) => void;

const serverMocks = vi.hoisted(() => ({
  addCustomServer: vi.fn(),
  fixtures: [] as TestServer[],
  update: null as UpdateServers | null,
  active: null as TestServer | null,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => ({ mcp: { addCustomServer: serverMocks.addCustomServer } }),
  useAuiState: (selector: (state: { mcpServer: TestServer }) => unknown) =>
    selector({
      mcpServer:
        serverMocks.active ??
        ({
          id: "fallback",
          name: "Fallback",
          kind: "custom",
          connectionState: "disconnected",
          icon: null,
          lastError: null,
          authorizationUrl: null,
        } satisfies TestServer),
    }),
}));

vi.mock("@assistant-ui/react-mcp", async (importOriginal) => {
  const React = await import("react");
  const original =
    await importOriginal<typeof import("@assistant-ui/react-mcp")>();

  const ServerContext = React.createContext<TestServer | null>(null);
  const useServer = () => {
    const server = React.useContext(ServerContext);
    if (!server) throw new Error("missing test server context");
    return server;
  };
  const updateServer = (
    id: string,
    connectionState: TestServer["connectionState"],
  ) => {
    serverMocks.update?.((previous) =>
      previous.map((server) =>
        server.id === id ? { ...server, connectionState } : server,
      ),
    );
  };

  const Root = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<"div">
  >((props, ref) => {
    serverMocks.active = useServer();
    return React.createElement("div", { ...props, ref });
  });
  const Name = () =>
    React.createElement(React.Fragment, null, useServer().name);
  const OAuthLink = () => null;
  type TestButtonProps = React.ComponentPropsWithoutRef<"button"> & {
    asChild?: boolean;
  };
  const ConnectButton = React.forwardRef<HTMLButtonElement, TestButtonProps>(
    (props, ref) => {
      const server = useServer();
      if (
        !new Set(["disconnected", "error", "authRequired"]).has(
          server.connectionState,
        )
      ) {
        return null;
      }
      if (props.asChild) {
        const child = props.children as React.ReactElement<{
          onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
        }>;
        return React.cloneElement(child, {
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
            child.props.onClick?.(event);
            updateServer(server.id, "connecting");
          },
        });
      }
      return React.createElement(
        "button",
        {
          ...props,
          ref,
          type: "button",
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
            props.onClick?.(event);
            updateServer(server.id, "connecting");
          },
        },
        props.children,
      );
    },
  );
  const DisconnectButton = React.forwardRef<HTMLButtonElement, TestButtonProps>(
    (props, ref) => {
      const server = useServer();
      if (
        !new Set(["connected", "connecting", "authPending"]).has(
          server.connectionState,
        )
      ) {
        return null;
      }
      if (props.asChild) {
        const child = props.children as React.ReactElement<{
          onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
        }>;
        return React.cloneElement(child, {
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
            child.props.onClick?.(event);
            updateServer(server.id, "disconnected");
          },
        });
      }
      return React.createElement(
        "button",
        {
          ...props,
          ref,
          type: "button",
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
            props.onClick?.(event);
            updateServer(server.id, "disconnected");
          },
        },
        props.children,
      );
    },
  );
  const RemoveButton = React.forwardRef<HTMLButtonElement, TestButtonProps>(
    (props, ref) => {
      const server = useServer();
      if (props.asChild) {
        const child = props.children as React.ReactElement<{
          onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
        }>;
        return React.cloneElement(child, {
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
            child.props.onClick?.(event);
            serverMocks.update?.((previous) =>
              previous.filter((candidate) => candidate.id !== server.id),
            );
          },
        });
      }
      return React.createElement(
        "button",
        {
          ...props,
          ref,
          type: "button",
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
            props.onClick?.(event);
            serverMocks.update?.((previous) =>
              previous.filter((candidate) => candidate.id !== server.id),
            );
          },
        },
        props.children,
      );
    },
  );
  const CustomServers = ({
    children,
  }: {
    children: (value: { server: TestServer }) => React.ReactNode;
  }) => {
    const [servers, setServers] = React.useState(serverMocks.fixtures);
    serverMocks.update = setServers;
    return React.createElement(
      React.Fragment,
      null,
      servers.map((server) =>
        React.createElement(
          ServerContext.Provider,
          { key: server.id, value: server },
          children({ server }),
        ),
      ),
    );
  };

  return {
    ...original,
    McpManagerPrimitive: {
      ...original.McpManagerPrimitive,
      Root: ({ children }: ComponentProps<"div">) => <div>{children}</div>,
      Connectors: () => null,
      CustomServers,
    },
    McpServerPrimitive: {
      ...original.McpServerPrimitive,
      Root,
      Name,
      OAuthLink,
      ConnectButton,
      DisconnectButton,
      RemoveButton,
    },
  };
});

import { McpConfigDialog as BaseDialog } from "./mcp-config.aui";
import { McpConfigDialog as RadixDialog } from "./mcp-config.aui.radix";

afterEach(() => {
  cleanup();
  serverMocks.fixtures = [];
  serverMocks.update = null;
  serverMocks.active = null;
});

const createServer = (
  id: string,
  name: string,
  connectionState: TestServer["connectionState"],
): TestServer => ({
  id,
  name,
  kind: "custom",
  connectionState,
  icon: null,
  lastError: null,
  authorizationUrl: null,
});

describe.each([
  ["Base", BaseDialog],
  ["Radix", RadixDialog],
] as const)("%s MCP config dialog", (_flavor, Dialog) => {
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

  it("moves focus to Name when the add form opens", async () => {
    await openAddForm();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText("Name")),
    );
  });

  it.each(["Cancel", "Close"])(
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
    expect(serverMocks.addCustomServer).toHaveBeenCalledOnce();
  });

  const openServerDialog = async (servers: TestServer[]) => {
    serverMocks.fixtures = servers;
    render(<Dialog />);
    fireEvent.click(screen.getByRole("button", { name: "MCP servers" }));
    await screen.findByRole("dialog");
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(
        servers.length,
      ),
    );
  };

  it("keeps focus on the replacement after Connect", async () => {
    await openServerDialog([createServer("one", "One", "disconnected")]);
    const connect = screen.getByRole("button", { name: "Connect" });
    connect.focus();
    fireEvent.click(connect);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Disconnect" }),
      ),
    );
  });

  it("keeps focus on the replacement after Disconnect", async () => {
    await openServerDialog([createServer("one", "One", "connected")]);
    const disconnect = screen.getByRole("button", { name: "Disconnect" });
    disconnect.focus();
    fireEvent.click(disconnect);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Connect" }),
      ),
    );
  });

  it("moves focus to the next server after Remove", async () => {
    await openServerDialog([
      createServer("one", "One", "disconnected"),
      createServer("two", "Two", "disconnected"),
    ]);
    const cards = () => [
      ...document.querySelectorAll<HTMLElement>(".aui-mcp-server-card"),
    ];
    const nextConnect = within(cards()[1]!).getByRole("button", {
      name: "Connect",
    });
    const remove = within(cards()[0]!).getByRole("button", {
      name: "Remove",
    });
    remove.focus();
    fireEvent.click(remove);
    await waitFor(() => {
      expect(cards()).toHaveLength(1);
      expect(document.activeElement).toBe(nextConnect);
    });
  });

  it("moves focus to Add server after removing the last server", async () => {
    await openServerDialog([createServer("one", "One", "disconnected")]);
    const addServer = screen.getByRole("button", { name: "Add server" });
    const remove = screen.getByRole("button", { name: "Remove" });
    remove.focus();
    fireEvent.click(remove);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
      expect(document.activeElement).toBe(addServer);
    });
  });
});
