// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import type { Checkout } from "@/lib/checkout/protocol";
import { InputCard } from "./input-card";

afterEach(cleanup);

describe("InputCard", () => {
  it("describes project frameworks without changing their answer values", async () => {
    const answer = vi.fn().mockResolvedValue(undefined);
    const checkout = {
      commands: { "checkout/answer": answer },
      degraded: false,
    } as unknown as CheckoutContextValue;
    const frameworks = [
      {
        id: "next",
        label: "Next.js",
        icon: "nextjs",
        description: "Full-stack React with the App Router",
      },
      {
        id: "vite",
        label: "Vite",
        icon: "vite",
        description: "React with a fast dev server",
      },
      {
        id: "react-router",
        label: "React Router",
        icon: "react-router",
        description: "React routing with loaders and actions",
      },
      {
        id: "tanstack-start",
        label: "TanStack Start",
        icon: "tanstack",
        description: "Full-stack React with type-safe routing",
      },
      {
        id: "expo",
        label: "Expo",
        icon: "expo",
        description: "React Native for iOS, Android, and web",
      },
    ];
    const input: Checkout.Input = {
      id: "project",
      kind: "choice",
      preset: "project",
      phase: "planning",
      prompt: "Which project should this go into?",
      default: "new",
      optional: false,
      status: "open",
      createdAt: 1,
      options: [
        {
          id: "new",
          label: "New project",
          variants: [
            ...frameworks.map(({ id, label }) => ({ id, label })),
            { id: "custom", label: "Custom framework" },
          ],
        },
      ],
    };
    render(<InputCard input={input} checkout={checkout} />);

    for (const framework of frameworks) {
      const radio = screen.getByRole<HTMLInputElement>("radio", {
        name: framework.label,
      });
      const descriptionId = radio.getAttribute("aria-describedby");
      expect(document.getElementById(descriptionId!)?.textContent).toBe(
        framework.description,
      );
      expect(
        radio.closest("label")?.querySelector<HTMLElement>("[style]")?.style
          .maskImage,
      ).toContain(`/icons/${framework.icon}.svg`);
      fireEvent.click(radio);
      expect(radio.checked).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      await waitFor(() =>
        expect(answer).toHaveBeenLastCalledWith({
          inputId: "project",
          answer: `new:${framework.id}`,
        }),
      );
      await waitFor(() =>
        expect(radio.disabled || radio.closest("fieldset")?.disabled).toBe(
          false,
        ),
      );
    }

    const custom = screen.getByRole<HTMLInputElement>("radio", {
      name: "Custom framework",
    });
    expect(custom.getAttribute("aria-describedby")).toBeNull();
    fireEvent.click(custom);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(answer).toHaveBeenLastCalledWith({
        inputId: "project",
        answer: "new:custom",
      }),
    );
  });

  it.each([
    ["project", "new", "vite", "Vite", "Framework"],
    ["framework", "langgraph", "python", "Python", "Language"],
  ])(
    "keeps %s variant answers intact",
    async (preset, optionId, variantId, variantLabel, groupLabel) => {
      const answer = vi.fn().mockResolvedValue(undefined);
      const checkout = {
        commands: { "checkout/answer": answer },
        degraded: false,
      } as unknown as CheckoutContextValue;
      const input: Checkout.Input = {
        id: "choice",
        kind: "choice",
        phase: "planning",
        prompt: "Choose your setup",
        optional: false,
        status: "open",
        createdAt: 1,
        preset: preset!,
        default: optionId!,
        options: [
          {
            id: optionId!,
            label: "Recommended",
            variants: [
              { id: "default", label: "Default" },
              { id: variantId!, label: variantLabel! },
            ],
          },
        ],
      };
      render(<InputCard input={input} checkout={checkout} />);
      expect(
        screen.getByRole("radiogroup", { name: groupLabel }),
      ).toBeDefined();
      fireEvent.click(screen.getByRole("radio", { name: variantLabel }));
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      await waitFor(() =>
        expect(answer).toHaveBeenCalledWith({
          inputId: "choice",
          answer: `${optionId}:${variantId}`,
        }),
      );
    },
  );

  it("starts text answers with the agent's default", async () => {
    const answer = vi.fn().mockResolvedValue(undefined);
    const checkout: CheckoutContextValue = {
      state: undefined,
      session: { id: "test", products: ["assistant-ui"], startedAt: 1 },
      url: "https://checkout.test/session",
      agentPresent: true,
      degraded: false,
      openInputs: [],
      plan: undefined,
      planPending: false,
      progress: { done: 0, total: 0 },
      attentionKey: "",
      connection: {} as CheckoutContextValue["connection"],
      commands: {
        "checkout/answer": answer,
      } as unknown as CheckoutContextValue["commands"],
    };
    const input: Checkout.Input = {
      id: "project",
      kind: "text",
      phase: "planning",
      prompt: "Which project?",
      default: "apps/web",
      optional: false,
      status: "open",
      createdAt: 1,
    };

    render(<InputCard input={input} checkout={checkout} />);

    expect(
      screen.getByRole<HTMLInputElement>("textbox", {
        name: "Which project?",
      }).value,
    ).toBe("apps/web");
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() =>
      expect(answer).toHaveBeenCalledWith({
        inputId: "project",
        answer: "apps/web",
      }),
    );
  });
});
