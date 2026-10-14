import { describe, it, expect } from "vitest";
import transform from "../content-part-to-message-part";
import jscodeshift, { type API } from "jscodeshift";

const transformer = transform;

function applyTransform(source: string): string {
  const fileInfo = { path: "test.tsx", source };
  const api = { jscodeshift: jscodeshift.withParser("tsx") };
  const result = transformer(fileInfo, api as API, {});
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
import { ThreadAssistantContentPart, ToolCallContentPart, TextContentPart } from "@assistant-ui/react";

type MyUnion = ThreadAssistantContentPart | TextContentPart;
type MyGeneric = Array<ToolCallContentPart<{ query: string }, string>>;
    `;

    const expected = `
import { ThreadAssistantMessagePart, ToolCallMessagePart, TextMessagePart } from "@assistant-ui/react";

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

describe("content-part import bindings", () => {
  it.each([
    'import { useContentPart } from "./custom-hooks";\nexport const read = () => useContentPart();',
    'import type { TextContentPart } from "./custom-types";\nexport const read = (part: TextContentPart) => part.text;',
    'import { ContentPartPrimitive } from "./custom-ui";\nexport const Text = () => <ContentPartPrimitive.Text />;',
    'import { MessagePrimitive } from "./custom-ui";\nexport const Content = () => <MessagePrimitive.Content />;',
  ])("preserves foreign imports and references: %s", (custom) => {
    const input = `import { ThreadPrimitive } from "@assistant-ui/react";\n${custom}`;
    expect(applyTransform(input)).toBe(input);
  });

  it("preserves unbound names", () => {
    const input = `import { ThreadPrimitive } from "@assistant-ui/react";
export const read = () => useContentPart();
export type Part = TextContentPart;`;
    expect(applyTransform(input)).toBe(input);
  });

  it("preserves an import alias while leaving another module's canonical name alone", () => {
    const output =
      applyTransform(`import { useContentPart as usePart, TextContentPart as Part } from "@assistant-ui/react";
import { useContentPart } from "./custom-hooks";
export const read = (part: Part) => [usePart(), useContentPart(), part];`);
    expect(output).toContain("useMessagePart as usePart");
    expect(output).toContain("TextMessagePart as Part");
    expect(output).toContain("[usePart(), useContentPart(), part]");
  });

  it("preserves shadowed parameters and uses an import alias to keep their references intact", () => {
    const output =
      applyTransform(`import { useContentPart } from "@assistant-ui/react";
export const read = () => useContentPart();
export const custom = (useContentPart) => useContentPart();`);
    expect(output).toContain("useMessagePart as useContentPart");
    expect(output).toContain("export const read = () => useContentPart();");
    expect(output).toContain(
      "export const custom = (useContentPart) => useContentPart();",
    );
  });

  it.each([
    "export type Identity<TextContentPart> = TextContentPart;",
    "export function custom() { type TextContentPart = { custom: string }; return null as TextContentPart | null; }",
    'export type Keys = { [TextContentPart in "a" | "b"]: TextContentPart };',
  ])("preserves type declarations and parameters: %s", (body) => {
    const output =
      applyTransform(`import type { TextContentPart } from "@assistant-ui/react";
export type Part = TextContentPart;
${body}`);
    expect(output).toContain("TextMessagePart as TextContentPart");
    expect(output).toContain("export type Part = TextContentPart;");
    expect(output).toContain(body);
  });

  it("preserves ambient declarations with the same name", () => {
    const output =
      applyTransform(`import { useContentPart } from "@assistant-ui/react";
export const read = () => useContentPart();
namespace Custom {
  export declare function useContentPart(): string;
  export const read = () => useContentPart();
}`);
    expect(output).toContain("useMessagePart as useContentPart");
    expect(output).toContain(
      "export declare function useContentPart(): string;",
    );
    expect(output.match(/read = \(\) => useContentPart\(\)/g)).toHaveLength(2);
  });

  it.each([
    'import type { TextContentPart } from "@assistant-ui/react";',
    'import { type TextContentPart } from "@assistant-ui/react";',
  ])("renames unshadowed type-only references: %s", (declaration) => {
    const output = applyTransform(
      `${declaration}\nexport type Part = Array<TextContentPart>;`,
    );
    expect(output).toContain(
      declaration.replace("TextContentPart", "TextMessagePart"),
    );
    expect(output).toContain("Array<TextMessagePart>");
  });

  it.each([
    'const useMessagePart = () => "custom";\nexport const read = () => [useContentPart(), useMessagePart()];',
    "export const read = (useMessagePart) => [useContentPart(), useMessagePart()];",
  ])("preserves names when the replacement would collide: %s", (body) => {
    const output = applyTransform(
      `import { useContentPart } from "@assistant-ui/react";\n${body}`,
    );
    expect(output).toContain("useMessagePart as useContentPart");
    expect(output).toContain(body);
  });

  it("avoids capturing a type reference with a generic parameter", () => {
    const output =
      applyTransform(`import type { TextContentPart } from "@assistant-ui/react";
export type Pair<TextMessagePart> = [TextContentPart, TextMessagePart];`);
    expect(output).toContain("TextMessagePart as TextContentPart");
    expect(output).toContain("[TextContentPart, TextMessagePart]");
  });

  it("keeps object keys, member names, JSX attributes, and public export names", () => {
    const output =
      applyTransform(`import { useContentPart, ContentPartPrimitive } from "@assistant-ui/react";
export const hooks = { useContentPart };
export const read = (other) => other.useContentPart();
export const View = () => <ContentPartPrimitive.Text useContentPart={useContentPart} />;
export { useContentPart };
export { useContentPart as custom } from "./custom-hooks";`);
    expect(output).toMatch(/useContentPart: useMessagePart/);
    expect(output).toContain("other.useContentPart()");
    expect(output).toContain(
      "<MessagePartPrimitive.Text useContentPart={useMessagePart}",
    );
    expect(output).toContain("export { useMessagePart as useContentPart }");
    expect(output).toContain(
      'export { useContentPart as custom } from "./custom-hooks"',
    );
    expect(applyTransform(output)).toBe(output);
  });

  it("preserves type-only exports while renaming their local references", () => {
    const output =
      applyTransform(`import type { TextContentPart } from "@assistant-ui/react";
export type { TextContentPart };
export { type TextContentPart as PublicPart };`);
    expect(output).toContain(
      "export type { TextMessagePart as TextContentPart }",
    );
    expect(output).toContain("export { type TextMessagePart as PublicPart }");
  });

  it("resolves the MessagePrimitive import before renaming Content", () => {
    const output =
      applyTransform(`import { MessagePrimitive as Message } from "@assistant-ui/react";
export const View = () => <Message.Content />;
export const content = Message.Content;
export const dynamic = (Content) => Message[Content];
export const custom = (Message) => <Message.Content />;`);
    expect(output).toContain("<Message.Parts />");
    expect(output).toContain("export const content = Message.Parts;");
    expect(output).toContain("Message[Content]");
    expect(output).toContain(
      "export const custom = (Message) => <Message.Content />;",
    );
  });
});

describe("content-part re-exports", () => {
  it.each([
    [
      'export { useContentPart } from "@assistant-ui/react";',
      'export { useMessagePart as useContentPart } from "@assistant-ui/react";',
    ],
    [
      'export type { TextContentPart } from "@assistant-ui/react";',
      'export type { TextMessagePart as TextContentPart } from "@assistant-ui/react";',
    ],
    [
      'export { type TextContentPart as Part } from "@assistant-ui/react";',
      'export { type TextMessagePart as Part } from "@assistant-ui/react";',
    ],
    [
      'export { useContentPart as usePart } from "@assistant-ui/react";',
      'export { useMessagePart as usePart } from "@assistant-ui/react";',
    ],
  ])(
    "migrates the source symbol while preserving its public name: %s",
    (input, expected) => {
      const output = applyTransform(input);
      expect(output).toBe(expected);
      expect(applyTransform(output)).toBe(output);
    },
  );

  it("preserves unrelated re-exports and export namespaces", () => {
    const input = `export { useContentPart } from "./custom-hooks";
export type { TextContentPart } from "./custom-types";
export * as ContentPartPrimitive from "@assistant-ui/react";`;
    expect(applyTransform(input)).toBe(input);
  });
});
