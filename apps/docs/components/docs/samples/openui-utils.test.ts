import { createParser, createStreamingParser } from "@openuidev/react-lang";
import { openuiChatLibrary } from "@openuidev/react-ui";
import { BuiltinActionType } from "@openuidev/react-lang";
import { describe, expect, it } from "vitest";
import { shouldContinueAfterOpenUIPrompt } from "./openui-utils";

const FORM = `root = Card([title, form])
title = TextContent("Contact Us", "large-heavy")
form = Form("contact", btns, [nameField, emailField])
nameField = FormControl("Name", Input("name", "Your name", "text", { required: true, minLength: 2 }))
emailField = FormControl("Email", Input("email", "you@example.com", "email", { required: true, email: true }))
btns = Buttons([Button("Submit", Action([@ToAssistant("Submit")]), "primary")])`;

const parser = () => createParser(openuiChatLibrary.toJSONSchema(), "Card");

describe("OpenUI docs integration", () => {
  it("parses an interactive OpenUI form", () => {
    const result = parser().parse(FORM);

    expect(result.root?.typeName).toBe("Card");
    expect(result.meta.errors).toEqual([]);
    expect(result.meta.unresolved).toEqual([]);
  });

  it("keeps the root renderable while references stream", () => {
    const stream = createStreamingParser(
      openuiChatLibrary.toJSONSchema(),
      "Card",
    );

    const partial = stream.push("root = Card([title, form])\n");
    expect(partial.root?.typeName).toBe("Card");
    expect(partial.meta.unresolved).toEqual(["title", "form"]);

    const complete = stream.push(FORM.split("\n").slice(1).join("\n"));
    expect(complete.meta.errors).toEqual([]);
    expect(complete.meta.unresolved).toEqual([]);
  });

  it("reports malformed OpenUI output", () => {
    const result = parser().parse('root = MissingCard("broken")');

    expect(result.root).toBeNull();
    expect(result.meta.errors).toEqual([
      expect.objectContaining({
        code: "unknown-component",
        component: "MissingCard",
      }),
    ]);
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
