// @vitest-environment jsdom

import { ThemeProvider } from "@openuidev/react-ui";
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenUIPrompt } from "./openui-tool-ui";

const FORM = `root = Card([title, form])
title = TextContent("Contact Us", "large-heavy")
form = Form("contact", btns, [nameField, emailField])
nameField = FormControl("Name", Input("name", "Your name", "text", { required: true, minLength: 2 }))
emailField = FormControl("Email", Input("email", "you@example.com", "email", { required: true, email: true }))
btns = Buttons([Button("Submit", Action([@ToAssistant("Submit")]), "primary")])`;

const MALFORMED = `root = MissingComponent([])`;

type PromptProps = ComponentProps<typeof OpenUIPrompt>;

const makeProps = (overrides: Partial<PromptProps> = {}): PromptProps =>
  ({
    type: "tool-call",
    toolCallId: "openui-call",
    toolName: "prompt_openui",
    args: { ui: FORM },
    argsText: JSON.stringify({ ui: FORM }),
    status: { type: "complete" },
    addResult: vi.fn(),
    resume: vi.fn(),
    respondToApproval: vi.fn(),
    ...overrides,
  }) as PromptProps;

const setInputValue = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

describe("OpenUIPrompt", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const renderPrompt = async (props: PromptProps) => {
    await act(async () => {
      root.render(
        <ThemeProvider mode="light">
          <OpenUIPrompt {...props} />
        </ThemeProvider>,
      );
    });
  };

  it("submits once and restores the completed form state", async () => {
    const addResult = vi.fn();
    const props = makeProps({ addResult });
    await renderPrompt(props);

    const name =
      container.querySelector<HTMLInputElement>('input[name="name"]');
    const email = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    );
    const submit = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Submit",
    );

    expect(name).not.toBeNull();
    expect(email).not.toBeNull();
    expect(submit).toBeDefined();

    await act(async () => {
      setInputValue(name!, "Ada Lovelace");
      setInputValue(email!, "ada@example.com");
    });
    await act(async () => {
      submit!.click();
      submit!.click();
    });

    expect(addResult).toHaveBeenCalledOnce();
    const result = addResult.mock.calls[0]![0];
    expect(result).toMatchObject({
      message: "Submit",
      formName: "contact",
    });
    expect(result.formState).toBeDefined();

    await renderPrompt(makeProps({ result }));

    expect(
      container.querySelector<HTMLInputElement>('input[name="name"]')?.value,
    ).toBe("Ada Lovelace");
    expect(
      container.querySelector<HTMLInputElement>('input[name="email"]')?.value,
    ).toBe("ada@example.com");
  });

  it("shows terminal errors and clears them after a valid response", async () => {
    await renderPrompt(
      makeProps({
        args: { ui: MALFORMED },
        argsText: JSON.stringify({ ui: MALFORMED }),
      }),
    );

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "OpenUI could not render this response.",
    );

    await renderPrompt(makeProps());

    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
