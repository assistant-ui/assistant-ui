---
"@assistant-ui/core": patch
---

chore: drop `./*` wildcard export and surface internal attachment status types

The `./*` wildcard in `exports` was exposing the entire dist tree as importable subpaths, which inadvertently leaked internal modules (e.g. `@assistant-ui/core/tests/*`, `@assistant-ui/core/types/*`) as public API. Removing it.

Two attachment status types that were previously only reachable through the wildcard (`PendingAttachmentStatus`, `CompleteAttachmentStatus`) are now re-exported from the package root so that consumers' inferred types remain portable.
