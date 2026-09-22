// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { initialCheckoutState, type Checkout } from "@/lib/checkout/protocol";
import type { KeyTest } from "@/lib/checkout/providers";

const { testProviderKey } = vi.hoisted(() => ({
  testProviderKey: vi.fn(),
}));

vi.mock("@/lib/checkout/providers", async (importOriginal) => ({
  ...(await importOriginal()),
  testProviderKey,
}));

import { ModelInputCard } from "./model-input-card";

afterEach(() => {
  cleanup();
  testProviderKey.mockReset();
});

const input: Checkout.Input = {
  id: "model",
  kind: "model",
  phase: "planning",
  prompt: "Which model should the assistant use?",
  options: [
    { id: "openai", label: "OpenAI" },
    { id: "google", label: "Google" },
  ],
  default: "openai",
  optional: false,
  status: "open",
  createdAt: 1,
};

const checkout = (): CheckoutContextValue => ({
  state: initialCheckoutState(),
  session: { id: "test", products: ["assistant-ui"], startedAt: 1 },
  url: "https://checkout.example.test/session",
  degraded: false,
  agentPresent: false,
  openInputs: [],
  plan: undefined,
  planPending: false,
  progress: { done: 0, total: 0 },
  attentionKey: "",
  connection: {} as CheckoutContextValue["connection"],
  commands: {
    "checkout/answer": vi.fn().mockResolvedValue(undefined),
    "checkout/dismiss": vi.fn().mockResolvedValue(undefined),
  } as unknown as CheckoutContextValue["commands"],
});

const selectProvider = async (name: string) => {
  fireEvent.click(screen.getAllByRole("combobox")[0]!);
  const option = await screen.findByRole("option", { name });
  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
};

describe("ModelInputCard", () => {
  it("does not show a completed key test after its key changes", async () => {
    let resolve!: (result: KeyTest) => void;
    const pending = new Promise<KeyTest>((done) => {
      resolve = done;
    });
    testProviderKey.mockReturnValueOnce(pending);
    render(<ModelInputCard input={input} checkout={checkout()} />);

    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "openai-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "new-openai-key" },
    });
    resolve({ status: "ok", models: ["gpt-5"] });
    await act(async () => {
      await pending;
    });

    expect(screen.queryByText("The key works.")).toBeNull();
  });

  it("does not show a completed key test after its provider changes", async () => {
    let resolve!: (result: KeyTest) => void;
    const pending = new Promise<KeyTest>((done) => {
      resolve = done;
    });
    testProviderKey.mockReturnValueOnce(pending);
    render(<ModelInputCard input={input} checkout={checkout()} />);

    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "openai-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
    expect(testProviderKey).toHaveBeenCalledWith(
      expect.objectContaining({ id: "openai" }),
      "openai-key",
    );

    await selectProvider("Google");
    resolve({ status: "ok", models: ["gpt-5"] });
    await act(async () => {
      await pending;
    });

    expect(screen.queryByText("The key works.")).toBeNull();
    expect(screen.getByLabelText<HTMLInputElement>("API key").value).toBe("");
  });

  it("clears the provider-specific draft and test result when switching", async () => {
    testProviderKey.mockResolvedValueOnce({
      status: "ok",
      models: ["gpt-5"],
    });
    render(<ModelInputCard input={input} checkout={checkout()} />);

    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "openai-key" },
    });
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "gpt-5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
    await screen.findByText("The key works.");

    await selectProvider("Google");

    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>("API key").value).toBe(""),
    );
    expect(screen.getByLabelText<HTMLInputElement>("Model").value).toBe("");
    expect(screen.queryByText("The key works.")).toBeNull();
  });
});
