import { describe, it, expect } from "vitest";
import {
  ToolInvocationMessagesSchema,
  ToolMetadataSchema,
  ToolAnnotationsSchema,
} from "../shared";

describe("Schemas - ToolInvocationMessages", () => {
  it("validates correct ToolInvocationMessages", () => {
    const messages = {
      invoking: "Loading data...",
      invoked: "Data loaded successfully",
    };

    const result = ToolInvocationMessagesSchema.safeParse(messages);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(messages);
    }
  });

  it("accepts empty ToolInvocationMessages", () => {
    const messages = {};

    const result = ToolInvocationMessagesSchema.safeParse(messages);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it("accepts partial ToolInvocationMessages", () => {
    const messages = {
      invoking: "Processing...",
    };

    const result = ToolInvocationMessagesSchema.safeParse(messages);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoking).toBe("Processing...");
      expect(result.data.invoked).toBeUndefined();
    }
  });

  it("rejects messages exceeding 64 characters", () => {
    const longMessage = "a".repeat(65);
    const messages = {
      invoking: longMessage,
      invoked: "short",
    };

    const result = ToolInvocationMessagesSchema.safeParse(messages);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at most 64");
    }
  });

  it("accepts exactly 64 characters", () => {
    const exactly64 = "a".repeat(64);
    const messages = {
      invoking: exactly64,
      invoked: exactly64,
    };

    const result = ToolInvocationMessagesSchema.safeParse(messages);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoking).toBe(exactly64);
      expect(result.data.invoked).toBe(exactly64);
    }
  });
});

describe("Schemas - ToolMetadata", () => {
  it("validates correct ToolMetadata", () => {
    const metadata = {
      visibility: "public" as const,
      widgetAccessible: true,
      fileParams: ["image", "document"],
    };

    const result = ToolMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(metadata);
    }
  });

  it("accepts empty ToolMetadata", () => {
    const metadata = {};

    const result = ToolMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it("accepts partial ToolMetadata", () => {
    const metadata = {
      visibility: "private" as const,
    };

    const result = ToolMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe("private");
      expect(result.data.widgetAccessible).toBeUndefined();
      expect(result.data.fileParams).toBeUndefined();
    }
  });

  it("rejects invalid visibility enum values", () => {
    const metadata = {
      visibility: "invalid",
    };

    const result = ToolMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(false);
  });

  it("accepts empty fileParams array", () => {
    const metadata = {
      fileParams: [],
    };

    const result = ToolMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fileParams).toEqual([]);
    }
  });

  it("rejects non-string values in fileParams", () => {
    const metadata = {
      fileParams: ["valid", 123, "alsoValid"],
    };

    const result = ToolMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(false);
  });
});

describe("Schemas - ToolAnnotations", () => {
  it("validates correct ToolAnnotations", () => {
    const annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      completionMessage: "Operation completed successfully",
    };

    const result = ToolAnnotationsSchema.safeParse(annotations);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(annotations);
    }
  });

  it("accepts empty ToolAnnotations", () => {
    const annotations = {};

    const result = ToolAnnotationsSchema.safeParse(annotations);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it("accepts partial ToolAnnotations", () => {
    const annotations = {
      readOnlyHint: true,
    };

    const result = ToolAnnotationsSchema.safeParse(annotations);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.readOnlyHint).toBe(true);
      expect(result.data.destructiveHint).toBeUndefined();
      expect(result.data.completionMessage).toBeUndefined();
    }
  });

  it("validates boolean readOnlyHint", () => {
    const annotations = {
      readOnlyHint: true,
    };

    const result = ToolAnnotationsSchema.safeParse(annotations);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.readOnlyHint).toBe(true);
    }
  });

  it("validates boolean destructiveHint", () => {
    const annotations = {
      destructiveHint: true,
    };

    const result = ToolAnnotationsSchema.safeParse(annotations);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.destructiveHint).toBe(true);
    }
  });

  it("validates string completionMessage", () => {
    const annotations = {
      completionMessage: "Task completed",
    };

    const result = ToolAnnotationsSchema.safeParse(annotations);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completionMessage).toBe("Task completed");
    }
  });

  it("accepts empty string completionMessage", () => {
    const annotations = {
      completionMessage: "",
    };

    const result = ToolAnnotationsSchema.safeParse(annotations);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completionMessage).toBe("");
    }
  });
});
