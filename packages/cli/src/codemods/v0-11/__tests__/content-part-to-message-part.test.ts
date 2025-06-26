import { describe, it, expect } from "vitest";
import transform from "../content-part-to-message-part";
import jscodeshift from "jscodeshift";

const transformer = transform;

function applyTransform(source: string): string {
  const fileInfo = { path: "test.tsx", source };
  const api = { jscodeshift: jscodeshift.withParser("tsx") };
  const result = transformer(fileInfo, api, {});
  return result || source;
}

describe("content-part-to-message-part migration", () => {
  it("should rename ContentPart types in import statements", () => {
    const input = `
import { TextContentPart, ToolCallContentPart, ContentPartStatus } from "@assistant-ui/react";
    `;

    const expected = `
import { TextMessagePart, ToolCallMessagePart, MessagePartStatus } from "@assistant-ui/react";
    `;

    expect(applyTransform(input).trim()).toBe(expected.trim());
  });

  it("should rename useContentPart hooks", () => {
    const input = `
import { useContentPart, useContentPartText, useContentPartRuntime } from "@assistant-ui/react";

function MyComponent() {
  const part = useContentPart();
  const text = useContentPartText();
  const runtime = useContentPartRuntime();
  return null;
}
    `;

    const expected = `
import { useMessagePart, useMessagePartText, useMessagePartRuntime } from "@assistant-ui/react";

function MyComponent() {
  const part = useMessagePart();
  const text = useMessagePartText();
  const runtime = useMessagePartRuntime();
  return null;
}
    `;

    expect(applyTransform(input).trim()).toBe(expected.trim());
  });

  it("should rename MessagePrimitive.Content to MessagePrimitive.Parts", () => {
    const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return <MessagePrimitive.Content components={{ Text: MyText }} />;
}
    `;

    const expected = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return <MessagePrimitive.Parts components={{ Text: MyText }} />;
}
    `;

    expect(applyTransform(input).trim()).toBe(expected.trim());
  });

  it("should rename ContentPartPrimitive to MessagePartPrimitive", () => {
    const input = `
import { ContentPartPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <div>
      <ContentPartPrimitive.Text />
      <ContentPartPrimitive.Image />
    </div>
  );
}
    `;

    const expected = `
import { MessagePartPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <div>
      <MessagePartPrimitive.Text />
      <MessagePartPrimitive.Image />
    </div>
  );
}
    `;

    expect(applyTransform(input).trim()).toBe(expected.trim());
  });

  it("should rename type annotations", () => {
    const input = `
import { TextContentPart, ToolCallContentPartComponent } from "@assistant-ui/react";

function processContent(part: TextContentPart): void {
  console.log(part.text);
}

const MyTool: ToolCallContentPartComponent = ({ toolName }) => {
  return <div>{toolName}</div>;
};
    `;

    const expected = `
import { TextMessagePart, ToolCallMessagePartComponent } from "@assistant-ui/react";

function processContent(part: TextMessagePart): void {
  console.log(part.text);
}

const MyTool: ToolCallMessagePartComponent = ({ toolName }) => {
  return <div>{toolName}</div>;
};
    `;

    expect(applyTransform(input).trim()).toBe(expected.trim());
  });

  it("should rename provider components", () => {
    const input = `
import { TextContentPartProvider } from "@assistant-ui/react";

function MyComponent() {
  return (
    <TextContentPartProvider text="Hello" isRunning={false}>
      <div>Content</div>
    </TextContentPartProvider>
  );
}
    `;

    const expected = `
import { TextMessagePartProvider } from "@assistant-ui/react";

function MyComponent() {
  return (
    <TextMessagePartProvider text="Hello" isRunning={false}>
      <div>Content</div>
    </TextMessagePartProvider>
  );
}
    `;

    expect(applyTransform(input).trim()).toBe(expected.trim());
  });

  it("should handle complex type unions and generics", () => {
    const input = `
import { ThreadAssistantContentPart, ToolCallContentPart } from "@assistant-ui/react";

type MyUnion = ThreadAssistantContentPart | TextContentPart;
type MyGeneric = Array<ToolCallContentPart<{ query: string }, string>>;
    `;

    const expected = `
import { ThreadAssistantMessagePart, ToolCallMessagePart } from "@assistant-ui/react";

type MyUnion = ThreadAssistantMessagePart | TextMessagePart;
type MyGeneric = Array<ToolCallMessagePart<{ query: string }, string>>;
    `;

    expect(applyTransform(input).trim()).toBe(expected.trim());
  });

  it("should preserve non-assistant-ui imports", () => {
    const input = `
import { TextContentPart } from "@assistant-ui/react";
import { SomeOtherType } from "some-other-package";
import React from "react";

function MyComponent() {
  return null;
}
    `;

    const expected = `
import { TextMessagePart } from "@assistant-ui/react";
import { SomeOtherType } from "some-other-package";
import React from "react";

function MyComponent() {
  return null;
}
    `;

    expect(applyTransform(input).trim()).toBe(expected.trim());
  });

  it("should handle JSX member expressions", () => {
    const input = `
import { MessagePrimitive } from "@assistant-ui/react";

const config = {
  content: MessagePrimitive.Content,
};

function MyComponent() {
  const Component = MessagePrimitive.Content;
  return <Component />;
}
    `;

    const expected = `
import { MessagePrimitive } from "@assistant-ui/react";

const config = {
  content: MessagePrimitive.Parts,
};

function MyComponent() {
  const Component = MessagePrimitive.Parts;
  return <Component />;
}
    `;

    expect(applyTransform(input).trim()).toBe(expected.trim());
  });
});
