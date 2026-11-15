/**
 * Rolldown's automatic chunking emits one chunk per distinct set of importers,
 * so a page loads only modules it uses, but on the docs that is over a
 * thousand chunks under 10 KB. Inlining the small common chunks into their
 * importers cuts the request count without merging unrelated code the way
 * size-capped manual groups did.
 */
export const CLIENT_OUTPUT = {
  codeSplitting: {
    experimentalInlineCommonChunks: {
      maxSize: 30_000,
      // Chunks that hold styles stay files, as in Vite's own configuration.
      exclude: /\.(css|scss|sass|less|styl|stylus|pcss|postcss|sss)(\?|$)/,
    },
  },
  // Inlined chunk copies run in source order only under strict execution order.
  strictExecutionOrder: true,
};
