// Internal indirection target for the `react-server` export condition. The
// `/generative` subpath resolves here in react-server layers (Server Components
// + App Router route handlers). It is always replaced by the @assistant-ui/next
// loader (applied via the facade's import attribute), which re-exports the
// originating module's server build. Reaching this code means the loader was not
// applied — e.g. imported without the facade, or under an unsupported bundler.
throw new Error(
  "@assistant-ui/next/generative is an internal indirection and " +
    "must be imported through the @assistant-ui/next loader.",
);
