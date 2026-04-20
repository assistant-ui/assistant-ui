"use client";

import type {
  ImageGenerationAdapter,
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageMessagePart,
} from "@assistant-ui/core";
import { useCallback, useRef, useState } from "react";

/**
 * Minimal image generation hook. Wraps a caller-provided
 * {@link ImageGenerationAdapter} with an `isGenerating` flag and surfaces
 * errors as state.
 *
 * Higher-level wiring (appending the resulting image to an assistant
 * message) is left to the caller for v0.1; this hook focuses on the
 * adapter contract so it can be reused from runtime code or from
 * custom UI glue.
 *
 * @example
 * ```tsx
 * const { generate, isGenerating, error } = useImageGeneration(adapter);
 * await generate("a cat in a hat");
 * ```
 */
export type ImageGenerationObservers = {
  readonly onImageGenerated?: (info: {
    readonly prompt: string;
    readonly model?: string | undefined;
    readonly durationMs: number;
    readonly imageSizeBytes: number;
  }) => void;
  readonly onImageError?: (info: {
    readonly errorType: string;
    readonly prompt: string;
    readonly model?: string | undefined;
  }) => void;
};

export type UseImageGenerationReturn = {
  readonly generate: (
    prompt: string,
    options?: ImageGenerationOptions,
  ) => Promise<ImageGenerationResult>;
  readonly isGenerating: boolean;
  readonly error: Error | null;
};

export const useImageGeneration = (
  adapter: ImageGenerationAdapter,
  observers?: ImageGenerationObservers,
): UseImageGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const adapterRef = useRef(adapter);
  const observersRef = useRef(observers);
  adapterRef.current = adapter;
  observersRef.current = observers;

  const generate = useCallback(
    async (
      prompt: string,
      options?: ImageGenerationOptions,
    ): Promise<ImageGenerationResult> => {
      setIsGenerating(true);
      setError(null);
      const startedAt = Date.now();
      try {
        const result = await adapterRef.current.generate(prompt, options);
        observersRef.current?.onImageGenerated?.({
          prompt,
          model: options?.model,
          durationMs: Date.now() - startedAt,
          imageSizeBytes: estimateImageBytes(result.image),
        });
        return result;
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        setError(normalized);
        observersRef.current?.onImageError?.({
          errorType: normalized.name || "Error",
          prompt,
          model: options?.model,
        });
        throw normalized;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  return { generate, isGenerating, error };
};

const estimateImageBytes = (image: string): number => {
  if (image.startsWith("data:")) {
    const base64 = image.slice(image.indexOf(",") + 1);
    return Math.floor((base64.length * 3) / 4);
  }
  return 0;
};

/**
 * Options for {@link useImagePartRegenerate}. Defaults: 1s debounce,
 * 5 regenerations per minute. Provide {@link confirmRegenerate} to gate
 * each invocation behind a user confirmation.
 */
export type UseImagePartRegenerateOptions = {
  readonly debounceMs?: number;
  readonly rateLimit?: { readonly maxPerMinute: number };
  readonly confirmRegenerate?: (prompt: string) => Promise<boolean> | boolean;
  readonly pricingHint?: string;
  readonly observers?: ImageGenerationObservers;
};

const DEFAULT_DEBOUNCE_MS = 1000;
const DEFAULT_MAX_PER_MINUTE = 5;

export type UseImagePartRegenerateReturn = {
  readonly regenerate: () => Promise<ImageGenerationResult | null>;
  readonly isRegenerating: boolean;
  readonly error: Error | null;
  readonly rateLimited: boolean;
  readonly pricingHint?: string | undefined;
};

/**
 * Regenerate an existing {@link ImageMessagePart} by re-invoking the
 * adapter with the part's stored prompt. Enforces a default 1s debounce
 * and 5/minute rate limit to prevent cost runaway.
 */
export const useImagePartRegenerate = (
  part: Pick<ImageMessagePart, "prompt" | "model" | "seed">,
  adapter: ImageGenerationAdapter,
  options?: UseImagePartRegenerateOptions,
): UseImagePartRegenerateReturn => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const lastCallRef = useRef<number>(0);
  const windowRef = useRef<number[]>([]);
  const adapterRef = useRef(adapter);
  const partRef = useRef(part);
  const optionsRef = useRef(options);
  adapterRef.current = adapter;
  partRef.current = part;
  optionsRef.current = options;

  const regenerate = useCallback(async () => {
    const now = Date.now();
    const debounceMs = optionsRef.current?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    const maxPerMinute =
      optionsRef.current?.rateLimit?.maxPerMinute ?? DEFAULT_MAX_PER_MINUTE;

    if (now - lastCallRef.current < debounceMs) {
      return null;
    }

    windowRef.current = windowRef.current.filter((t) => now - t < 60_000);
    if (windowRef.current.length >= maxPerMinute) {
      setRateLimited(true);
      return null;
    }

    const currentPart = partRef.current;
    if (!currentPart.prompt) {
      const err = new Error(
        "useImagePartRegenerate requires the ImageMessagePart to carry a `prompt` field.",
      );
      setError(err);
      throw err;
    }

    const confirm = optionsRef.current?.confirmRegenerate;
    if (confirm) {
      const ok = await confirm(currentPart.prompt);
      if (!ok) return null;
    }

    lastCallRef.current = now;
    windowRef.current.push(now);
    setRateLimited(false);
    setIsRegenerating(true);
    setError(null);

    try {
      const seed = currentPart.seed;
      const seedNumber =
        typeof seed === "number"
          ? seed
          : typeof seed === "string"
            ? Number.parseInt(seed, 10)
            : undefined;
      const result = await adapterRef.current.generate(currentPart.prompt, {
        ...(currentPart.model !== undefined && { model: currentPart.model }),
        ...(seedNumber !== undefined &&
          !Number.isNaN(seedNumber) && { seed: seedNumber }),
      });
      optionsRef.current?.observers?.onImageGenerated?.({
        prompt: currentPart.prompt,
        model: currentPart.model,
        durationMs: Date.now() - now,
        imageSizeBytes: estimateImageBytes(result.image),
      });
      return result;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error(String(err));
      setError(normalized);
      optionsRef.current?.observers?.onImageError?.({
        errorType: normalized.name || "Error",
        prompt: currentPart.prompt,
        model: currentPart.model,
      });
      throw normalized;
    } finally {
      setIsRegenerating(false);
    }
  }, []);

  return {
    regenerate,
    isRegenerating,
    error,
    rateLimited,
    pricingHint: options?.pricingHint,
  };
};

const extensionForMimeType = (mimeType?: string): string => {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "png";
  }
};

const dataUriToBlob = (dataUri: string): Blob => {
  const [meta, base64] = dataUri.split(",");
  const mime = meta?.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const bytes = atob(base64 ?? "");
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
};

/**
 * Returns a function that triggers a browser download of the given
 * image part. Resolves data URIs to blobs; passes through https URLs.
 */
export const useImagePartDownload = (
  part: Pick<
    ImageMessagePart,
    "image" | "filename" | "mimeType" | "generationId"
  >,
): (() => void) => {
  const partRef = useRef(part);
  partRef.current = part;

  return useCallback(() => {
    if (typeof document === "undefined") return;
    const current = partRef.current;
    const ext = extensionForMimeType(current.mimeType);
    const filename =
      current.filename ??
      (current.generationId
        ? `${current.generationId}.${ext}`
        : `image.${ext}`);

    const isDataUri = current.image.startsWith("data:");
    let objectUrl: string | null = null;
    const href = isDataUri
      ? (objectUrl = URL.createObjectURL(dataUriToBlob(current.image)))
      : current.image;

    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, []);
};

/**
 * Returns a function that copies the image to the system clipboard using
 * navigator.clipboard.write. Safari requires transient user activation
 * (call this from a user-initiated click handler).
 */
export const useImagePartCopy = (
  part: Pick<ImageMessagePart, "image" | "mimeType">,
): (() => Promise<void>) => {
  const partRef = useRef(part);
  partRef.current = part;

  return useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof ClipboardItem === "undefined"
    ) {
      throw new Error("Clipboard API is not available in this environment.");
    }
    const current = partRef.current;
    const blob = current.image.startsWith("data:")
      ? dataUriToBlob(current.image)
      : await fetch(current.image).then((r) => r.blob());
    const mime = current.mimeType ?? blob.type ?? "image/png";
    await navigator.clipboard.write([new ClipboardItem({ [mime]: blob })]);
  }, []);
};
