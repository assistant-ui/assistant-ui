import type {
  ImageGenerationAdapter,
  ImageGenerationOptions,
  ImageGenerationResult,
} from "@assistant-ui/core";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export type MockImageAdapterOptions = {
  readonly delayMs?: number;
  readonly errorRate?: number;
  readonly errorMessage?: string;
  readonly image?: string;
  readonly mimeType?: string;
  readonly revisedPrompt?: (prompt: string) => string;
};

/**
 * Deterministic image generation adapter for tests and Storybook.
 * Returns a 1x1 PNG after an optional delay, and can be configured
 * to simulate provider errors via {@link MockImageAdapterOptions.errorRate}.
 */
export const createMockImageAdapter = (
  options: MockImageAdapterOptions = {},
): ImageGenerationAdapter => {
  let callCount = 0;
  return {
    async generate(
      prompt: string,
      _opts?: ImageGenerationOptions,
    ): Promise<ImageGenerationResult> {
      callCount++;
      if (options.delayMs && options.delayMs > 0) {
        await new Promise((r) => setTimeout(r, options.delayMs));
      }
      if (options.errorRate && Math.random() < options.errorRate) {
        throw new Error(options.errorMessage ?? "Mock image generation error");
      }
      const mimeType = options.mimeType ?? "image/png";
      const image =
        options.image ?? `data:${mimeType};base64,${TINY_PNG_BASE64}`;
      return {
        image,
        mimeType,
        metadata: {
          generationId: `mock-${callCount}`,
          ...(options.revisedPrompt && {
            revisedPrompt: options.revisedPrompt(prompt),
          }),
        },
      };
    },
  };
};
