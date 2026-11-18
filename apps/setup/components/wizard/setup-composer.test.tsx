// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { StatewireSendError } from "statewire";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckoutContextValue } from "@/components/checkout-provider";
import { initialCheckoutState } from "@/lib/checkout/protocol";
import { SetupComposer } from "./setup-composer";

afterEach(cleanup);

const checkout = (
  send: (params: { text: string }) => Promise<unknown>,
): CheckoutContextValue => ({
  state: { ...initialCheckoutState(), createdAt: 1, status: "planning" },
  session: {
    id: "test",
    products: ["assistant-ui"],
    startedAt: 1,
    link: "testLink1234",
  },
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
    "checkout/message": send,
  } as unknown as CheckoutContextValue["commands"],
});

const sendMessage = async () => {
  fireEvent.change(
    screen.getByRole("textbox", { name: "Message your agent" }),
    {
      target: { value: "hello" },
    },
  );
  await act(async () => {
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
  });
};

describe("SetupComposer", () => {
  it("tells the user to start a new setup when the setup is full", async () => {
    const send = vi.fn(() =>
      Promise.reject(
        new StatewireSendError({
          fate: "rejected",
          cause: "server",
          message: "full",
          payload: { reason: "setup-full" },
        }),
      ),
    );
    render(<SetupComposer checkout={checkout(send)} />);
    await sendMessage();
    expect(send).toHaveBeenCalledWith({ text: "hello" });
    expect(screen.getByRole("alert").textContent).toBe(
      "This setup is full. Start a new one to keep going.",
    );
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
      "hello",
    );
  });

  it("asks to retry on other failures", async () => {
    render(
      <SetupComposer
        checkout={checkout(() => Promise.reject(new Error("offline")))}
      />,
    );
    await sendMessage();
    expect(screen.getByRole("alert").textContent).toBe(
      "Your message could not be sent. Try again.",
    );
  });
});
