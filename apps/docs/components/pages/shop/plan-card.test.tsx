// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { WizardHost } from "./test/wizard-host";
import { PlanCard, PlanCards, PlanMarkdown } from "./plan-card";

const PLAN = `## What I found

- **App framework:** Next.js 15
- **Package manager:** pnpm
- **Agent framework:** Vercel AI SDK
- **Model provider:** OpenAI
- **Model:** gpt-4o
- **Components:** src/components

## What I will install

- **The chat:** @assistant-ui/react
- \`app/api/chat/route.ts\` on the AI SDK

## Steps

1. Install the packages.
   Peer packages come along.
2. Add the chat route.

## Open questions

- Keep the thread list?`;

const headings = () =>
  screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

describe("PlanMarkdown", () => {
  it("renders image alt text without an image element", () => {
    const { container } = render(
      <PlanMarkdown markdown="![tracker](https://attacker.example/t.png)" />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("tracker")).toBeDefined();
  });
});

describe("PlanMarkdown links", () => {
  it("names the host of an https link and drops any other target", () => {
    const { container } = render(
      <PlanMarkdown markdown="[docs](https://evil.example/x) and [local](http://x.test) and [script](javascript:alert(1))" />,
    );

    const links = [...container.querySelectorAll("a")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://evil.example/x",
    ]);
    expect(container.textContent).toContain("docs (evil.example)");
    expect(container.textContent).toContain("local");
    expect(container.textContent).toContain("script");
  });
});

describe("PlanCards", () => {
  it("shows each section as a card with its highlights", () => {
    const { container } = render(<PlanCards markdown={PLAN} />);

    expect(headings()).toEqual([
      "What I found",
      "What I will install",
      "Steps",
      "Open questions",
    ]);
    expect(screen.getByText("App").parentElement?.textContent).toBe(
      "AppNext.js 15pnpm",
    );
    expect(screen.getByText("Agent").parentElement?.textContent).toBe(
      "AgentVercel AI SDK",
    );
    expect(screen.getByText("Model").parentElement?.textContent).toBe(
      "ModelOpenAIgpt-4o",
    );
    expect(screen.queryByText("Components")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Project details · 1 more" }),
    ).toBeDefined();
    expect(screen.getByText("The chat").parentElement?.textContent).toBe(
      "The chat@assistant-ui/react",
    );
    expect(screen.getByText("app/api/chat/route.ts")).toBeDefined();
    expect(screen.getByText("2 steps, start to finish")).toBeDefined();
    expect(
      [...container.querySelectorAll("ul ol li")].map((n) => n.textContent),
    ).toEqual(["1Install the packages.", "2Add the chat route."]);
    expect(container.textContent).not.toContain("Peer packages come along.");
    expect(screen.getByText("Keep the thread list?")).toBeDefined();
  });

  it("caps a card at three rows and counts the rest on its details link", () => {
    const { container } = render(
      <PlanCards
        markdown={"## Steps\n\n1. One\n2. Two\n3. Three\n4. Four\n5. Five"}
      />,
    );
    expect(
      [...container.querySelectorAll("ul ol li")].map((n) => n.textContent),
    ).toEqual(["1One", "2Two", "3Three"]);
    expect(
      screen.getByRole("button", { name: "Implementation details · 2 more" }),
    ).toBeDefined();
  });

  it("expands a section's full markdown behind its details link", () => {
    const { container } = render(<PlanCards markdown={PLAN} />);

    const details = screen.getByRole("button", {
      name: "Implementation details",
    });
    expect(details.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(details);
    expect(details.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("Peer packages come along.");
    fireEvent.click(details);
    expect(container.textContent).not.toContain("Peer packages come along.");
  });

  it("lists the declared steps over the plan's own", () => {
    render(
      <PlanCards
        markdown={PLAN}
        steps={[
          { id: "s1", title: "Do it all", status: "pending", createdAt: 1 },
        ]}
      />,
    );
    expect(screen.getByText("1 step, start to finish")).toBeDefined();
    expect(screen.getByText("Do it all")).toBeDefined();
    expect(screen.queryByText("Add the chat route.")).toBeNull();
  });

  it("keeps a plan without the expected headings as one card", () => {
    render(<PlanCards markdown={"## Plan\n\n1. Install.\n\nThat is all."} />);
    expect(headings()).toEqual(["The plan"]);
    expect(screen.getByText("Install.")).toBeDefined();
    expect(screen.getByText("That is all.")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("PlanCard", () => {
  it("installs from the footer, or sends a note as a change request", async () => {
    const plan = vi.fn(async () => {});
    const checkout = {
      commands: { "checkout/plan": plan },
    } as unknown as CheckoutContextValue;
    render(
      <WizardHost>
        <PlanCard
          closed={false}
          checkout={checkout}
          plans={[
            { revision: 1, markdown: PLAN, status: "proposed", submittedAt: 1 },
          ]}
        />
      </WizardHost>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    await waitFor(() =>
      expect(plan).toHaveBeenCalledWith({ decision: "approve" }),
    );

    const note = screen.getByLabelText(
      "What should I account for before I start?",
    );
    fireEvent.change(note, { target: { value: " Use Anthropic. " } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() =>
      expect(plan).toHaveBeenCalledWith({
        decision: "revise",
        feedback: "Use Anthropic.",
      }),
    );
  });

  it("keeps the toggle mounted and focused while an approved plan opens and closes", () => {
    render(
      <PlanCard
        closed={false}
        checkout={{} as CheckoutContextValue}
        plans={[
          {
            revision: 1,
            markdown: "Install the packages",
            status: "approved",
            submittedAt: 1,
          },
        ]}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Show the plan" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Install the packages")).toBeNull();

    toggle.focus();
    fireEvent.click(toggle);

    expect(screen.getByText("Install the packages")).toBeDefined();
    expect(toggle.isConnected).toBe(true);
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toContain("Hide the plan");

    fireEvent.click(toggle);
    expect(screen.queryByText("Install the packages")).toBeNull();
  });
});
