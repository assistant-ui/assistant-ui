# Add a weather tool

This stage gives the assistant a deterministic weather capability and deliberately leaves its generic fallback visible.

Explain the toolkit contract: `geocode_location` resolves a supported city to coordinates, then `get_weather` returns its structured forecast. Descriptions help the model choose the tools, schemas constrain their arguments, and executors return fixed fixture data so every learner sees repeatable results without depending on an external service.

The toolkit uses assistant-ui’s generative-tool syntax, so `next.config.ts` wraps the Next.js configuration with `withAui` to compile it.

The chat route exposes the toolkit to the AI SDK model, while the thread deliberately renders returned tool calls through its generic fallback. The model chooses the capability; application code performs the lookup.

Ask the learner to select a Weather suggestion, expand the generic calls, and match their names, arguments, statuses, and results to `app/toolkit.tsx`. Keep the teaching emphasis on `get_weather`, and do not introduce custom weather UI yet.
