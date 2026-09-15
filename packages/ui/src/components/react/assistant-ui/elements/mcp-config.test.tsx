// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({
    mcp: { addCustomServer: async () => "server-1" },
  }),
  useAuiState: () => undefined,
}));

vi.mock("@assistant-ui/react-mcp", async () => {
  const React = await import("react");
  const [
    root,
    nameField,
    urlField,
    authSelect,
    authFields,
    submit,
    cancel,
    error,
  ] = await Promise.all([
    import("../../../../../../react-mcp/src/primitives/addForm/McpAddFormRoot"),
    import("../../../../../../react-mcp/src/primitives/addForm/McpAddFormNameField"),
    import("../../../../../../react-mcp/src/primitives/addForm/McpAddFormUrlField"),
    import("../../../../../../react-mcp/src/primitives/addForm/McpAddFormAuthSelect"),
    import("../../../../../../react-mcp/src/primitives/addForm/McpAddFormAuthFields"),
    import("../../../../../../react-mcp/src/primitives/addForm/McpAddFormSubmit"),
    import("../../../../../../react-mcp/src/primitives/addForm/McpAddFormCancel"),
    import("../../../../../../react-mcp/src/primitives/addForm/McpAddFormError"),
  ]);

  const AddCustomTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<"button"> & { asChild?: boolean }
  >(({ asChild, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(
        children as React.ReactElement<React.ComponentProps<"button">>,
        ref ? { ...props, ref } : props,
      );
    }
    return React.createElement("button", { ...props, ref }, children);
  });

  const Empty = () => null;
  const Root = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);

  return {
    McpAddFormPrimitive: {
      Root: root.McpAddFormPrimitiveRoot,
      NameField: nameField.McpAddFormPrimitiveNameField,
      UrlField: urlField.McpAddFormPrimitiveUrlField,
      AuthSelect: authSelect.McpAddFormPrimitiveAuthSelect,
      AuthFields: authFields.McpAddFormPrimitiveAuthFields,
      Submit: submit.McpAddFormPrimitiveSubmit,
      Cancel: cancel.McpAddFormPrimitiveCancel,
      Error: error.McpAddFormPrimitiveError,
    },
    McpManagerPrimitive: {
      Root,
      Connectors: Empty,
      CustomServers: Empty,
      AddCustomTrigger,
    },
  };
});

vi.mock("@/components/ui/dialog", async () => {
  const React = await import("react");
  const Part = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children);
  return {
    Dialog: Part,
    DialogTrigger: ({
      children,
      render,
    }: {
      children?: React.ReactNode;
      render?: React.ReactElement;
    }) => render ?? React.createElement(React.Fragment, null, children),
    DialogContent: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { role: "dialog" }, children),
    DialogDescription: Part,
    DialogHeader: Part,
    DialogTitle: Part,
  };
});

vi.mock("@/components/ui/radix/dialog", async () => {
  const React = await import("react");
  const Part = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children);
  return {
    Dialog: Part,
    DialogTrigger: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    DialogContent: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { role: "dialog" }, children),
    DialogDescription: Part,
    DialogHeader: Part,
    DialogTitle: Part,
  };
});

import { McpConfigDialog as BaseMcpConfigDialog } from "./mcp-config.aui";
import { McpConfigDialog as RadixMcpConfigDialog } from "./mcp-config.aui.radix";

const variants = [
  ["Base UI", BaseMcpConfigDialog],
  ["Radix", RadixMcpConfigDialog],
] as const;

afterEach(() => cleanup());

async function openForm(
  Component: React.ComponentType<{ children?: React.ReactNode }>,
) {
  render(<Component />);
  const trigger = screen.getByRole("button", { name: "Add server" });
  trigger.focus();
  fireEvent.click(trigger);
  const name = await screen.findByPlaceholderText("My MCP server");
  await waitFor(() => expect(document.activeElement).toBe(name));
  return { trigger, name };
}

describe("McpConfigDialog custom server form focus", () => {
  it.each(variants)(
    "focuses Name when %s opens the form",
    async (_, Component) => {
      await openForm(Component);
    },
  );

  it.each(variants)(
    "restores Add server focus after %s cancellation",
    async (_, Component) => {
      await openForm(Component);

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Add server" }),
      );
    },
  );

  it.each(variants)(
    "restores Add server focus after the %s close icon",
    async (_, Component) => {
      await openForm(Component);

      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Add server" }),
      );
    },
  );

  it.each(variants)(
    "restores Add server focus after %s submission",
    async (_, Component) => {
      const { name } = await openForm(Component);
      const form = within(document.querySelector("form")!);

      fireEvent.change(name, { target: { value: "Docs" } });
      fireEvent.change(screen.getByPlaceholderText("https://example.com/mcp"), {
        target: { value: "https://example.com/mcp" },
      });
      fireEvent.click(form.getByRole("button", { name: "Add server" }));

      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole("button", { name: "Add server" }),
        ),
      );
    },
  );
});
