import { BuiltinActionType, Renderer } from "@openuidev/react-lang";
import {
  openuiChatLibrary,
  openuiChatPromptOptions,
  ThemeProvider,
} from "@openuidev/react-ui";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  OPENUI_DEMO_ADDITIONAL_INSTRUCTIONS,
  OPENUI_DEMO_INSTRUCTIONS,
  OPENUI_DEMO_PREAMBLE,
} from "@/lib/openui-demo";
import { shouldContinueAfterOpenUIPrompt } from "./openui-utils";

const FORM = `root = Card([title, form])
title = TextContent("Contact Us", "large-heavy")
form = Form("contact", btns, [nameField, emailField])
nameField = FormControl("Name", Input("name", "Your name", "text", { required: true, minLength: 2 }))
emailField = FormControl("Email", Input("email", "you@example.com", "email", { required: true, email: true }))
btns = Buttons([Button("Submit", Action([@ToAssistant("Submit")]), "primary")])`;

describe("OpenUI docs integration", () => {
  it("keeps the server prompt in sync with the installed component library", () => {
    const generated = [
      openuiChatLibrary.prompt({
        ...openuiChatPromptOptions,
        preamble: OPENUI_DEMO_PREAMBLE,
      }),
      ...OPENUI_DEMO_ADDITIONAL_INSTRUCTIONS,
    ]
      .join("\n")
      .replaceAll("\u2014", "-")
      .replaceAll("\u2013", "-");

    expect(OPENUI_DEMO_INSTRUCTIONS).toBe(generated);
  });

  it("renders with the docs app dependency graph", () => {
    const markup = renderToStaticMarkup(
      createElement(
        ThemeProvider,
        { mode: "light" },
        createElement(Renderer, {
          response: FORM,
          library: openuiChatLibrary,
          isStreaming: false,
        }),
      ),
    );

    expect(markup).toContain("Contact Us");
  });

  it("stops after a completed display tool", () => {
    expect(
      shouldContinueAfterOpenUIPrompt({
        messages: [
          {
            id: "assistant",
            role: "assistant",
            parts: [
              {
                type: "tool-present_openui",
                toolCallId: "present",
                state: "output-available",
                input: { ui: "root = Card([])" },
                output: { displayed: true },
              },
            ],
          },
        ],
      }),
    ).toBe(false);
  });

  it("continues when display and human tools share a step", () => {
    expect(
      shouldContinueAfterOpenUIPrompt({
        messages: [
          {
            id: "assistant",
            role: "assistant",
            parts: [
              {
                type: "tool-present_openui",
                toolCallId: "present",
                state: "output-available",
                input: { ui: "root = Card([])" },
                output: { displayed: true },
              },
              {
                type: "tool-prompt_openui",
                toolCallId: "prompt",
                state: "output-available",
                input: { ui: "root = Card([])" },
                output: {
                  type: BuiltinActionType.ContinueConversation,
                  message: "Submit",
                  params: {},
                },
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });

  it("continues after a completed human tool", () => {
    expect(
      shouldContinueAfterOpenUIPrompt({
        messages: [
          {
            id: "assistant",
            role: "assistant",
            parts: [
              {
                type: "tool-prompt_openui",
                toolCallId: "prompt",
                state: "output-available",
                input: { ui: "root = Card([])" },
                output: {
                  type: BuiltinActionType.ContinueConversation,
                  message: "Submit",
                  params: {},
                },
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });
});
