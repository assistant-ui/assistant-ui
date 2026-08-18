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
});
