export const isAiPlaygroundEnabled =
  process.env.NEXT_PUBLIC_AUI_AI_PLAYGROUND_ENABLED === "1";

export const isAiBuilderEnabled =
  isAiPlaygroundEnabled &&
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
