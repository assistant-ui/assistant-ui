---
date: 2025-11-17T00:00:00Z
researcher: Claude
git_commit: 9d026d09f168cfb6df250670c5504d8d04a629fe
branch: native_audio_video
repository: native_audio_video
topic: "Implementing Audio and Video File Upload Support"
tags: [research, codebase, attachments, audio, video, multimodal, file-upload]
status: complete
last_updated: 2025-11-17
last_updated_by: Claude
---

# Research: Implementing Audio and Video File Upload Support

**Date**: 2025-11-17T00:00:00Z
**Researcher**: Claude
**Git Commit**: 9d026d09f168cfb6df250670c5504d8d04a629fe
**Branch**: native_audio_video
**Repository**: native_audio_video

## Research Question

How can audio and video file upload support be implemented in assistant-ui? What existing patterns and infrastructure can be leveraged?

**Context**: Currently, attempting to upload files like .mp3, .mp4, etc., is blocked by internal validation logic (e.g., `isAcceptedFile` in adapters). The request is to enable native support for common audio/video formats to align with modern AI models that can process these file types.

## Summary

**Good news**: The infrastructure for audio/video file support already exists in assistant-ui! The codebase has:
- ✅ Audio message part types defined (`Unstable_AudioMessagePart`)
- ✅ File validation logic that supports wildcard MIME types (`audio/*`, `video/*`)
- ✅ Extensible adapter pattern for adding new file type handlers
- ✅ A working example (`with-ffmpeg`) that handles audio/video files
- ✅ Message rendering extension points for custom audio/video players

**What's missing**: Specific adapter implementations for audio/video files. The types and infrastructure exist, but no built-in adapters accept `audio/*` or `video/*` MIME types by default (except in the FFmpeg example).

**Recommendation**: Implement specialized `AudioAttachmentAdapter` and `VideoAttachmentAdapter` classes following existing patterns, or extend existing adapters to accept these MIME types.

## Detailed Findings

### 1. File Validation Logic

**Location**: `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/CompositeAttachmentAdapter.ts:7-48`

The `fileMatchesAccept()` function is the core validation logic. It already supports:
- Wildcard MIME types: `audio/*`, `video/*`, `image/*`
- Exact MIME types: `audio/mp3`, `video/mp4`
- File extensions: `.mp3`, `.mp4`, `.wav`
- Wildcard accept-all: `*`

```typescript
function fileMatchesAccept(
  file: { name: string; type: string },
  acceptString: string,
) {
  // Wildcard matching
  if (acceptString === "*") return true;

  const allowedTypes = acceptString.split(",").map((type) => type.trim().toLowerCase());
  const fileExtension = "." + file.name.split(".").pop()!.toLowerCase();
  const fileMimeType = file.type.toLowerCase();

  for (const type of allowedTypes) {
    // Extension matching
    if (type.startsWith(".") && type === fileExtension) return true;

    // Exact MIME type matching
    if (type.includes("/") && type === fileMimeType) return true;

    // Wildcard MIME type matching (audio/*, video/*)
    if (type.endsWith("/*")) {
      const generalType = type.split("/")[0]!;
      if (fileMimeType.startsWith(generalType + "/")) return true;
    }
  }

  return false;
}
```

**Key insight**: The validation logic is already prepared for audio/video files - it just needs adapters that specify these accept patterns.

### 2. Message Part Type System

**Location**: `packages/react/src/types/MessagePartTypes.ts`

Audio support is already defined in the type system:

```typescript
export type Unstable_AudioMessagePart = {
  readonly type: "audio";
  readonly audio: {
    readonly data: string;  // Data URL or remote URL
    readonly format: "mp3" | "wav";
  };
};

export type FileMessagePart = {
  readonly type: "file";
  readonly filename?: string;
  readonly data: string;  // Data URL or URL
  readonly mimeType: string;
};

// User messages can include audio
export type ThreadUserMessagePart =
  | TextMessagePart
  | ImageMessagePart
  | FileMessagePart
  | Unstable_AudioMessagePart;
```

**Key insight**: The type system already supports audio files with format specification. Video files could use `FileMessagePart` with appropriate MIME type, or a new `VideoMessagePart` type could be added following the same pattern.

### 3. Adapter Pattern (Extension Point)

**Interface**: `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/AttachmentAdapter.ts:39-71`

All file processing follows this interface:

```typescript
export type AttachmentAdapter = {
  /**
   * MIME type pattern for accepted file types (e.g., "image/*", "audio/*")
   */
  accept: string;

  /**
   * Processes a file when added
   * Can return Promise or AsyncGenerator for progress updates
   */
  add(state: { file: File }):
    Promise<PendingAttachment> | AsyncGenerator<PendingAttachment, void>;

  /**
   * Finalizes attachment for sending
   */
  send(attachment: PendingAttachment): Promise<CompleteAttachment>;

  /**
   * Cleanup handler
   */
  remove(attachment: Attachment): Promise<void>;
};
```

### 4. Existing Adapter Implementations (Patterns to Follow)

#### Simple Image Adapter
**Location**: `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/SimpleImageAttachmentAdapter.ts:1-49`

```typescript
export class SimpleImageAttachmentAdapter implements AttachmentAdapter {
  public accept = "image/*";

  public async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: state.file.name,
      type: "image",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "image",
          image: await getFileDataURL(attachment.file),
        },
      ],
    };
  }

  public async remove() {}
}

const getFileDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
```

**Pattern**: Convert file to data URL using FileReader API, wrap in appropriate message part type.

#### Cloud File Adapter (With Progress)
**Location**: `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/CloudFileAttachmentAdapter.ts:1-102`

```typescript
export class CloudFileAttachmentAdapter implements AttachmentAdapter {
  public accept = "*";

  public async *add({ file }: { file: File }): AsyncGenerator<PendingAttachment, void> {
    const id = crypto.randomUUID();
    const type = guessAttachmentType(file.type);

    let attachment: PendingAttachment = {
      id,
      type,
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "running", reason: "uploading", progress: 0 },
    };
    yield attachment;

    try {
      const { signedUrl, publicUrl } =
        await this.cloud.files.generatePresignedUploadUrl({
          filename: file.name,
        });

      await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      this.uploadedUrls.set(id, publicUrl);

      attachment = {
        ...attachment,
        status: { type: "requires-action", reason: "composer-send" },
      };
      yield attachment;
    } catch {
      attachment = {
        ...attachment,
        status: { type: "incomplete", reason: "error" },
      };
      yield attachment;
    }
  }

  public async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const url = this.uploadedUrls.get(attachment.id);
    if (!url) throw new Error("Attachment not uploaded");

    let content: ThreadUserMessagePart[];
    if (attachment.type === "image") {
      content = [{ type: "image", image: url, filename: attachment.name }];
    } else {
      content = [
        {
          type: "file",
          data: url,
          mimeType: attachment.contentType,
          filename: attachment.name,
        },
      ];
    }

    return {
      ...attachment,
      status: { type: "complete" },
      content,
    };
  }
}
```

**Pattern**: AsyncGenerator for progress updates during upload, URL-based file references for cloud storage.

#### FFmpeg Example (Audio/Video Support)
**Location**: `examples/with-ffmpeg/app/MyRuntimeProvider.tsx:12`

```typescript
const attachmentAdapter: AttachmentAdapter = {
  accept: "image/*,video/*,audio/*",  // ← Audio/Video already working here!
  async add({ file }) {
    return {
      id: generateId(),
      file,
      type: "file",
      name: file.name,
      contentType: file.type,
      status: { type: "requires-action", reason: "composer-send" },
    };
  },
  async send(attachment) {
    return {
      ...attachment,
      content: [
        {
          type: "text",
          text: `[User attached a file: ${attachment.name}]`,
        },
      ],
      status: { type: "complete" },
    };
  },
  async remove() {},
};
```

**Key insight**: This example shows that `audio/*` and `video/*` already work in the validation logic! The adapter just needs to specify these patterns in its `accept` string.

### 5. Composite Adapter (Routing)

**Location**: `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/CompositeAttachmentAdapter.ts:50-107`

The composite adapter routes files to appropriate handlers:

```typescript
export class CompositeAttachmentAdapter implements AttachmentAdapter {
  private _adapters: AttachmentAdapter[];
  public accept: string;

  constructor(adapters: AttachmentAdapter[]) {
    this._adapters = adapters;

    const wildcardIdx = adapters.findIndex((a) => a.accept === "*");
    if (wildcardIdx !== -1 && wildcardIdx !== adapters.length - 1) {
      throw new Error(
        "A wildcard adapter must be specified as the last adapter.",
      );
    }

    this.accept = wildcardIdx !== -1 ? "*" : adapters.map((a) => a.accept).join(",");
  }

  public add(state: { file: File }) {
    for (const adapter of this._adapters) {
      if (fileMatchesAccept(state.file, adapter.accept)) {
        return adapter.add(state);
      }
    }
    throw new Error("No matching adapter found for file");
  }
}
```

**Pattern**: Multiple adapters can be composed together. First matching adapter handles the file.

### 6. UI Integration Points

**File Input Component**: `packages/react/src/primitives/composer/ComposerAddAttachment.tsx:26-28`

```typescript
const attachmentAccept = api.composer().getState().attachmentAccept;
if (attachmentAccept !== "*") {
  input.accept = attachmentAccept;  // Sets browser file picker filter
}
```

**Drag & Drop**: `packages/react/src/primitives/composer/ComposerAttachmentDropzone.tsx:40`

```typescript
const handleDrop = useCallback(
  async (e: React.DragEvent) => {
    e.preventDefault();
    for (const file of e.dataTransfer.files) {
      await api.composer().addAttachment(file);
    }
  },
  [api],
);
```

**Key insight**: UI components automatically respect adapter accept patterns - no UI changes needed!

### 7. Message Rendering Extension Point

**Location**: `packages/react/src/primitives/message/MessageParts.tsx:218-280`

```typescript
const defaultComponents = {
  Text: () => <MessagePartPrimitiveText />,
  Image: () => <MessagePartPrimitiveImage />,
  File: () => null,
  Unstable_Audio: () => null,  // ← Extension point for custom audio player
};

const MessagePartComponent: FC<MessagePartComponentProps> = ({
  components: {
    Text = defaultComponents.Text,
    Image = defaultComponents.Image,
    File = defaultComponents.File,
    Unstable_Audio: Audio = defaultComponents.Unstable_Audio,
  } = {},
}) => {
  const part = useAssistantState(({ part }) => part);

  switch (part.type) {
    case "audio":
      return <Audio {...part} />;  // Custom audio component
    // ... other cases
  }
};
```

**Pattern**: Custom rendering components can be provided for audio/video playback.

### 8. File Type Support Summary

**Currently Built-in**:
- ✅ Images: `image/*` (all formats) - SimpleImageAttachmentAdapter
- ✅ Text: `text/plain`, `text/html`, `text/markdown`, etc. - SimpleTextAttachmentAdapter
- ✅ All files: `*` - CloudFileAttachmentAdapter

**Working in Examples**:
- ✅ Audio: `audio/*` - with-ffmpeg example
- ✅ Video: `video/*` - with-ffmpeg example

**Type Support Available**:
- ✅ Audio message parts: `Unstable_AudioMessagePart` with mp3/wav format
- ✅ Generic file parts: `FileMessagePart` with MIME type

## Architecture Insights

### 1. Adapter-Based Architecture
The system uses a **Strategy Pattern** where each adapter implements the same interface but provides different processing logic based on file type. This makes it trivial to add new file types.

### 2. Progressive Enhancement
Adapters can use:
- **Synchronous processing** (Promise-based): For simple conversions like images to data URLs
- **Asynchronous streaming** (AsyncGenerator): For long uploads with progress updates

### 3. Separation of Concerns
- **Validation**: Handled by `fileMatchesAccept()` function
- **Processing**: Handled by adapter's `add()` method
- **Finalization**: Handled by adapter's `send()` method
- **UI**: Automatically updates based on adapter configuration

### 4. Type Safety
TypeScript types ensure:
- Adapters return correct attachment structures
- Message parts match expected formats
- Status transitions are valid

## Recommended Implementation Approach

### Option 1: Simple Audio Adapter (Data URL Based)

Create `SimpleAudioAttachmentAdapter.ts`:

```typescript
export class SimpleAudioAttachmentAdapter implements AttachmentAdapter {
  public accept = "audio/*";  // Accept all audio formats

  public async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: crypto.randomUUID(),
      type: "file",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const format = this.getAudioFormat(attachment.file.type);

    if (format) {
      // Use Unstable_AudioMessagePart for mp3/wav
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "audio",
            audio: {
              data: await getFileDataURL(attachment.file),
              format,
            },
          },
        ],
      };
    } else {
      // Use generic FileMessagePart for other audio formats
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "file",
            data: await getFileDataURL(attachment.file),
            mimeType: attachment.contentType,
            filename: attachment.name,
          },
        ],
      };
    }
  }

  public async remove() {}

  private getAudioFormat(mimeType: string): "mp3" | "wav" | null {
    if (mimeType === "audio/mpeg" || mimeType === "audio/mp3") return "mp3";
    if (mimeType === "audio/wav" || mimeType === "audio/x-wav") return "wav";
    return null;
  }
}
```

### Option 2: Simple Video Adapter (Data URL Based)

Create `SimpleVideoAttachmentAdapter.ts`:

```typescript
export class SimpleVideoAttachmentAdapter implements AttachmentAdapter {
  public accept = "video/*";  // Accept all video formats

  public async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: crypto.randomUUID(),
      type: "file",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "file",
          data: await getFileDataURL(attachment.file),
          mimeType: attachment.contentType,
          filename: attachment.name,
        },
      ],
    };
  }

  public async remove() {}
}
```

### Option 3: Extend Existing Adapters

Modify `SimpleImageAttachmentAdapter` to accept more MIME types:

```typescript
export class SimpleMediaAttachmentAdapter implements AttachmentAdapter {
  public accept = "image/*,audio/*,video/*";  // Extended support

  // ... rest of implementation
}
```

Or modify `CloudFileAttachmentAdapter`'s type guessing:

```typescript
const guessAttachmentType = (contentType: string): AttachmentType => {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("text/")) return "document";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  return "file";
};
```

### Option 4: Use Composite Pattern

Combine multiple adapters:

```typescript
import { CompositeAttachmentAdapter } from "@assistant-ui/react";
import { SimpleImageAttachmentAdapter } from "@assistant-ui/react";
import { SimpleAudioAttachmentAdapter } from "./SimpleAudioAttachmentAdapter";
import { SimpleVideoAttachmentAdapter } from "./SimpleVideoAttachmentAdapter";

const attachmentAdapter = new CompositeAttachmentAdapter([
  new SimpleImageAttachmentAdapter(),
  new SimpleAudioAttachmentAdapter(),
  new SimpleVideoAttachmentAdapter(),
  // Fallback for other files
  new CloudFileAttachmentAdapter(cloud),
]);
```

## Implementation Checklist

- [ ] Create `SimpleAudioAttachmentAdapter` class
  - [ ] Set `accept = "audio/*"`
  - [ ] Implement `add()` method
  - [ ] Implement `send()` method with format detection (mp3/wav)
  - [ ] Use `Unstable_AudioMessagePart` for supported formats
  - [ ] Fallback to `FileMessagePart` for other audio formats

- [ ] Create `SimpleVideoAttachmentAdapter` class
  - [ ] Set `accept = "video/*"`
  - [ ] Implement `add()` method
  - [ ] Implement `send()` method using `FileMessagePart`
  - [ ] Consider adding `VideoMessagePart` type if needed

- [ ] Optional: Create custom rendering components
  - [ ] Audio player component for `Unstable_AudioMessagePart`
  - [ ] Video player component for video files
  - [ ] Register components with `MessagePartComponent`

- [ ] Add tests
  - [ ] Test file validation for audio/video MIME types
  - [ ] Test file extension matching (.mp3, .mp4, etc.)
  - [ ] Test data URL conversion
  - [ ] Test message part generation

- [ ] Update documentation
  - [ ] Add audio/video examples to Attachments.mdx
  - [ ] Document supported audio formats (mp3, wav, etc.)
  - [ ] Document supported video formats
  - [ ] Show custom player component examples

- [ ] Consider file size limits
  - [ ] Audio/video files can be large
  - [ ] May need chunked upload for cloud adapter
  - [ ] Consider compression/transcoding options

## Code References

- `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/CompositeAttachmentAdapter.ts:7-48` - File validation logic
- `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/AttachmentAdapter.ts:39-71` - Adapter interface
- `packages/react/src/types/MessagePartTypes.ts` - Audio message part types
- `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/SimpleImageAttachmentAdapter.ts` - Reference implementation
- `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/CloudFileAttachmentAdapter.ts` - Cloud upload pattern
- `examples/with-ffmpeg/app/MyRuntimeProvider.tsx:12` - Working audio/video example
- `packages/react/src/primitives/message/MessageParts.tsx:218-280` - Rendering extension point

## Historical Context (from notes/)

- `notes/research/voice-mode-support-analysis.md` - Analysis of voice mode support; documents that TTS is implemented but speech recognition is not
- `notes/plans/phase3_advanced_feature_integration.md` - Phase 3 integration plan includes attachment handling with proper types
- `notes/plans/mastra_integration_requirements.md` - References adapter pattern for attachment handling

## Related Research

- Voice mode implementation (branch: `aui-19-voice-mode`)
- FFmpeg integration example for media processing
- Real-time audio streaming (future work)

## Open Questions

1. **File Size Limits**: Should there be maximum file size restrictions for audio/video?
   - Recommendation: Add configurable size limits (e.g., 10MB for data URLs, unlimited for cloud upload)

2. **Format Support**: Which specific audio/video formats should be prioritized?
   - Audio: MP3, WAV, OGG, M4A, FLAC
   - Video: MP4, WebM, MOV, AVI
   - Recommendation: Start with MP3/WAV for audio, MP4/WebM for video

3. **Processing**: Should audio/video files be transcoded or processed before sending?
   - Recommendation: Keep adapters simple initially, allow custom processing via FFmpeg-style tools

4. **Rendering**: What default rendering components should be provided?
   - Recommendation: Basic HTML5 `<audio>` and `<video>` players as defaults, allow customization

5. **Cloud vs Local**: Should audio/video default to cloud upload or data URLs?
   - Recommendation: Cloud for production (file size), data URLs for development/testing

6. **Type Stability**: Should `Unstable_AudioMessagePart` be stabilized?
   - Current status: Marked as unstable
   - Recommendation: Stabilize once audio adapter is implemented and tested

## Next Steps

1. Implement `SimpleAudioAttachmentAdapter` following the pattern of `SimpleImageAttachmentAdapter`
2. Implement `SimpleVideoAttachmentAdapter` following the same pattern
3. Add tests to verify audio/video file validation works correctly
4. Update documentation with audio/video upload examples
5. Consider creating custom rendering components for better UX
6. Evaluate file size handling and compression strategies

## Conclusion

**The infrastructure for audio/video file uploads already exists in assistant-ui.** The validation logic supports `audio/*` and `video/*` wildcards, the type system includes audio message parts, and the adapter pattern is designed for extensibility.

The main gap is the absence of built-in adapters that accept these MIME types. Adding `SimpleAudioAttachmentAdapter` and `SimpleVideoAttachmentAdapter` following existing patterns would enable full audio/video support with minimal code changes.

The FFmpeg example proves this works - it's just a matter of making it available as a built-in feature rather than requiring custom implementation.
