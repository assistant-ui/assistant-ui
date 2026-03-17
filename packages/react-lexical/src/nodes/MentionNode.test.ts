import { describe, it, expect } from "vitest";
import { createEditor } from "lexical";
import {
  $createMentionNode,
  $createMentionNodeWithFormatter,
  MentionNode,
} from "./MentionNode";
import type {
  Unstable_MentionItem,
  Unstable_DirectiveFormatter,
} from "@assistant-ui/core";

// Lexical requires an active editor context for node operations.
// We create a headless editor and run all node operations inside editor.update().

function createTestEditor() {
  return createEditor({
    nodes: [MentionNode],
    onError: (e) => {
      throw e;
    },
  });
}

/** Run a callback inside an editor.update() and wait for it to complete. */
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

const sampleItem: Unstable_MentionItem = {
  id: "get_weather",
  type: "tool",
  label: "Weather",
  icon: "🌤",
  metadata: { priority: "high" },
};

const sampleItemSameIdLabel: Unstable_MentionItem = {
  id: "weather",
  type: "tool",
  label: "weather",
};

describe("$createMentionNode", () => {
  it("creates a MentionNode with default formatter directive text", async () => {
    const text = await runInEditor(() => {
      const node = $createMentionNode(sampleItem);
      expect(node).toBeInstanceOf(MentionNode);
      return node.getTextContent();
    });
    expect(text).toBe(":tool[Weather]{name=get_weather}");
  });

  it("creates a MentionNode with explicit directive text", async () => {
    const text = await runInEditor(() => {
      return $createMentionNode(sampleItem, "@Weather").getTextContent();
    });
    expect(text).toBe("@Weather");
  });

  it("omits name attr when id === label", async () => {
    const text = await runInEditor(() => {
      return $createMentionNode(sampleItemSameIdLabel).getTextContent();
    });
    expect(text).toBe(":tool[weather]");
  });
});

describe("$createMentionNodeWithFormatter", () => {
  it("uses the provided formatter for directive text", async () => {
    const customFormatter: Unstable_DirectiveFormatter = {
      serialize: (item) => `[${item.type}:${item.id}]`,
      parse: () => [],
    };
    const text = await runInEditor(() => {
      return $createMentionNodeWithFormatter(
        sampleItem,
        customFormatter,
      ).getTextContent();
    });
    expect(text).toBe("[tool:get_weather]");
  });
});

describe("MentionNode", () => {
  it("getMentionItem returns the item data", async () => {
    const item = await runInEditor(() => {
      return $createMentionNode(sampleItem).getMentionItem();
    });
    expect(item).toEqual(sampleItem);
  });

  it("getType returns 'mention'", () => {
    expect(MentionNode.getType()).toBe("mention");
  });

  it("isInline returns true", async () => {
    const result = await runInEditor(() => {
      return $createMentionNode(sampleItem).isInline();
    });
    expect(result).toBe(true);
  });

  describe("exportJSON / importJSON round-trip", () => {
    it("preserves all fields through serialization", async () => {
      const { json, restoredItem, restoredText } = await runInEditor(() => {
        const node = $createMentionNode(sampleItem);
        const exported = node.exportJSON();
        const restored = MentionNode.importJSON(exported);
        return {
          json: exported,
          restoredItem: restored.getMentionItem(),
          restoredText: restored.getTextContent(),
        };
      });

      expect(json).toEqual({
        type: "mention",
        version: 1,
        mentionId: "get_weather",
        mentionType: "tool",
        label: "Weather",
        icon: "🌤",
        metadata: { priority: "high" },
        directiveText: ":tool[Weather]{name=get_weather}",
      });
      expect(restoredItem).toEqual(sampleItem);
      expect(restoredText).toBe(":tool[Weather]{name=get_weather}");
    });

    it("handles missing directiveText in JSON (backwards compat)", async () => {
      const { text, item } = await runInEditor(() => {
        const json = {
          type: "mention" as const,
          version: 1,
          mentionId: "weather",
          mentionType: "tool",
          label: "weather",
        };
        const restored = MentionNode.importJSON(json);
        return {
          text: restored.getTextContent(),
          item: restored.getMentionItem(),
        };
      });

      expect(text).toBe(":tool[weather]");
      expect(item).toEqual({
        id: "weather",
        type: "tool",
        label: "weather",
        icon: undefined,
        metadata: undefined,
      });
    });
  });

  it("clone preserves all fields", async () => {
    const { clonedItem, clonedText, originalText } = await runInEditor(() => {
      const node = $createMentionNode(sampleItem);
      const cloned = MentionNode.clone(node);
      return {
        clonedItem: cloned.getMentionItem(),
        clonedText: cloned.getTextContent(),
        originalText: node.getTextContent(),
      };
    });
    expect(clonedItem).toEqual(sampleItem);
    expect(clonedText).toBe(originalText);
  });
});
