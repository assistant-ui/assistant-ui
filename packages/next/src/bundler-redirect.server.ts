// Internal `react-server` indirection target — always replaced by the
// @assistant-ui/next loader, which re-exports the module's server build.
// Reaching this means the loader wasn't applied (see DESIGN.md).
throw new Error(
  "@assistant-ui/next/bundler-redirect is internal; import it through the " +
    "@assistant-ui/next loader.",
);
