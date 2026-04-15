import { describe, it, expect } from "vitest";
import { createEditor } from "lexical";
import {
  $createDirectiveNode,
  $createDirectiveNodeWithFormatter,
  DirectiveNode,
} from "./DirectiveNode";
import type {
  Unstable_TriggerItem,
  Unstable_DirectiveFormatter,
} from "@assistant-ui/core";

function createTestEditor() {
  return createEditor({
    nodes: [DirectiveNode],
    onError: (e) => {
      throw e;
    },
  });
}

async function runInEditor<T>(fn: () => T): Promise<T> {
  const editor = createTestEditor();
  let result: T;
  await new Promise<void>((resolve) => {
    editor.update(
      () => {
        result = fn();
      },
      { onUpdate: resolve },
    );
  });
  return result!;
}

/** Avoids jsdom dependency — only `getAttribute` and `textContent` are consulted by `importDOM`. */
function mockSpan(attrs: Record<string, string>, text: string): HTMLElement {
  return {
    getAttribute: (key: string) => attrs[key] ?? null,
    textContent: text,
  } as unknown as HTMLElement;
}

const sampleItem: Unstable_TriggerItem = {
  id: "get_weather",
  type: "tool",
  label: "Weather",
  metadata: { priority: "high", icon: "🌤" },
};

const sampleItemSameIdLabel: Unstable_TriggerItem = {
  id: "weather",
  type: "tool",
  label: "weather",
};

describe("$createDirectiveNode", () => {
  it("creates a DirectiveNode with default formatter directive text", async () => {
    const text = await runInEditor(() => {
      const node = $createDirectiveNode(sampleItem);
      expect(node).toBeInstanceOf(DirectiveNode);
      return node.getTextContent();
    });
    expect(text).toBe(":tool[Weather]{name=get_weather}");
  });

  it("creates a DirectiveNode with explicit directive text", async () => {
    const text = await runInEditor(() => {
      return $createDirectiveNode(sampleItem, "@Weather").getTextContent();
    });
    expect(text).toBe("@Weather");
  });

  it("omits name attr when id === label", async () => {
    const text = await runInEditor(() => {
      return $createDirectiveNode(sampleItemSameIdLabel).getTextContent();
    });
    expect(text).toBe(":tool[weather]");
  });
});

describe("$createDirectiveNodeWithFormatter", () => {
  const customFormatter: Unstable_DirectiveFormatter = {
    serialize: (item) => `[${item.type}:${item.id}]`,
    parse: () => [],
  };

  it("uses the provided formatter for directive text", async () => {
    const text = await runInEditor(() => {
      return $createDirectiveNodeWithFormatter(
        sampleItem,
        customFormatter,
      ).getTextContent();
    });
    expect(text).toBe("[tool:get_weather]");
  });
});

describe("DirectiveNode", () => {
  it("getDirectiveItem returns the item data", async () => {
    const item = await runInEditor(() => {
      return $createDirectiveNode(sampleItem).getDirectiveItem();
    });
    expect(item).toEqual({
      id: "get_weather",
      type: "tool",
      label: "Weather",
      description: undefined,
      metadata: { priority: "high", icon: "🌤" },
    });
  });

  it("getType returns 'directive'", () => {
    expect(DirectiveNode.getType()).toBe("directive");
  });

  it("isInline returns true", async () => {
    const result = await runInEditor(() => {
      return $createDirectiveNode(sampleItem).isInline();
    });
    expect(result).toBe(true);
  });

  describe("exportJSON / importJSON round-trip", () => {
    it("preserves all fields through serialization", async () => {
      const { json, restoredItem, restoredText } = await runInEditor(() => {
        const node = $createDirectiveNode(sampleItem);
        const exported = node.exportJSON();
        const restored = DirectiveNode.importJSON(exported);
        return {
          json: exported,
          restoredItem: restored.getDirectiveItem(),
          restoredText: restored.getTextContent(),
        };
      });

      expect(json).toEqual({
        type: "directive",
        version: 1,
        directiveId: "get_weather",
        directiveType: "tool",
        label: "Weather",
        description: undefined,
        metadata: { priority: "high", icon: "🌤" },
        directiveText: ":tool[Weather]{name=get_weather}",
      });
      expect(restoredItem).toEqual({
        id: "get_weather",
        type: "tool",
        label: "Weather",
        description: undefined,
        metadata: { priority: "high", icon: "🌤" },
      });
      expect(restoredText).toBe(":tool[Weather]{name=get_weather}");
    });

    it("handles missing directiveText in JSON (backwards compat)", async () => {
      const { text, item } = await runInEditor(() => {
        const json = {
          type: "directive" as const,
          version: 1,
          directiveId: "weather",
          directiveType: "tool",
          label: "weather",
        };
        const restored = DirectiveNode.importJSON(json);
        return {
          text: restored.getTextContent(),
          item: restored.getDirectiveItem(),
        };
      });

      expect(text).toBe(":tool[weather]");
      expect(item).toEqual({
        id: "weather",
        type: "tool",
        label: "weather",
        description: undefined,
        metadata: undefined,
      });
    });
  });

  describe("importDOM", () => {
    it("restores DirectiveNode from span with data-directive-* attrs", async () => {
      const restoredItem = await runInEditor(() => {
        const conversionMap = DirectiveNode.importDOM();
        if (!conversionMap?.span) {
          throw new Error("importDOM did not register a span handler");
        }
        const element = mockSpan(
          {
            "data-directive-id": "get_weather",
            "data-directive-type": "tool",
          },
          "Weather",
        );
        const match = conversionMap.span(element);
        if (!match) throw new Error("span matcher returned null");
        const output = match.conversion(element);
        if (!output) throw new Error("conversion returned null");
        const node = output.node;
        if (!(node instanceof DirectiveNode)) {
          throw new Error("conversion did not return a DirectiveNode");
        }
        return node.getDirectiveItem();
      });

      expect(restoredItem).toEqual({
        id: "get_weather",
        type: "tool",
        label: "Weather",
        description: undefined,
        metadata: undefined,
      });
    });

    it("returns null for spans without directive attrs", () => {
      const conversionMap = DirectiveNode.importDOM();
      if (!conversionMap?.span) {
        throw new Error("importDOM did not register a span handler");
      }
      const element = mockSpan({ "data-unrelated": "x" }, "plain text");
      expect(conversionMap.span(element)).toBeNull();
    });
  });

  it("clone preserves all fields", async () => {
    const { clonedItem, clonedText, originalText } = await runInEditor(() => {
      const node = $createDirectiveNode(sampleItem);
      const cloned = DirectiveNode.clone(node);
      return {
        clonedItem: cloned.getDirectiveItem(),
        clonedText: cloned.getTextContent(),
        originalText: node.getTextContent(),
      };
    });
    expect(clonedItem).toEqual({
      id: "get_weather",
      type: "tool",
      label: "Weather",
      description: undefined,
      metadata: { priority: "high", icon: "🌤" },
    });
    expect(clonedText).toBe(originalText);
  });
});
