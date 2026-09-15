// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addCustomServer: vi.fn(),
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => ({
    mcp: { addCustomServer: mocks.addCustomServer },
  }),
}));

import { McpAddFormPrimitiveAuthFields } from "./McpAddFormAuthFields";
import { McpAddFormPrimitiveAuthSelect } from "./McpAddFormAuthSelect";
import { McpAddFormPrimitiveError } from "./McpAddFormError";
import { McpAddFormPrimitiveNameField } from "./McpAddFormNameField";
import { McpAddFormPrimitiveRoot } from "./McpAddFormRoot";
import { McpAddFormPrimitiveSubmit } from "./McpAddFormSubmit";
import { McpAddFormPrimitiveUrlField } from "./McpAddFormUrlField";

describe("McpAddFormPrimitiveRoot", () => {
  beforeEach(() => {
    mocks.addCustomServer.mockReset();
    mocks.addCustomServer.mockResolvedValue("server-1");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each(["throws", "rejects"] as const)(
    "does not turn a successful add into an error when onSubmitted %s",
    async (mode) => {
      const callbackError = new Error("navigation failed");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      render(
        <McpAddFormPrimitiveRoot
          onSubmitted={() => {
            if (mode === "throws") throw callbackError;
            return Promise.reject(callbackError);
          }}
        >
          <McpAddFormPrimitiveNameField aria-label="Name" />
          <McpAddFormPrimitiveUrlField aria-label="URL" />
          <McpAddFormPrimitiveError />
          <McpAddFormPrimitiveSubmit>Submit</McpAddFormPrimitiveSubmit>
        </McpAddFormPrimitiveRoot>,
      );

      fireEvent.change(screen.getByLabelText("Name"), {
        target: { value: "Docs" },
      });
      fireEvent.change(screen.getByLabelText("URL"), {
        target: { value: "https://example.com/mcp" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => expect(mocks.addCustomServer).toHaveBeenCalledOnce());
      expect(screen.queryByText(callbackError.message)).toBeNull();
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "[react-mcp] onSubmitted callback threw an error",
          callbackError,
        );
      });
    },
  );

  it("submits a custom bearer field through the form state", async () => {
    render(
      <McpAddFormPrimitiveRoot>
        <McpAddFormPrimitiveNameField aria-label="Name" />
        <McpAddFormPrimitiveUrlField aria-label="URL" />
        <McpAddFormPrimitiveAuthSelect aria-label="Auth" />
        <McpAddFormPrimitiveAuthFields>
          {({ authType, bearerToken }) =>
            authType === "bearer" ? (
              <input {...bearerToken} aria-label="Custom token" />
            ) : null
          }
        </McpAddFormPrimitiveAuthFields>
        <McpAddFormPrimitiveError />
        <McpAddFormPrimitiveSubmit>Submit</McpAddFormPrimitiveSubmit>
      </McpAddFormPrimitiveRoot>,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Docs" },
    });
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com/mcp" },
    });
    fireEvent.change(screen.getByLabelText("Auth"), {
      target: { value: "bearer" },
    });
    fireEvent.change(screen.getByLabelText("Custom token"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(mocks.addCustomServer).toHaveBeenCalledOnce());
    expect(mocks.addCustomServer).toHaveBeenCalledWith({
      name: "Docs",
      url: "https://example.com/mcp",
      auth: { type: "bearer", token: "secret" },
    });
  });

  it("submits custom OAuth scopes and exposes bearer validation metadata", async () => {
    render(
      <McpAddFormPrimitiveRoot>
        <McpAddFormPrimitiveNameField aria-label="Name" />
        <McpAddFormPrimitiveUrlField aria-label="URL" />
        <McpAddFormPrimitiveAuthSelect aria-label="Auth" />
        <McpAddFormPrimitiveAuthFields>
          {({ authType, bearerToken, scopes }) =>
            authType === "bearer" ? (
              <input {...bearerToken} aria-label="Custom token" />
            ) : authType === "oauth" ? (
              <input {...scopes} aria-label="Custom scopes" />
            ) : null
          }
        </McpAddFormPrimitiveAuthFields>
        <McpAddFormPrimitiveError />
        <McpAddFormPrimitiveSubmit>Submit</McpAddFormPrimitiveSubmit>
      </McpAddFormPrimitiveRoot>,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Docs" },
    });
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com/mcp" },
    });
    fireEvent.change(screen.getByLabelText("Custom scopes"), {
      target: { value: "read, write" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(mocks.addCustomServer).toHaveBeenCalledOnce());
    expect(mocks.addCustomServer).toHaveBeenCalledWith({
      name: "Docs",
      url: "https://example.com/mcp",
      auth: { type: "oauth", scopes: ["read", "write"] },
    });

    fireEvent.change(screen.getByLabelText("Auth"), {
      target: { value: "bearer" },
    });
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Docs" },
    });
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com/mcp" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    const token = screen.getByLabelText("Custom token");
    const error = screen.getByRole("alert");
    expect(token.getAttribute("aria-invalid")).toBe("true");
    expect(token.getAttribute("aria-describedby")).toBe(error.id);
  });
});
