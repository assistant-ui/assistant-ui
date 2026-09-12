// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ addCustomServer: vi.fn() }));
vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => ({ mcp: { addCustomServer: mocks.addCustomServer } }),
}));

import { McpAddFormPrimitiveRoot as Root } from "./McpAddFormRoot";
import { McpAddFormPrimitiveNameField as NameField } from "./McpAddFormNameField";
import { McpAddFormPrimitiveUrlField as UrlField } from "./McpAddFormUrlField";
import { McpAddFormPrimitiveAuthSelect as AuthSelect } from "./McpAddFormAuthSelect";
import { McpAddFormPrimitiveAuthFields as AuthFields } from "./McpAddFormAuthFields";
import { McpAddFormPrimitiveError as ErrorMessage } from "./McpAddFormError";

const Form = ({ name = "Add server" }: { name?: string }) => (
  <Root aria-label={name}>
    <label>
      Name
      <NameField />
    </label>
    <label>
      URL
      <UrlField />
    </label>
    <label>
      Auth
      <AuthSelect />
    </label>
    <AuthFields />
    <ErrorMessage />
  </Root>
);

beforeEach(() => {
  mocks.addCustomServer.mockReset().mockResolvedValue("server");
});
afterEach(cleanup);

describe("MCP add form accessibility", () => {
  it("keeps enclosing labels as the accessible names", () => {
    render(
      <Root>
        <label>
          Server name
          <NameField />
        </label>
        <label>
          Server address
          <UrlField />
        </label>
        <label>
          Authentication method
          <AuthSelect />
        </label>
      </Root>,
    );
    expect(screen.getByRole("textbox", { name: "Server name" })).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Server address" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Authentication method" }),
    ).toBeTruthy();
  });
  it("preserves field labels and only marks the field with an error", () => {
    render(<Form />);
    const name = screen.getByRole("textbox", { name: "Name" });
    const url = screen.getByRole("textbox", { name: "URL" });
    const auth = screen.getByRole("combobox", { name: "Auth" });
    expect(screen.getByRole("textbox", { name: "OAuth scopes" })).toBeTruthy();

    fireEvent.submit(screen.getByRole("form"));
    const error = screen.getByRole("alert");
    expect(error.textContent).toBe("Name is required");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(name.getAttribute("aria-describedby")).toBe(error.id);
    expect(url.hasAttribute("aria-invalid")).toBe(false);

    fireEvent.change(name, { target: { value: "Docs" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(name.hasAttribute("aria-invalid")).toBe(false);
    fireEvent.submit(screen.getByRole("form"));
    expect(url.getAttribute("aria-describedby")).toBe(
      screen.getByRole("alert").id,
    );
    fireEvent.change(url, { target: { value: "https://example.com/mcp" } });
    fireEvent.change(auth, { target: { value: "bearer" } });
    fireEvent.submit(screen.getByRole("form"));
    const token = screen.getByLabelText("Bearer token");
    expect(token.getAttribute("aria-invalid")).toBe("true");
    expect(token.getAttribute("aria-describedby")).toBe(
      screen.getByRole("alert").id,
    );
    fireEvent.change(auth, { target: { value: "none" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByLabelText("Bearer token")).toBeNull();
  });

  it("announces server errors without marking unrelated fields invalid", async () => {
    mocks.addCustomServer.mockRejectedValue(new Error("Connection failed"));
    render(<Form />);
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Docs" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "URL" }), {
      target: { value: "https://example.com/mcp" },
    });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Connection failed"),
    );
    expect(document.querySelector('[aria-invalid="true"]')).toBeNull();
  });

  it("uses distinct IDs for simultaneously mounted forms", () => {
    render(
      <>
        <Form name="First" />
        <Form name="Second" />
      </>,
    );
    const first = screen.getByRole("form", { name: "First" });
    const second = screen.getByRole("form", { name: "Second" });
    fireEvent.submit(first);
    fireEvent.submit(second);
    const firstError = within(first).getByRole("alert");
    const secondError = within(second).getByRole("alert");
    expect(firstError.id).not.toBe(secondError.id);
    expect(
      within(first)
        .getByRole("textbox", { name: "Name" })
        .getAttribute("aria-describedby"),
    ).toBe(firstError.id);
    expect(
      within(second)
        .getByRole("textbox", { name: "Name" })
        .getAttribute("aria-describedby"),
    ).toBe(secondError.id);
  });

  it("preserves caller IDs and ARIA overrides", () => {
    render(
      <Root>
        <NameField
          id="server-name"
          aria-label="Server name"
          aria-describedby="hint"
        />
        <ErrorMessage />
      </Root>,
    );
    const field = screen.getByRole("textbox", { name: "Server name" });
    expect(field.id).toBe("server-name");
    expect(field.getAttribute("aria-describedby")).toBe("hint");
  });
});
