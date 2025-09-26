---
"@assistant-ui/react-markdown": patch
"@assistant-ui/react": patch
"@assistant-ui/docs": patch
---

fix: make MarkdownText resilient to missing MessagePrimitive.Parts context

Add error boundary to gracefully handle "Part is only available inside MessagePrimitive.Parts" errors when MarkdownText is used outside the proper context hierarchy. Display helpful error messages with code examples and provide fallback content support.

- Add MarkdownTextErrorBoundary component for graceful error handling
- Add fallbackContent and showDevWarnings props to MarkdownText
- Enhance error messages in AssistantApiContext with actionable guidance
- Update documentation with troubleshooting section and migration guidance
- Add CSS styles for error boundary components

Resolves AUI-22 and improves developer experience for common migration issues.