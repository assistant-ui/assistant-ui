import { describe, it, expect } from "vitest";
import jscodeshift, { type API } from "jscodeshift";
import transform from "../primitive-if-to-aui-if";

const j = jscodeshift.withParser("tsx");

function applyTransform(source: string): string | null {
  const fileInfo = {
    path: "test.tsx",
    source,
  };

  const api: API = {
    jscodeshift: j,
    j,
    stats: () => {},
    report: () => {},
  };

  return transform(fileInfo, api, {});
}

describe("primitive-if-to-aui-if", () => {
  // ── ThreadPrimitive.If ─────────────────────────────────────────────

  describe("ThreadPrimitive.If", () => {
    it("should migrate <ThreadPrimitive.If empty> to AuiIf", () => {
      const input = `
import { ThreadPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ThreadPrimitive.If empty>
      <div>Empty</div>
    </ThreadPrimitive.If>
  );
}
`;

      const expected = `
import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.thread.isEmpty}>
      <div>Empty</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <ThreadPrimitive.If empty={false}>", () => {
      const input = `
import { ThreadPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ThreadPrimitive.If empty={false}>
      <div>Not empty</div>
    </ThreadPrimitive.If>
  );
}
`;

      const expected = `
import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => !s.thread.isEmpty}>
      <div>Not empty</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <ThreadPrimitive.If running>", () => {
      const input = `
import { ThreadPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ThreadPrimitive.If running>
      <div>Running</div>
    </ThreadPrimitive.If>
  );
}
`;

      const expected = `
import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.thread.isRunning}>
      <div>Running</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <ThreadPrimitive.If running={false}>", () => {
      const input = `
import { ThreadPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ThreadPrimitive.If running={false}>
      <div>Not running</div>
    </ThreadPrimitive.If>
  );
}
`;

      const expected = `
import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => !s.thread.isRunning}>
      <div>Not running</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <ThreadPrimitive.If disabled>", () => {
      const input = `
import { ThreadPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ThreadPrimitive.If disabled>
      <div>Disabled</div>
    </ThreadPrimitive.If>
  );
}
`;

      const expected = `
import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.thread.isDisabled}>
      <div>Disabled</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should handle self-closing ThreadPrimitive.If", () => {
      const input = `
import { ThreadPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return <ThreadPrimitive.If empty />;
}
`;

      const expected = `
import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return <AuiIf condition={(s) => s.thread.isEmpty} />;
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });
  });

  // ── MessagePrimitive.If ────────────────────────────────────────────

  describe("MessagePrimitive.If", () => {
    it("should migrate <MessagePrimitive.If user>", () => {
      const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <MessagePrimitive.If user>
      <div>User message</div>
    </MessagePrimitive.If>
  );
}
`;

      const expected = `
import { MessagePrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.message.role === "user"}>
      <div>User message</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <MessagePrimitive.If assistant>", () => {
      const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <MessagePrimitive.If assistant>
      <div>Assistant message</div>
    </MessagePrimitive.If>
  );
}
`;

      const expected = `
import { MessagePrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.message.role === "assistant"}>
      <div>Assistant message</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <MessagePrimitive.If copied>", () => {
      const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <MessagePrimitive.If copied>
      <CheckIcon />
    </MessagePrimitive.If>
  );
}
`;

      const expected = `
import { MessagePrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.message.isCopied}>
      <CheckIcon />
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <MessagePrimitive.If copied={false}>", () => {
      const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <MessagePrimitive.If copied={false}>
      <CopyIcon />
    </MessagePrimitive.If>
  );
}
`;

      const expected = `
import { MessagePrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => !s.message.isCopied}>
      <CopyIcon />
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <MessagePrimitive.If speaking>", () => {
      const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <MessagePrimitive.If speaking>
      <StopIcon />
    </MessagePrimitive.If>
  );
}
`;

      const expected = `
import { MessagePrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.message.speech != null}>
      <StopIcon />
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <MessagePrimitive.If speaking={false}>", () => {
      const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <MessagePrimitive.If speaking={false}>
      <SpeakIcon />
    </MessagePrimitive.If>
  );
}
`;

      const expected = `
import { MessagePrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => !(s.message.speech != null)}>
      <SpeakIcon />
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <MessagePrimitive.If last>", () => {
      const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <MessagePrimitive.If last>
      <div>Last message</div>
    </MessagePrimitive.If>
  );
}
`;

      const expected = `
import { MessagePrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.message.isLast}>
      <div>Last message</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <MessagePrimitive.If hasBranches>", () => {
      const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <MessagePrimitive.If hasBranches>
      <BranchPicker />
    </MessagePrimitive.If>
  );
}
`;

      const expected = `
import { MessagePrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.message.branchCount >= 2}>
      <BranchPicker />
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <MessagePrimitive.If hasAttachments>", () => {
      const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <MessagePrimitive.If hasAttachments>
      <Attachments />
    </MessagePrimitive.If>
  );
}
`;

      const expected = `
import { MessagePrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.message.role === "user" && !!s.message.attachments?.length}>
      <Attachments />
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <MessagePrimitive.If hasContent>", () => {
      const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <MessagePrimitive.If hasContent>
      <Content />
    </MessagePrimitive.If>
  );
}
`;

      const expected = `
import { MessagePrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.message.parts.length > 0}>
      <Content />
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <MessagePrimitive.If lastOrHover>", () => {
      const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <MessagePrimitive.If lastOrHover>
      <ActionBar />
    </MessagePrimitive.If>
  );
}
`;

      const expected = `
import { MessagePrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.message.isHovering || s.message.isLast}>
      <ActionBar />
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });
  });

  // ── ComposerPrimitive.If ──────────────────────────────────────────

  describe("ComposerPrimitive.If", () => {
    it("should migrate <ComposerPrimitive.If editing>", () => {
      const input = `
import { ComposerPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ComposerPrimitive.If editing>
      <div>Editing</div>
    </ComposerPrimitive.If>
  );
}
`;

      const expected = `
import { ComposerPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.composer.isEditing}>
      <div>Editing</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <ComposerPrimitive.If editing={false}>", () => {
      const input = `
import { ComposerPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ComposerPrimitive.If editing={false}>
      <div>Not editing</div>
    </ComposerPrimitive.If>
  );
}
`;

      const expected = `
import { ComposerPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => !s.composer.isEditing}>
      <div>Not editing</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should migrate <ComposerPrimitive.If dictation>", () => {
      const input = `
import { ComposerPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ComposerPrimitive.If dictation>
      <div>Dictating</div>
    </ComposerPrimitive.If>
  );
}
`;

      const expected = `
import { ComposerPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.composer.dictation != null}>
      <div>Dictating</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });
  });

  // ── ThreadPrimitive.Empty ───────────────────────────────────────────

  describe("ThreadPrimitive.Empty", () => {
    it("should migrate <ThreadPrimitive.Empty> to AuiIf", () => {
      const input = `
import { ThreadPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ThreadPrimitive.Empty>
      <div>Welcome</div>
    </ThreadPrimitive.Empty>
  );
}
`;

      const expected = `
import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.thread.isEmpty}>
      <div>Welcome</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should handle self-closing <ThreadPrimitive.Empty />", () => {
      const input = `
import { ThreadPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return <ThreadPrimitive.Empty />;
}
`;

      const expected = `
import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return <AuiIf condition={(s) => s.thread.isEmpty} />;
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should handle ThreadPrimitive.Empty alongside ThreadPrimitive.If", () => {
      const input = `
import { ThreadPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <>
      <ThreadPrimitive.Empty>
        <div>Welcome</div>
      </ThreadPrimitive.Empty>
      <ThreadPrimitive.If running>
        <div>Running</div>
      </ThreadPrimitive.If>
    </>
  );
}
`;

      const expected = `
import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <>
      <AuiIf condition={(s) => s.thread.isEmpty}>
        <div>Welcome</div>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <div>Running</div>
      </AuiIf>
    </>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("should not add duplicate AuiIf import if already present", () => {
      const input = `
import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ThreadPrimitive.If empty>
      <div>Empty</div>
    </ThreadPrimitive.If>
  );
}
`;

      const expected = `
import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.thread.isEmpty}>
      <div>Empty</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should handle multiple Primitive.If in the same file", () => {
      const input = `
import { ThreadPrimitive, MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <>
      <ThreadPrimitive.If running>
        <div>Running</div>
      </ThreadPrimitive.If>
      <MessagePrimitive.If user>
        <div>User</div>
      </MessagePrimitive.If>
    </>
  );
}
`;

      const expected = `
import { ThreadPrimitive, MessagePrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <div>Running</div>
      </AuiIf>
      <AuiIf condition={(s) => s.message.role === "user"}>
        <div>User</div>
      </AuiIf>
    </>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should not transform if no @assistant-ui import", () => {
      const input = `
function MyComponent() {
  return (
    <ThreadPrimitive.If empty>
      <div>Empty</div>
    </ThreadPrimitive.If>
  );
}
`;

      expect(applyTransform(input)).toBe(null);
    });

    it("should not transform non-If member expressions", () => {
      const input = `
import { ThreadPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ThreadPrimitive.Root>
      <div>Hello</div>
    </ThreadPrimitive.Root>
  );
}
`;

      expect(applyTransform(input)).toBe(null);
    });

    it("should handle multiple props combined into a single condition", () => {
      const input = `
import { ThreadPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ThreadPrimitive.If empty running={false}>
      <div>Empty and not running</div>
    </ThreadPrimitive.If>
  );
}
`;

      const expected = `
import { ThreadPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.thread.isEmpty && !s.thread.isRunning}>
      <div>Empty and not running</div>
    </AuiIf>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });

    it("should preserve other JSX elements alongside migrated ones", () => {
      const input = `
import { ThreadPrimitive, ComposerPrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.If empty>
        <div>Welcome</div>
      </ThreadPrimitive.If>
      <ComposerPrimitive.Input />
    </ThreadPrimitive.Root>
  );
}
`;

      const expected = `
import { ThreadPrimitive, ComposerPrimitive, AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <ThreadPrimitive.Root>
      <AuiIf condition={(s) => s.thread.isEmpty}>
        <div>Welcome</div>
      </AuiIf>
      <ComposerPrimitive.Input />
    </ThreadPrimitive.Root>
  );
}
`;

      expect(applyTransform(input)?.trim()).toBe(expected.trim());
    });
  });
});

describe("elements that cannot be migrated stay intact", () => {
  it.each([
    [
      "spread attributes",
      `<ThreadPrimitive.If {...props}>
      <div>Content</div>
    </ThreadPrimitive.If>`,
    ],
    [
      "unknown props",
      `<MessagePrimitive.If user asChild>
      <div>Content</div>
    </MessagePrimitive.If>`,
    ],
    [
      "no props",
      `<ThreadPrimitive.If>
      <div>Content</div>
    </ThreadPrimitive.If>`,
    ],
    [
      "dynamic prop values",
      `<ThreadPrimitive.If running={someFlag}>
      <div>Content</div>
    </ThreadPrimitive.If>`,
    ],
    [
      "namespaced attributes",
      `<ThreadPrimitive.If empty xml:lang="en">
      <div>Content</div>
    </ThreadPrimitive.If>`,
    ],
    [
      "fixed-condition components with props",
      `<ThreadPrimitive.Empty asChild>
      <div>Content</div>
    </ThreadPrimitive.Empty>`,
    ],
  ])("leaves an element with %s unchanged", (_label, jsx) => {
    const input = `
import { ThreadPrimitive, MessagePrimitive } from "@assistant-ui/react";

function MyComponent({ someFlag }: { someFlag: boolean }) {
  return (
    ${jsx}
  );
}
`;

    expect(applyTransform(input)).toBeNull();
  });

  it("converts only the migratable element and keeps the output parseable", () => {
    const input = `
import { ThreadPrimitive } from "@assistant-ui/react";

function MyComponent(props: Record<string, unknown>) {
  return (
    <>
      <ThreadPrimitive.If empty>
        <div>Empty</div>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If {...props}>
        <div>Dynamic</div>
      </ThreadPrimitive.If>
    </>
  );
}
`;

    const output = applyTransform(input);
    expect(output).not.toBeNull();
    expect(() => j(output!)).not.toThrow();
    expect(output).toContain("</AuiIf>");
    expect(output).toContain("</ThreadPrimitive.If>");
    expect(output).toContain("<ThreadPrimitive.If {...props}>");
  });
});

describe("null literal prop values", () => {
  it("maps submittedFeedback={null} to the null comparison", () => {
    const input = `
import { MessagePrimitive } from "@assistant-ui/react";

function MyComponent() {
  return (
    <MessagePrimitive.If submittedFeedback={null}>
      <div>Content</div>
    </MessagePrimitive.If>
  );
}
`;

    const output = applyTransform(input);
    expect(output).toContain(
      "(s.message.metadata.submittedFeedback?.type ?? null) === null",
    );
  });
});

describe("condition precedence", () => {
  const compileCondition = (jsx: string) => {
    const output = applyTransform(`
import { MessagePrimitive, ComposerPrimitive } from "@assistant-ui/react";

const view = ${jsx};
`);
    const arrow = j(output!).find(j.ArrowFunctionExpression).nodes()[0]!;
    return new Function("s", `return ${j(arrow.body).toSource()};`) as (
      s: unknown,
    ) => boolean;
  };

  it.each([
    {
      jsx: "<MessagePrimitive.If speaking={false} />",
      hidden: { message: { speech: { status: "running" } } },
      visible: { message: { speech: null } },
    },
    {
      jsx: "<ComposerPrimitive.If dictation={false} />",
      hidden: { composer: { dictation: { status: "running" } } },
      visible: { composer: { dictation: null } },
    },
    {
      jsx: "<MessagePrimitive.If hasContent={false} />",
      hidden: { message: { parts: [{}] } },
      visible: { message: { parts: [] } },
    },
    {
      jsx: "<MessagePrimitive.If lastOrHover copied />",
      hidden: { message: { isHovering: true, isLast: false, isCopied: false } },
      visible: { message: { isHovering: true, isLast: false, isCopied: true } },
    },
    {
      jsx: "<MessagePrimitive.If hasAttachments={false} copied />",
      hidden: { message: { role: "assistant", isCopied: false } },
      visible: { message: { role: "assistant", isCopied: true } },
    },
  ])("keeps every filter in $jsx", ({ jsx, hidden, visible }) => {
    const condition = compileCondition(jsx);

    expect(condition(hidden)).toBe(false);
    expect(condition(visible)).toBe(true);
  });
});
