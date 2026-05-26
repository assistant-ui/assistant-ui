---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-artifact-runtime": patch
---

feat(artifacts): ArtifactPrimitive, Artifacts resource, and react-artifact-runtime

Adds Claude-style artifacts with SafeContentFrame-isolated previews, version navigation,
and client-owned tool-call completion. Includes `@assistant-ui/react-artifact-runtime`
for single-file React components, origin handshake for blob iframe status reporting,
and error-boundary-based mount status for React 18 concurrent render failures.
