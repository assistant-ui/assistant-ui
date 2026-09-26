// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { WizardHost } from "./test/wizard-host";
import { PlanAccordion, PlanCard, PlanMarkdown } from "./plan-card";

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

const triggers = () =>
  screen
    .getAllByRole("button")
    .filter((button) => button.hasAttribute("aria-expanded"))
    .map((button) => button.textContent);

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

describe("PlanAccordion", () => {
  it("lists each section as a row with its count, and opens the steps first", () => {
    const { container } = render(<PlanAccordion markdown={PLAN} />);

    expect(triggers()).toEqual([
      "What I found4 items",
      "What I will install2 items",
      "Steps2 steps",
      "Open questions1 question",
    ]);
    expect(
      [...container.querySelectorAll("ol li")].map((n) => n.textContent),
    ).toEqual(["1Install the packages.", "2Add the chat route."]);
    expect(container.textContent).not.toContain("Peer packages come along.");
    expect(screen.queryByText("App")).toBeNull();
  });

  it("opens one section at a time, each item on one truncated line", () => {
    const { container } = render(<PlanAccordion markdown={PLAN} />);

    const found = screen.getByRole("button", { name: /What I found/ });
    const steps = screen.getByRole("button", { name: /^Steps/ });
    expect(steps.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(found);
    expect(found.getAttribute("aria-expanded")).toBe("true");
    expect(steps.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector("ol")).toBeNull();
    expect(screen.getByText("App").parentElement?.textContent).toBe(
      "AppNext.js 15pnpm",
    );
    expect(screen.getByText("Agent").parentElement?.textContent).toBe(
      "AgentVercel AI SDK",
    );
    expect(screen.getByText("Model").parentElement?.textContent).toBe(
      "ModelOpenAIgpt-4o",
    );
    expect(screen.getByText("Components").parentElement?.textContent).toBe(
      "Componentssrc/components",
    );
    for (const line of container.querySelectorAll("ul li > span")) {
      expect(line.className).toContain("truncate");
    }

    fireEvent.click(
      screen.getByRole("button", { name: /What I will install/ }),
    );
    expect(found.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("The chat").parentElement?.textContent).toBe(
      "The chat@assistant-ui/react",
    );
    expect(screen.getByText("app/api/chat/route.ts")).toBeDefined();
  });

  it("keeps every step in a panel that scrolls on its own", () => {
    const { container } = render(
      <PlanAccordion
        markdown={"## Steps\n\n1. One\n2. Two\n3. Three\n4. Four\n5. Five"}
      />,
    );
    expect(triggers()).toEqual(["Steps5 steps"]);
    expect(
      [...container.querySelectorAll("ol li")].map((n) => n.textContent),
    ).toEqual(["1One", "2Two", "3Three", "4Four", "5Five"]);
    expect(
      container.querySelector("ol")?.closest('[class*="overflow-y-auto"]'),
    ).not.toBeNull();
  });

  it("lists the declared steps over the plan's own", () => {
    render(
      <PlanAccordion
        markdown={PLAN}
        steps={[
          { id: "s1", title: "Do it all", status: "pending", createdAt: 1 },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: /^Steps/ }).textContent).toBe(
      "Steps1 step",
    );
    expect(screen.getByText("Do it all")).toBeDefined();
    expect(screen.queryByText("Add the chat route.")).toBeNull();
  });

  it("keeps a plan without the expected headings as one row", () => {
    render(
      <PlanAccordion markdown={"## Plan\n\n1. Install.\n\nThat is all."} />,
    );
    expect(triggers()).toEqual(["The planAs written"]);
    expect(screen.getByText("Install.")).toBeDefined();
    expect(screen.getByText("That is all.")).toBeDefined();
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
