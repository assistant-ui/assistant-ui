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
import { WizardHost } from "./test/wizard-host";

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

const toKeyStep = () =>
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

describe("ModelInputCard", () => {
  it("offers OpenAI, Anthropic and Other before asking for anything else", async () => {
    render(
      <WizardHost>
        <ModelInputCard
          input={{
            ...input,
            options: [
              { id: "openai", label: "OpenAI" },
              { id: "anthropic", label: "Anthropic" },
              { id: "google", label: "Google" },
              { id: "groq", label: "Groq" },
            ],
          }}
          checkout={checkout()}
        />
      </WizardHost>,
    );
    expect(
      screen
        .getAllByRole("radio")
        .map((radio) => radio.parentElement!.textContent),
    ).toEqual(["OpenAI", "Anthropic", "Other"]);
    expect(screen.queryByLabelText("API key")).toBeNull();
    expect(screen.queryByLabelText("Model")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Other" }));
    expect(
      screen.getByRole("combobox", { name: "Other provider" }).textContent,
    ).toContain("Google");
  });

  it("suggests the first model the key can use when the default is not on it", async () => {
    testProviderKey.mockResolvedValueOnce({
      status: "ok",
      models: ["gpt-7-nano", "gpt-7"],
    });
    render(
      <WizardHost>
        <ModelInputCard input={input} checkout={checkout()} />
      </WizardHost>,
    );
    toKeyStep();
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "openai-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test key" }));
    expect(await screen.findByLabelText("Model")).toHaveProperty(
      "placeholder",
      "gpt-7-nano",
    );
  });

  it("moves to the model once the key tests fine and answers with the secret", async () => {
    testProviderKey.mockResolvedValueOnce({ status: "ok", models: ["gpt-5"] });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const context = checkout();
    render(
      <WizardHost>
        <ModelInputCard input={input} checkout={context} />
      </WizardHost>,
    );
    toKeyStep();
    expect(screen.getByText(/Never sent in plaintext/)).toBeDefined();
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "openai-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test key" }));
    fireEvent.change(await screen.findByLabelText("Model"), {
      target: { value: "gpt-5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(context.commands["checkout/answer"]).toHaveBeenCalledWith({
        inputId: "model",
        answer: JSON.stringify({ provider: "openai", model: "gpt-5" }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://checkout.example.test/session/secret/model",
      { method: "PUT", body: "openai-key" },
    );
    vi.unstubAllGlobals();
  });

  it("lets a failed test be overridden", async () => {
    testProviderKey.mockResolvedValueOnce({ status: "unauthorized" });
    render(
      <WizardHost>
        <ModelInputCard input={input} checkout={checkout()} />
      </WizardHost>,
    );
    toKeyStep();
    expect(
      screen.queryByRole("button", { name: "Continue anyway" }),
    ).toBeNull();
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "bad-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test key" }));
    await screen.findByText("The provider rejected this key.");
    expect(screen.queryByLabelText("Model")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continue anyway" }));
    expect(screen.getByLabelText("Model")).toBeDefined();
  });

  it("answers without depositing a secret when the key is skipped", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const context = checkout();
    render(
      <WizardHost>
        <ModelInputCard input={input} checkout={context} />
      </WizardHost>,
    );
    toKeyStep();
    fireEvent.click(
      screen.getByRole("button", { name: "Skip, I’ll add it myself" }),
    );
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "gpt-5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(context.commands["checkout/answer"]).toHaveBeenCalled(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("does not show a completed key test after its key changes", async () => {
    let resolve!: (result: KeyTest) => void;
    const pending = new Promise<KeyTest>((done) => {
      resolve = done;
    });
    testProviderKey.mockReturnValueOnce(pending);
    render(
      <WizardHost>
        <ModelInputCard input={input} checkout={checkout()} />
      </WizardHost>,
    );
    toKeyStep();
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "openai-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test key" }));
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "new-openai-key" },
    });
    resolve({ status: "ok", models: ["gpt-5"] });
    await act(async () => {
      await pending;
    });
    expect(screen.queryByText("The key works.")).toBeNull();
    expect(screen.queryByLabelText("Model")).toBeNull();
  });

  it("clears the key and its test when the provider changes", async () => {
    testProviderKey.mockResolvedValueOnce({ status: "unauthorized" });
    render(
      <WizardHost>
        <ModelInputCard input={input} checkout={checkout()} />
      </WizardHost>,
    );
    toKeyStep();
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "openai-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test key" }));
    await screen.findByText("The provider rejected this key.");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("radio", { name: "Other" }));
    toKeyStep();
    expect(screen.getByLabelText<HTMLInputElement>("API key").value).toBe("");
    expect(screen.queryByText("The provider rejected this key.")).toBeNull();
  });
});
