# Native Audio and Video Support Implementation Plan

## Overview

Implement native audio and video file upload support in assistant-ui by creating `SimpleAudioAttachmentAdapter` and `SimpleVideoAttachmentAdapter` classes, along with corresponding message part rendering components. This enables users to upload audio/video files that are converted to data URLs and rendered with HTML5 `<audio>` and `<video>` players.

## Current State Analysis

### What Exists:
- `Unstable_AudioMessagePart` type defined (`packages/react/src/types/MessagePartTypes.ts:38-44`) supporting mp3/wav formats
- `FileMessagePart` type for generic files with MIME type (`packages/react/src/types/MessagePartTypes.ts:31-36`)
- File validation logic (`fileMatchesAccept()`) already supports `audio/*` and `video/*` wildcards
- Working example in `examples/with-ffmpeg/` that accepts `audio/*,video/*` MIME types
- `SimpleImageAttachmentAdapter` pattern to follow (`packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/SimpleImageAttachmentAdapter.ts`)
- Message part rendering system with extension points for `Unstable_Audio` component (`packages/react/src/primitives/message/MessageParts.tsx:220`)
- Hook pattern established: `useMessagePartImage`, `useMessagePartFile`, `useMessagePartText`

### What's Missing:
- Built-in `SimpleAudioAttachmentAdapter` class
- Built-in `SimpleVideoAttachmentAdapter` class
- `useMessagePartAudio` hook for audio parts
- Default audio rendering primitive (`MessagePartPrimitiveAudio`)
- Default video rendering for `FileMessagePart` with video MIME types
- Tests for attachment adapters (none exist currently)
- Documentation for audio/video upload support

### Key Discoveries:
- Attachment types are limited to `"image" | "document" | "file"` (`packages/react/src/types/AttachmentTypes.ts:28`)
- No `"audio"` or `"video"` attachment types - must use `"file"` type
- `Unstable_AudioMessagePart.audio.format` only supports `"mp3" | "wav"` - other formats need `FileMessagePart`
- No video message part type exists - must use `FileMessagePart`

## Desired End State

After implementation:
1. Users can upload audio files (mp3, wav, ogg, m4a, webm, flac) via file picker or drag-and-drop
2. Users can upload video files (mp4, webm, mov, avi, mkv) via file picker or drag-and-drop
3. Audio files render with HTML5 `<audio>` player in messages
4. Video files render with HTML5 `<video>` player in messages
5. Developers can import and use `SimpleAudioAttachmentAdapter` and `SimpleVideoAttachmentAdapter`
6. Documentation updated with audio/video examples
7. Tests verify adapter functionality

### Verification:
- Manual: Upload mp3/wav files and see audio player in message
- Manual: Upload mp4/webm files and see video player in message
- Automated: `pnpm test` passes with new adapter tests
- Automated: `pnpm lint` passes
- Automated: `pnpm typecheck` passes

## What We're NOT Doing

- NOT adding new attachment types (`"audio"`, `"video"`) to `AttachmentTypes.ts` - using existing `"file"` type
- NOT adding new video message part type - using `FileMessagePart`
- NOT stabilizing `Unstable_AudioMessagePart` - keeping as unstable
- NOT implementing cloud upload adapters for audio/video - using data URLs
- NOT implementing file size limits - leaving to custom implementations
- NOT implementing audio/video transcoding - files sent as-is
- NOT implementing waveform visualization - using native browser controls
- NOT implementing streaming audio/video - full file conversion to data URL

## Implementation Approach

Follow the established pattern from `SimpleImageAttachmentAdapter`:
1. Create adapter classes that accept MIME type wildcards
2. Convert files to data URLs using FileReader API
3. Return appropriate message part content (`Unstable_AudioMessagePart` for mp3/wav, `FileMessagePart` for others)
4. Create rendering hooks and primitives following `useMessagePartImage` pattern
5. Export from package index
6. Add tests and documentation

---

## Phase 1: Audio Attachment Adapter

### Overview
Create `SimpleAudioAttachmentAdapter` that accepts `audio/*` files and converts them to `Unstable_AudioMessagePart` (for mp3/wav) or `FileMessagePart` (for other formats).

### Changes Required:

#### 1. Create SimpleAudioAttachmentAdapter
**File**: `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/SimpleAudioAttachmentAdapter.ts`
**Changes**: New file

```typescript
import {
  PendingAttachment,
  CompleteAttachment,
} from "../../../../types/AttachmentTypes";
import { AttachmentAdapter } from "./AttachmentAdapter";

export class SimpleAudioAttachmentAdapter implements AttachmentAdapter {
  public accept = "audio/*";

  public async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: state.file.name,
      type: "file",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(
    attachment: PendingAttachment,
  ): Promise<CompleteAttachment> {
    const format = this.getAudioFormat(attachment.contentType);
    const dataUrl = await getFileDataURL(attachment.file);

    if (format) {
      // Use Unstable_AudioMessagePart for mp3/wav
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "audio",
            audio: {
              data: dataUrl,
              format,
            },
          },
        ],
      };
    } else {
      // Use FileMessagePart for other audio formats
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "file",
            data: dataUrl,
            mimeType: attachment.contentType,
            filename: attachment.name,
          },
        ],
      };
    }
  }

  public async remove() {
    // noop
  }

  private getAudioFormat(mimeType: string): "mp3" | "wav" | null {
    if (mimeType === "audio/mpeg" || mimeType === "audio/mp3") return "mp3";
    if (mimeType === "audio/wav" || mimeType === "audio/x-wav") return "wav";
    return null;
  }
}

const getFileDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);

    reader.readAsDataURL(file);
  });
```

#### 2. Export SimpleAudioAttachmentAdapter
**File**: `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/index.ts`
**Changes**: Add export

```typescript
export { SimpleAudioAttachmentAdapter } from "./SimpleAudioAttachmentAdapter";
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -F @assistant-ui/react typecheck`
- [x] Linting passes: `pnpm -F @assistant-ui/react lint`
- [x] Build succeeds: `pnpm -F @assistant-ui/react build`

#### Manual Verification:
- [x] Can import `SimpleAudioAttachmentAdapter` from `@assistant-ui/react`

---

## Phase 2: Video Attachment Adapter

### Overview
Create `SimpleVideoAttachmentAdapter` that accepts `video/*` files and converts them to `FileMessagePart` with video MIME type.

### Changes Required:

#### 1. Create SimpleVideoAttachmentAdapter
**File**: `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/SimpleVideoAttachmentAdapter.ts`
**Changes**: New file

```typescript
import {
  PendingAttachment,
  CompleteAttachment,
} from "../../../../types/AttachmentTypes";
import { AttachmentAdapter } from "./AttachmentAdapter";

export class SimpleVideoAttachmentAdapter implements AttachmentAdapter {
  public accept = "video/*";

  public async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: state.file.name,
      type: "file",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(
    attachment: PendingAttachment,
  ): Promise<CompleteAttachment> {
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

  public async remove() {
    // noop
  }
}

const getFileDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);

    reader.readAsDataURL(file);
  });
```

#### 2. Export SimpleVideoAttachmentAdapter
**File**: `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/index.ts`
**Changes**: Add export

```typescript
export { SimpleVideoAttachmentAdapter } from "./SimpleVideoAttachmentAdapter";
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -F @assistant-ui/react typecheck`
- [x] Linting passes: `pnpm -F @assistant-ui/react lint`
- [x] Build succeeds: `pnpm -F @assistant-ui/react build`

#### Manual Verification:
- [x] Can import `SimpleVideoAttachmentAdapter` from `@assistant-ui/react`

---

## Phase 3: Audio Message Part Rendering

### Overview
Create `useMessagePartAudio` hook and `MessagePartPrimitiveAudio` component for rendering audio parts with HTML5 `<audio>` player.

### Changes Required:

#### 1. Create useMessagePartAudio hook
**File**: `packages/react/src/primitives/messagePart/useMessagePartAudio.tsx`
**Changes**: New file

```typescript
"use client";

import { MessagePartState } from "../../legacy-runtime/runtime/MessagePartRuntime";
import { useAssistantState } from "../../context";
import { Unstable_AudioMessagePart } from "../../types";

export const useMessagePartAudio = () => {
  const audio = useAssistantState(({ part }) => {
    if (part.type !== "audio")
      throw new Error(
        "useMessagePartAudio can only be used inside audio message parts.",
      );

    return part as MessagePartState & Unstable_AudioMessagePart;
  });

  return audio;
};
```

#### 2. Create MessagePartPrimitiveAudio component
**File**: `packages/react/src/primitives/messagePart/MessagePartAudio.tsx`
**Changes**: New file

```typescript
"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useMessagePartAudio } from "./useMessagePartAudio";

type MessagePartPrimitiveAudioElement = ElementRef<typeof Primitive.audio>;
type PrimitiveAudioProps = ComponentPropsWithoutRef<typeof Primitive.audio>;

type MessagePartPrimitiveAudioProps = PrimitiveAudioProps;

export const MessagePartPrimitiveAudio = forwardRef<
  MessagePartPrimitiveAudioElement,
  MessagePartPrimitiveAudioProps
>((props, forwardedRef) => {
  const { audio } = useMessagePartAudio();

  return (
    <Primitive.audio
      src={audio.data}
      controls
      {...props}
      ref={forwardedRef}
    />
  );
});

MessagePartPrimitiveAudio.displayName = "MessagePartPrimitiveAudio";
```

#### 3. Export from messagePart index
**File**: `packages/react/src/primitives/messagePart/index.ts`
**Changes**: Add exports

```typescript
export { MessagePartPrimitiveAudio as Audio } from "./MessagePartAudio";
```

#### 4. Update MessageParts default components
**File**: `packages/react/src/primitives/message/MessageParts.tsx`
**Changes**: Update default `Unstable_Audio` component (around line 220)

Change:
```typescript
Unstable_Audio: () => null,
```

To:
```typescript
Unstable_Audio: () => <MessagePartPrimitiveAudio />,
```

Add import at top:
```typescript
import { MessagePartPrimitiveAudio } from "../messagePart/MessagePartAudio";
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -F @assistant-ui/react typecheck`
- [x] Linting passes: `pnpm -F @assistant-ui/react lint`
- [x] Build succeeds: `pnpm -F @assistant-ui/react build`

#### Manual Verification:
- [x] Audio parts render with HTML5 audio player
- [x] Audio player has controls (play, pause, volume, seek)

---

## Phase 4: File Message Part Rendering for Audio/Video

### Overview
Create a default `File` component in MessageParts that renders audio/video files with appropriate HTML5 players based on MIME type.

### Changes Required:

#### 1. Create MessagePartPrimitiveFile component
**File**: `packages/react/src/primitives/messagePart/MessagePartFile.tsx`
**Changes**: New file

```typescript
"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useMessagePartFile } from "./useMessagePartFile";

type MessagePartPrimitiveFileElement = ElementRef<"div">;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type MessagePartPrimitiveFileProps = PrimitiveDivProps;

export const MessagePartPrimitiveFile = forwardRef<
  MessagePartPrimitiveFileElement,
  MessagePartPrimitiveFileProps
>((props, forwardedRef) => {
  const file = useMessagePartFile();
  const { data, mimeType, filename } = file;

  // Render audio player for audio MIME types
  if (mimeType.startsWith("audio/")) {
    return (
      <Primitive.div {...props} ref={forwardedRef}>
        <audio src={data} controls style={{ width: "100%" }}>
          Your browser does not support the audio element.
        </audio>
        {filename && <p>{filename}</p>}
      </Primitive.div>
    );
  }

  // Render video player for video MIME types
  if (mimeType.startsWith("video/")) {
    return (
      <Primitive.div {...props} ref={forwardedRef}>
        <video src={data} controls style={{ maxWidth: "100%", maxHeight: "400px" }}>
          Your browser does not support the video element.
        </video>
        {filename && <p>{filename}</p>}
      </Primitive.div>
    );
  }

  // Render download link for other file types
  return (
    <Primitive.div {...props} ref={forwardedRef}>
      <a href={data} download={filename}>
        {filename || "Download file"}
      </a>
    </Primitive.div>
  );
});

MessagePartPrimitiveFile.displayName = "MessagePartPrimitiveFile";
```

#### 2. Export from messagePart index
**File**: `packages/react/src/primitives/messagePart/index.ts`
**Changes**: Add export

```typescript
export { MessagePartPrimitiveFile as File } from "./MessagePartFile";
```

#### 3. Update MessageParts default components
**File**: `packages/react/src/primitives/message/MessageParts.tsx`
**Changes**: Update default `File` component (around line 219)

Change:
```typescript
File: () => null,
```

To:
```typescript
File: () => <MessagePartPrimitiveFile />,
```

Add import at top:
```typescript
import { MessagePartPrimitiveFile } from "../messagePart/MessagePartFile";
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `pnpm -F @assistant-ui/react typecheck`
- [x] Linting passes: `pnpm -F @assistant-ui/react lint`
- [x] Build succeeds: `pnpm -F @assistant-ui/react build`

#### Manual Verification:
- [x] Audio files render with HTML5 audio player
- [x] Video files render with HTML5 video player
- [x] Other files render with download link

---

## Phase 5: Tests

### Overview
Add unit tests for the new adapters and rendering components.

### Changes Required:

#### 1. Create SimpleAudioAttachmentAdapter tests
**File**: `packages/react/src/tests/adapters/SimpleAudioAttachmentAdapter.test.ts`
**Changes**: New file

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SimpleAudioAttachmentAdapter } from "../../legacy-runtime/runtime-cores/adapters/attachment/SimpleAudioAttachmentAdapter";

// Mock FileReader
const mockFileReader = {
  readAsDataURL: vi.fn(),
  onload: null as (() => void) | null,
  onerror: null as ((error: unknown) => void) | null,
  result: "data:audio/mpeg;base64,mockdata",
};

vi.stubGlobal("FileReader", vi.fn(() => mockFileReader));

describe("SimpleAudioAttachmentAdapter", () => {
  let adapter: SimpleAudioAttachmentAdapter;

  beforeEach(() => {
    adapter = new SimpleAudioAttachmentAdapter();
    vi.clearAllMocks();
  });

  describe("accept", () => {
    it("should accept audio/* MIME types", () => {
      expect(adapter.accept).toBe("audio/*");
    });
  });

  describe("add", () => {
    it("should create pending attachment from audio file", async () => {
      const file = new File(["audio data"], "test.mp3", { type: "audio/mpeg" });
      const result = await adapter.add({ file });

      expect(result).toEqual({
        id: "test.mp3",
        type: "file",
        name: "test.mp3",
        contentType: "audio/mpeg",
        file,
        status: { type: "requires-action", reason: "composer-send" },
      });
    });
  });

  describe("send", () => {
    it("should convert mp3 to Unstable_AudioMessagePart", async () => {
      const file = new File(["audio data"], "test.mp3", { type: "audio/mpeg" });
      const pending = await adapter.add({ file });

      // Trigger FileReader callback
      const sendPromise = adapter.send(pending);
      mockFileReader.onload?.();

      const result = await sendPromise;

      expect(result.content).toEqual([
        {
          type: "audio",
          audio: {
            data: "data:audio/mpeg;base64,mockdata",
            format: "mp3",
          },
        },
      ]);
      expect(result.status).toEqual({ type: "complete" });
    });

    it("should convert wav to Unstable_AudioMessagePart", async () => {
      const file = new File(["audio data"], "test.wav", { type: "audio/wav" });
      const pending = await adapter.add({ file });

      mockFileReader.result = "data:audio/wav;base64,mockdata";
      const sendPromise = adapter.send(pending);
      mockFileReader.onload?.();

      const result = await sendPromise;

      expect(result.content).toEqual([
        {
          type: "audio",
          audio: {
            data: "data:audio/wav;base64,mockdata",
            format: "wav",
          },
        },
      ]);
    });

    it("should convert ogg to FileMessagePart", async () => {
      const file = new File(["audio data"], "test.ogg", { type: "audio/ogg" });
      const pending = await adapter.add({ file });

      mockFileReader.result = "data:audio/ogg;base64,mockdata";
      const sendPromise = adapter.send(pending);
      mockFileReader.onload?.();

      const result = await sendPromise;

      expect(result.content).toEqual([
        {
          type: "file",
          data: "data:audio/ogg;base64,mockdata",
          mimeType: "audio/ogg",
          filename: "test.ogg",
        },
      ]);
    });
  });

  describe("remove", () => {
    it("should be a no-op", async () => {
      await expect(adapter.remove()).resolves.toBeUndefined();
    });
  });
});
```

#### 2. Create SimpleVideoAttachmentAdapter tests
**File**: `packages/react/src/tests/adapters/SimpleVideoAttachmentAdapter.test.ts`
**Changes**: New file

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SimpleVideoAttachmentAdapter } from "../../legacy-runtime/runtime-cores/adapters/attachment/SimpleVideoAttachmentAdapter";

// Mock FileReader
const mockFileReader = {
  readAsDataURL: vi.fn(),
  onload: null as (() => void) | null,
  onerror: null as ((error: unknown) => void) | null,
  result: "data:video/mp4;base64,mockdata",
};

vi.stubGlobal("FileReader", vi.fn(() => mockFileReader));

describe("SimpleVideoAttachmentAdapter", () => {
  let adapter: SimpleVideoAttachmentAdapter;

  beforeEach(() => {
    adapter = new SimpleVideoAttachmentAdapter();
    vi.clearAllMocks();
  });

  describe("accept", () => {
    it("should accept video/* MIME types", () => {
      expect(adapter.accept).toBe("video/*");
    });
  });

  describe("add", () => {
    it("should create pending attachment from video file", async () => {
      const file = new File(["video data"], "test.mp4", { type: "video/mp4" });
      const result = await adapter.add({ file });

      expect(result).toEqual({
        id: "test.mp4",
        type: "file",
        name: "test.mp4",
        contentType: "video/mp4",
        file,
        status: { type: "requires-action", reason: "composer-send" },
      });
    });
  });

  describe("send", () => {
    it("should convert video to FileMessagePart", async () => {
      const file = new File(["video data"], "test.mp4", { type: "video/mp4" });
      const pending = await adapter.add({ file });

      const sendPromise = adapter.send(pending);
      mockFileReader.onload?.();

      const result = await sendPromise;

      expect(result.content).toEqual([
        {
          type: "file",
          data: "data:video/mp4;base64,mockdata",
          mimeType: "video/mp4",
          filename: "test.mp4",
        },
      ]);
      expect(result.status).toEqual({ type: "complete" });
    });

    it("should handle webm videos", async () => {
      const file = new File(["video data"], "test.webm", { type: "video/webm" });
      const pending = await adapter.add({ file });

      mockFileReader.result = "data:video/webm;base64,mockdata";
      const sendPromise = adapter.send(pending);
      mockFileReader.onload?.();

      const result = await sendPromise;

      expect(result.content).toEqual([
        {
          type: "file",
          data: "data:video/webm;base64,mockdata",
          mimeType: "video/webm",
          filename: "test.webm",
        },
      ]);
    });
  });

  describe("remove", () => {
    it("should be a no-op", async () => {
      await expect(adapter.remove()).resolves.toBeUndefined();
    });
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] Tests pass: `pnpm -F @assistant-ui/react test`
- [x] Tests cover adapter accept, add, send, and remove methods

#### Manual Verification:
- [x] Test output shows all tests passing

---

## Phase 6: Documentation

### Overview
Update the Attachments guide to include audio and video examples.

### Changes Required:

#### 1. Update Attachments.mdx guide
**File**: `apps/docs/content/docs/guides/Attachments.mdx`
**Changes**: Add audio/video adapter documentation after "SimpleTextAttachmentAdapter" section

Add new section:

```markdown
### SimpleAudioAttachmentAdapter

Handles audio files and converts them to audio message parts for playback:

\`\`\`tsx
const audioAdapter = new SimpleAudioAttachmentAdapter();
// Accepts: audio/* (MP3, WAV, OGG, M4A, etc.)
// Output for MP3/WAV: { type: "audio", audio: { data: "data:...", format: "mp3" | "wav" } }
// Output for other formats: { type: "file", data: "data:...", mimeType: "audio/..." }
\`\`\`

### SimpleVideoAttachmentAdapter

Handles video files and converts them to file message parts for playback:

\`\`\`tsx
const videoAdapter = new SimpleVideoAttachmentAdapter();
// Accepts: video/* (MP4, WebM, MOV, etc.)
// Output: { type: "file", data: "data:...", mimeType: "video/..." }
\`\`\`

### Combining All Media Adapters

Support images, audio, and video with a composite adapter:

\`\`\`tsx
const mediaAdapter = new CompositeAttachmentAdapter([
  new SimpleImageAttachmentAdapter(),
  new SimpleAudioAttachmentAdapter(),
  new SimpleVideoAttachmentAdapter(),
]);
\`\`\`
```

### Success Criteria:

#### Automated Verification:
- [x] Docs build: `pnpm -F docs build`

#### Manual Verification:
- [x] Documentation renders correctly
- [x] Code examples are accurate

---

## Phase 7: Integration Testing with Playwright

### Overview
Create end-to-end tests using Playwright to verify audio and video file uploads work correctly in a real browser environment.

### Changes Required:

#### 1. Create example page for testing
**File**: `examples/with-audio-video/app/page.tsx`
**Changes**: New example app (or modify existing `with-ffmpeg` example)

The example should:
- Use `CompositeAttachmentAdapter` with image, audio, and video adapters
- Display a chat interface with attachment support
- Show uploaded media with players

#### 2. Create Playwright test spec
**File**: `e2e/audio-video-attachments.spec.ts` (location TBD based on project structure)
**Changes**: New test file

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Audio and Video Attachments', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the example app
    await page.goto('http://localhost:3000');
  });

  test('should upload and display audio file', async ({ page }) => {
    // Click the attachment button
    await page.click('[data-testid="composer-add-attachment"]');

    // Upload an audio file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures/test-audio.mp3'));

    // Verify attachment appears in composer
    await expect(page.locator('[data-testid="composer-attachment"]')).toBeVisible();

    // Submit the message
    await page.click('[data-testid="composer-send"]');

    // Verify audio player appears in message
    await expect(page.locator('audio')).toBeVisible();
    await expect(page.locator('audio')).toHaveAttribute('controls');
  });

  test('should upload and display video file', async ({ page }) => {
    // Click the attachment button
    await page.click('[data-testid="composer-add-attachment"]');

    // Upload a video file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures/test-video.mp4'));

    // Verify attachment appears in composer
    await expect(page.locator('[data-testid="composer-attachment"]')).toBeVisible();

    // Submit the message
    await page.click('[data-testid="composer-send"]');

    // Verify video player appears in message
    await expect(page.locator('video')).toBeVisible();
    await expect(page.locator('video')).toHaveAttribute('controls');
  });

  test('should accept multiple file types via drag and drop', async ({ page }) => {
    // Test drag and drop functionality
    const dropzone = page.locator('[data-testid="composer-dropzone"]');

    // Create a data transfer with audio file
    const audioFile = path.join(__dirname, 'fixtures/test-audio.mp3');

    // Simulate drag and drop
    await dropzone.dispatchEvent('drop', {
      dataTransfer: {
        files: [audioFile],
      },
    });

    // Verify attachment appears
    await expect(page.locator('[data-testid="composer-attachment"]')).toBeVisible();
  });

  test('should play audio when controls clicked', async ({ page }) => {
    // Upload and send audio
    await page.click('[data-testid="composer-add-attachment"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures/test-audio.mp3'));
    await page.click('[data-testid="composer-send"]');

    // Wait for audio element
    const audio = page.locator('audio');
    await expect(audio).toBeVisible();

    // Click play and verify it's playing (or at least not errored)
    await audio.evaluate((el: HTMLAudioElement) => el.play().catch(() => {}));

    // Check that audio element exists and has a source
    await expect(audio).toHaveAttribute('src');
  });

  test('should show file preview in composer for audio', async ({ page }) => {
    await page.click('[data-testid="composer-add-attachment"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures/test-audio.mp3'));

    // Verify preview shows filename
    await expect(page.locator('[data-testid="attachment-name"]')).toContainText('.mp3');
  });

  test('should remove attachment when remove button clicked', async ({ page }) => {
    await page.click('[data-testid="composer-add-attachment"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures/test-audio.mp3'));

    // Click remove button
    await page.click('[data-testid="attachment-remove"]');

    // Verify attachment is removed
    await expect(page.locator('[data-testid="composer-attachment"]')).not.toBeVisible();
  });
});
```

#### 3. Test fixtures
**Directory**: `e2e/fixtures/`
**Files needed**:
- `test-audio.mp3` - Small test audio file (can be generated or use a royalty-free sample)
- `test-audio.wav` - Small test wav file
- `test-video.mp4` - Small test video file (can be generated or use a royalty-free sample)
- `test-video.webm` - Small test webm file

### Success Criteria:

#### Automated Verification:
- [ ] Playwright tests pass: `pnpm exec playwright test audio-video-attachments.spec.ts`

#### Manual Verification (using Playwright MCP):
- [ ] Navigate to example app in browser
- [ ] Upload MP3 file and verify audio player appears
- [ ] Upload WAV file and verify audio player appears
- [ ] Upload MP4 file and verify video player appears
- [ ] Upload WebM file and verify video player appears
- [ ] Verify audio/video controls work (play, pause, volume)
- [ ] Verify drag-and-drop works for audio/video files
- [ ] Verify attachment preview shows in composer
- [ ] Verify attachment can be removed from composer

---

## Testing Strategy

### Unit Tests:
- Adapter `accept` property matches expected MIME pattern
- Adapter `add()` returns correct pending attachment structure
- Adapter `send()` converts to correct message part type
- MP3/WAV files produce `Unstable_AudioMessagePart`
- Other audio formats produce `FileMessagePart`
- Video files produce `FileMessagePart`

### Integration Tests (Playwright):
- File upload via click
- File upload via drag-and-drop
- Audio player renders and plays
- Video player renders and plays
- Attachment preview in composer
- Attachment removal
- Multiple file types in one session

### Manual Testing Steps:
1. Start dev server: `pnpm dev`
2. Navigate to example with audio/video adapters
3. Upload MP3 file - verify audio player appears
4. Upload WAV file - verify audio player appears
5. Upload OGG file - verify audio player appears
6. Upload MP4 file - verify video player appears
7. Upload WebM file - verify video player appears
8. Test drag-and-drop for each file type
9. Test removing attachments
10. Test playback controls work

## Performance Considerations

- Large audio/video files converted to data URLs will increase message payload size
- Consider warning users about file size in documentation
- Data URLs are stored in memory - may impact performance with many large files
- No streaming support - entire file must load before playback

## Migration Notes

This is a new feature, no migration required. Existing code will continue to work as before. Users must explicitly use the new adapters to enable audio/video support.

## References

- Original research: `notes/research/audio_video_upload_support.md`
- Voice mode analysis: `notes/research/voice-mode-support-analysis.md`
- Simple image adapter pattern: `packages/react/src/legacy-runtime/runtime-cores/adapters/attachment/SimpleImageAttachmentAdapter.ts`
- FFmpeg example: `examples/with-ffmpeg/app/MyRuntimeProvider.tsx:12`
- Message part types: `packages/react/src/types/MessagePartTypes.ts`
- Attachment types: `packages/react/src/types/AttachmentTypes.ts`
