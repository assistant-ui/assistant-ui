// Internal indirection target for the default export condition. The
// `/generative` subpath resolves here in every non-react-server layer (SSR +
// browser). It is always replaced by the @assistant-ui/next loader (applied via
// the facade's import attribute), which re-exports the originating module's
// client build. Reaching this code means the loader was not applied — e.g.
// imported without the facade, or under an unsupported bundler.
throw new Error(
  "@assistant-ui/next/generative is an internal indirection and " +
    "must be imported through the @assistant-ui/next loader.",
);
