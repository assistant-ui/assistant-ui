import type {
  ImageGenerationAdapter,
  ImageGenerationOptions,
  ImageGenerationResult,
} from "@assistant-ui/core";

/**
 * Shape of the `generateImage` function exported by the `ai` package
 * (duck-typed so we do not hard-depend on its exact export layout).
 */
type GenerateImageFn = (args: {
  model: unknown;
  prompt: string;
  n?: number;
  size?: `${number}x${number}`;
  seed?: number;
  providerOptions?: Record<string, unknown>;
  abortSignal?: AbortSignal;
}) => Promise<{
  image: { base64: string; mediaType: string };
  responses?: ReadonlyArray<{
    providerMetadata?: Record<string, Record<string, unknown>>;
  }>;
  providerMetadata?: Record<string, Record<string, unknown>>;
}>;

export type AiSdkImageAdapterOptions = {
  /** AI SDK `generateImage` function, e.g. `import { generateImage } from "ai"`. */
  readonly generateImage: GenerateImageFn;
  /** Default image model (e.g. `openai.image("gpt-image-1")`). */
  readonly model: unknown;
  /** Optional AbortSignal forwarded to every call. */
  readonly abortSignal?: AbortSignal;
};

const toSizeString = (size?: string): `${number}x${number}` | undefined => {
  if (!size) return undefined;
  return /^\d+x\d+$/.test(size) ? (size as `${number}x${number}`) : undefined;
};

/**
 * Build an {@link ImageGenerationAdapter} backed by the AI SDK's
 * `generateImage` function. Maps the provider's `image` output into a
 * `data:` URI and surfaces `revisedPrompt` (when present) in the
 * metadata bag.
 *
 * @example
 * ```ts
 * import { generateImage } from "ai";
 * import { openai } from "@ai-sdk/openai";
 *
 * const adapter = createAiSdkImageAdapter({
 *   generateImage,
 *   model: openai.image("gpt-image-1"),
 * });
 * ```
 */
export const createAiSdkImageAdapter = (
  config: AiSdkImageAdapterOptions,
): ImageGenerationAdapter => {
  return {
    async generate(
      prompt: string,
      options?: ImageGenerationOptions,
    ): Promise<ImageGenerationResult> {
      const result = await config.generateImage({
        model: config.model,
        prompt,
        ...(options?.n !== undefined && { n: options.n }),
        ...(toSizeString(options?.size) !== undefined && {
          size: toSizeString(options!.size)!,
        }),
        ...(options?.seed !== undefined && { seed: options.seed }),
        ...(options?.providerOptions !== undefined && {
          providerOptions: options.providerOptions,
        }),
        ...(config.abortSignal && { abortSignal: config.abortSignal }),
      });
      const revisedPrompt =
        result.responses?.[0]?.providerMetadata?.openai?.revisedPrompt ??
        result.providerMetadata?.openai?.revisedPrompt;

      return {
        image: `data:${result.image.mediaType};base64,${result.image.base64}`,
        mimeType: result.image.mediaType,
        metadata: {
          ...(typeof revisedPrompt === "string" && { revisedPrompt }),
        },
      };
    },
  };
};
