// Farm swaps `server-only` for a virtual module; vitest has no such resolver.
// Server modules are imported by their tests, so the marker is a no-op.
export {};
