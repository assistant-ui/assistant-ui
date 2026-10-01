// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const register = vi.hoisted(() =>
  vi.fn((_registration: { getModelContext: () => unknown }) => vi.fn()),
);

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAui: () => ({ modelContext: { register } }),
}));

import { MODELS } from "@/lib/model";
import { XULUX_MODEL_ID } from "@/lib/xulux/usage-budget-codes";
import { XuluxModelInfo } from "./XuluxModelInfo";

afterEach(() => {
  cleanup();
});

it("shows the server model as a label and registers it for model context", () => {
  const modelName =
    MODELS.find((model) => model.value === XULUX_MODEL_ID)?.name ??
    XULUX_MODEL_ID;

  render(<XuluxModelInfo />);

  expect(screen.getByText(modelName)).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByRole("menu")).toBeNull();
  expect(register).toHaveBeenCalledOnce();

  const registration = register.mock.calls[0]?.[0];
  expect(registration?.getModelContext()).toEqual({
    config: { modelName: XULUX_MODEL_ID },
  });
});
