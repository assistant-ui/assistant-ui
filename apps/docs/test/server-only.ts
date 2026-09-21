// Next injects the real `server-only` package, which is not resolvable under
// vitest. Server modules are imported by their tests, so the marker is a no-op.
export {};
