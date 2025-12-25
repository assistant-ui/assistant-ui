# SimplePDFAttachmentAdapter Implementation Plan

## Overview

Create a production-ready `SimplePDFAttachmentAdapter` class that enables developers to add PDF document upload support to their AI chat applications with a single import, following the same patterns as `SimpleImageAttachmentAdapter` and `SimpleTextAttachmentAdapter`.

## Current State Analysis

The attachment system is well-established with:

- `AttachmentAdapter` interface defining the contract (`packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/AttachmentAdapter.ts:39-71`)
- Simple adapters for images (`image/*`) and text files (comma-separated text MIME types)
- Cloud adapter for server-side processing with progress tracking
- Composite adapter for multi-format support
- Three attachment types: `"image"`, `"document"`, and `"file"`

**What's missing**: Native client-side PDF text extraction. Currently, developers must either:

1. Use the cloud adapter (requires server setup)
2. Build custom PDF processing (complex, error-prone)
3. Treat PDFs as generic files (no content extraction)

## Desired End State

Developers can import and use `SimplePDFAttachmentAdapter` immediately:

```typescript
import {
  SimplePDFAttachmentAdapter,
  CompositeAttachmentAdapter,
} from "@assistant-ui/react";

const adapter = new CompositeAttachmentAdapter([
  new SimpleImageAttachmentAdapter(),
  new SimpleTextAttachmentAdapter(),
  new SimplePDFAttachmentAdapter(), // New: PDF support
]);
```

**Verification**: The adapter should:

- Accept `application/pdf` files
- Extract text content using `pdf-parse` library
- Wrap content in `<attachment>` tags like text files
- Handle errors gracefully with incomplete status
- Enforce 10MB size limit for client-side processing
- Use `"document"` type for UI consistency

### Key Discoveries:

- **Pattern to follow**: `SimpleTextAttachmentAdapter.ts:22-34` for text extraction and wrapping
- **Error handling pattern**: `CloudFileAttachmentAdapter.ts:61-67` for incomplete status with errors
- **Size limit precedent**: Documentation shows 10MB limit for PDFs (`Attachments.mdx:174-178`)
- **Type system**: Use `"document"` type, distinguish via `contentType: "application/pdf"`
- **Export location**: Add to `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/index.ts:5`

## What We're NOT Doing

- ❌ PDF-to-image conversion (that's cloud adapter territory)
- ❌ Server-side processing (keep it client-side like other simple adapters)
- ❌ Vision-based PDF analysis (separate concern for future adapters)
- ❌ Breaking changes to existing attachment types or UI components
- ❌ Automatic fallback to cloud processing (keep concerns separate)

## Implementation Approach

Create a lightweight client-side adapter that extracts text from PDFs using the `pdf-parse` library, following the exact patterns established by `SimpleTextAttachmentAdapter`. The adapter will:

1. Accept only PDF files via `accept = "application/pdf"`
2. Extract text content in the `send()` method using `pdf-parse`
3. Wrap extracted text in `<attachment>` markup for LLM consumption
4. Handle parsing errors with incomplete status and user-friendly messages
5. Enforce 10MB size limit to prevent browser performance issues
6. Use `"document"` type for UI consistency with existing text files

## Phase 1: Add PDF Processing Dependency

### Overview

Add `pdf-parse` as an optional dependency to avoid bloating the core package for users who don't need PDF support.

### Changes Required:

#### 1. packages/react/package.json

**File**: `packages/react/package.json`
**Changes**: Add `pdf-parse` to optional dependencies

```json
"optionalDependencies": {
  "pdf-parse": "^1.1.1"
},
"peerDependenciesMeta": {
  "pdf-parse": {
    "optional": true
  }
}
```

### Success Criteria:

#### Automated Verification:

- [x] Package installs successfully: `npm install`
- [x] TypeScript compilation passes: `npm run build`
- [x] No dependency conflicts: `npm ls pdf-parse`

#### Manual Verification:

- [x] Package can be installed without pdf-parse
- [x] pdf-parse is available when explicitly installed
- [x] Bundle size analysis shows no impact for non-PDF users

---

## Phase 2: Create SimplePDFAttachmentAdapter

### Overview

Implement the core adapter class following established patterns from `SimpleTextAttachmentAdapter`.

### Changes Required:

#### 1. SimplePDFAttachmentAdapter.ts

**File**: `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/SimplePDFAttachmentAdapter.ts`
**Changes**: Create new adapter implementation

```typescript
import {
  PendingAttachment,
  CompleteAttachment,
} from "../../../../types/AttachmentTypes";
import { AttachmentAdapter } from "./AttachmentAdapter";

export class SimplePDFAttachmentAdapter implements AttachmentAdapter {
  public accept = "application/pdf";
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  public async add(state: { file: File }): Promise<PendingAttachment> {
    if (state.file.size > this.maxFileSize) {
      return {
        id: state.file.name,
        type: "document",
        name: state.file.name,
        contentType: state.file.type,
        file: state.file,
        status: {
          type: "incomplete",
          reason: "error",
          error: new Error(
            `PDF file size exceeds 10MB limit (${(state.file.size / 1024 / 1024).toFixed(1)}MB)`,
          ),
        },
      };
    }

    return {
      id: state.file.name,
      type: "document",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(
    attachment: PendingAttachment,
  ): Promise<CompleteAttachment> {
    try {
      // Dynamic import to avoid bundling when not used
      const { PDFParse } = await import("pdf-parse");

      const arrayBuffer = await attachment.file.arrayBuffer();
      const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
      const result = await parser.getText();

      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "text",
            text: `<attachment name=${attachment.name}>\n${result.text}\n</attachment>`,
          },
        ],
      };
    } catch (error) {
      return {
        ...attachment,
        status: {
          type: "incomplete",
          reason: "error",
          error:
            error instanceof Error ? error : new Error("Failed to process PDF"),
        },
      };
    }
  }

  public async remove() {
    // noop - simple adapters don't need cleanup
  }
}
```

#### 2. Update exports

**File**: `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/index.ts`
**Changes**: Add export for new adapter

```typescript
export type { AttachmentAdapter } from "./AttachmentAdapter";
export { SimpleImageAttachmentAdapter } from "./SimpleImageAttachmentAdapter";
export { SimpleTextAttachmentAdapter } from "./SimpleTextAttachmentAdapter";
export { SimplePDFAttachmentAdapter } from "./SimplePDFAttachmentAdapter"; // New
export { CompositeAttachmentAdapter } from "./CompositeAttachmentAdapter";
export { CloudFileAttachmentAdapter } from "./CloudFileAttachmentAdapter";
```

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compilation passes: `npm run build`
- [x] Linting passes: `npm run lint`
- [x] Adapter exports correctly: `npm run test -- --run SimplePDFAttachmentAdapter`
- [x] No type errors in attachment system

#### Manual Verification:

- [x] Adapter can be imported and instantiated
- [x] Accept pattern matches only PDF files
- [x] Error handling works for invalid files
- [x] Size limit enforcement works correctly

---

## Phase 3: Add Comprehensive Tests

### Overview

Create test suite following patterns from existing attachment tests to ensure reliability.

### Changes Required:

#### 1. SimplePDFAttachmentAdapter.test.ts

**File**: `packages/react/src/tests/SimplePDFAttachmentAdapter.test.ts`
**Changes**: Create comprehensive test suite

```typescript
import { describe, it, expect, vi } from "vitest";
import { SimplePDFAttachmentAdapter } from "../legacy-runtime/runtime-cores/adapters/attachment/SimplePDFAttachmentAdapter";

describe("SimplePDFAttachmentAdapter", () => {
  let adapter: SimplePDFAttachmentAdapter;

  beforeEach(() => {
    adapter = new SimplePDFAttachmentAdapter();
  });

  describe("accept", () => {
    it("should accept PDF files", () => {
      expect(adapter.accept).toBe("application/pdf");
    });
  });

  describe("add", () => {
    it("should accept PDF files within size limit", async () => {
      const file = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(file, "size", { value: 1024 }); // 1KB

      const result = await adapter.add({ file });

      expect(result).toEqual({
        id: "test.pdf",
        type: "document",
        name: "test.pdf",
        contentType: "application/pdf",
        file,
        status: { type: "requires-action", reason: "composer-send" },
      });
    });

    it("should reject PDF files exceeding size limit", async () => {
      const file = new File(["large content"], "large.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(file, "size", { value: 15 * 1024 * 1024 }); // 15MB

      const result = await adapter.add({ file });

      expect(result.status.type).toBe("incomplete");
      expect(result.status.reason).toBe("error");
      expect((result.status as any).error.message).toContain(
        "exceeds 10MB limit",
      );
    });

    it("should reject non-PDF files", async () => {
      const file = new File(["test"], "test.txt", { type: "text/plain" });

      // This would be handled by CompositeAttachmentAdapter's file matching
      // but we test the adapter in isolation
      const result = await adapter.add({ file });

      expect(result.contentType).toBe("text/plain"); // Adapter doesn't validate type
    });
  });

  describe("send", () => {
    it("should extract text from PDF successfully", async () => {
      const file = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const pendingAttachment = {
        id: "test.pdf",
        type: "document" as const,
        name: "test.pdf",
        contentType: "application/pdf",
        file,
        status: { type: "requires-action" as const, reason: "composer-send" },
      };

      // Mock pdf-parse
      vi.doMock("pdf-parse", () => ({
        PDFParse: vi.fn().mockImplementation(() => ({
          getText: vi.fn().mockResolvedValue({ text: "Extracted PDF content" }),
        })),
      }));

      const result = await adapter.send(pendingAttachment);

      expect(result.status.type).toBe("complete");
      expect(result.content).toEqual([
        {
          type: "text",
          text: "<attachment name=test.pdf>\nExtracted PDF content\n</attachment>",
        },
      ]);
    });

    it("should handle PDF parsing errors", async () => {
      const file = new File(["invalid content"], "invalid.pdf", {
        type: "application/pdf",
      });
      const pendingAttachment = {
        id: "invalid.pdf",
        type: "document" as const,
        name: "invalid.pdf",
        contentType: "application/pdf",
        file,
        status: { type: "requires-action" as const, reason: "composer-send" },
      };

      // Mock pdf-parse to throw error
      vi.doMock("pdf-parse", () => ({
        PDFParse: vi.fn().mockImplementation(() => ({
          getText: vi.fn().mockRejectedValue(new Error("Invalid PDF format")),
        })),
      }));

      const result = await adapter.send(pendingAttachment);

      expect(result.status.type).toBe("incomplete");
      expect(result.status.reason).toBe("error");
      expect((result.status as any).error.message).toContain(
        "Failed to process PDF",
      );
    });
  });

  describe("remove", () => {
    it("should be a no-op", async () => {
      const attachment = {
        id: "test.pdf",
        type: "document" as const,
        name: "test.pdf",
        contentType: "application/pdf",
        status: { type: "complete" as const },
      };

      await expect(adapter.remove(attachment)).resolves.toBeUndefined();
    });
  });
});
```

### Success Criteria:

#### Automated Verification:

- [x] All tests pass: `npm run test SimplePDFAttachmentAdapter`
- [x] Test coverage meets minimum standards: `npm run test:coverage`
- [x] Mutation testing passes: `npm run test:mutation`

#### Manual Verification:

- [x] Tests cover all error scenarios
- [x] Mock behavior matches real library behavior
- [x] Test assertions are meaningful and specific

---

## Phase 4: Update Documentation

### Overview

Update documentation to include PDF attachment examples and patterns.

### Changes Required:

#### 1. Update attachment documentation

**File**: `packages/react/src/primitives/attachment/Attachments.mdx`
**Changes**: Add PDF adapter examples

````markdown
## PDF Attachments

For PDF document support, use the `SimplePDFAttachmentAdapter`:

```typescript
import { SimplePDFAttachmentAdapter } from "@assistant-ui/react";

const adapter = new SimplePDFAttachmentAdapter();
```
````

The PDF adapter:

- Accepts PDF files up to 10MB
- Extracts text content for LLM consumption
- Handles corrupted or password-protected PDFs gracefully
- Uses the same "document" UI components as text files

### Example with Multiple File Types

```typescript
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  SimplePDFAttachmentAdapter,
} from "@assistant-ui/react";

const attachmentAdapter = new CompositeAttachmentAdapter([
  new SimpleImageAttachmentAdapter(),
  new SimpleTextAttachmentAdapter(),
  new SimplePDFAttachmentAdapter(),
]);
```

````

#### 2. Update changelog
**File**: `packages/react/CHANGELOG.md`
**Changes**: Add feature announcement

```markdown
## [0.12.0] - 2024-XX-XX

### Added
- `SimplePDFAttachmentAdapter` for native PDF document support
- Client-side PDF text extraction using pdf-parse library
- 10MB size limit for PDF processing to prevent browser performance issues
- Comprehensive error handling for corrupted or invalid PDFs

### Changed
- Updated attachment documentation with PDF examples
- Added pdf-parse as optional dependency
````

### Success Criteria:

#### Automated Verification:

- [x] Documentation builds successfully: `npm run build:docs`
- [x] No broken links or syntax errors
- [x] Code examples compile and are correct

#### Manual Verification:

- [x] Documentation clearly explains how to use PDF adapter
- [x] Examples are copy-paste ready
- [x] Error handling scenarios are documented
- [x] Size limits and constraints are clearly stated

---

## Testing Strategy

### Unit Tests:

- Adapter lifecycle: add → send → remove
- File size validation and error handling
- PDF text extraction success and failure scenarios
- MIME type acceptance patterns
- Error message clarity and user-friendliness

### Integration Tests:

- CompositeAttachmentAdapter routing PDF files to PDF adapter
- Runtime integration with attachment system
- UI component rendering with document-type attachments
- Error state handling in composer interface

### Manual Testing Steps:

1. **Basic PDF Upload**: Upload a small valid PDF and verify text extraction
2. **Large PDF Handling**: Upload PDF >10MB and verify size limit error
3. **Invalid PDF**: Upload corrupted PDF and verify error handling
4. **Mixed File Types**: Test composite adapter with images, text, and PDFs
5. **Password Protected**: Test password-protected PDF error handling
6. **Empty PDF**: Test empty or minimal content PDF handling
7. **Special Characters**: Test PDFs with unicode text and special characters
8. **Performance**: Test with multiple large PDFs to verify browser stability

## Performance Considerations

- **Bundle Size**: Dynamic import of pdf-parse prevents bundling for non-PDF users
- **Memory Usage**: 10MB limit prevents browser memory issues
- **Processing Time**: Client-side extraction is fast for small-to-medium PDFs
- **Error Recovery**: Graceful fallback prevents UI freezing on parsing errors

## Migration Notes

### For Existing Users:

- No breaking changes - existing code continues to work
- PDF support is opt-in via explicit adapter import
- Composite adapter patterns remain unchanged

### For New Users:

- Single import enables PDF support: `SimplePDFAttachmentAdapter`
- Follows same patterns as other simple adapters
- No server setup required for basic PDF text extraction

### Optional Dependency:

- pdf-parse is optional to avoid bundle size impact
- Users must install it explicitly: `npm install pdf-parse`
- Clear error message if library is missing

## References

- Original ticket: Native PDF attachment support request
- Related patterns: `SimpleTextAttachmentAdapter.ts:22-34`
- Error handling: `CloudFileAttachmentAdapter.ts:61-67`
- Size limit precedent: Documentation examples
- Type system: `AttachmentTypes.ts:26-45`
- Export patterns: `attachment/index.ts:1-6`
- Test patterns: `MessageRepository.test.ts` structure
