/**
 * Options passed to an {@link ImageGenerationAdapter#generate} call. All
 * fields are optional; the adapter decides which ones are meaningful for its
 * underlying provider.
 */
export type ImageGenerationOptions = {
  /** Provider-specific model identifier, e.g. "gpt-image-1". */
  readonly model?: string;
  /** Requested size, e.g. "1024x1024". Provider-interpreted. */
  readonly size?: string;
  /** Requested quality. Provider-interpreted (e.g. "standard" | "hd"). */
  readonly quality?: string;
  /** Number of images to generate. Providers may clamp this. */
  readonly n?: number;
  /** Optional deterministic seed. */
  readonly seed?: number;
  /** Escape hatch for provider-specific options. */
  readonly providerOptions?: Record<string, unknown>;
};

/**
 * Result returned by an {@link ImageGenerationAdapter#generate} call.
 *
 * Provider-specific fields (revisedPrompt, seed, generationId, etc.) belong
 * in the generic {@link ImageGenerationResult.metadata} bag; the React hook
 * layer bridges those into typed fields on the resulting ImageMessagePart.
 */
export type ImageGenerationResult = {
  /** URL or data URI for the generated image. */
  readonly image: string;
  /** MIME type of the image (e.g. "image/png"). */
  readonly mimeType?: string;
  /** Provider-specific metadata bag. */
  readonly metadata?: Record<string, unknown>;
};

/**
 * Contract implemented by image generation providers. An adapter is
 * provider-specific; hooks and runtime code consume only this interface.
 *
 * Streaming partial images are intentionally omitted from v0.1; when a
 * second provider supports the pattern, a streaming variant will be added.
 */
export type ImageGenerationAdapter = {
  generate(
    prompt: string,
    options?: ImageGenerationOptions,
  ): Promise<ImageGenerationResult>;
};
