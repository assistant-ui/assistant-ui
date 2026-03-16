# AUI-23: CodeBlock in Markdown doesn't re-render when switching threads

**Status**: In Progress
**Priority**: Medium
**Assignee**: sam.dickson@assistant-ui.com
**URL**: https://linear.app/assistant-ui/issue/AUI-23/codeblock-in-markdown-doesnt-re-render-when-switching-threads

## Problem to solve

When using `useLangGraphRuntime`, code blocks within markdown content fail to render properly on the first thread switch. Users see broken formatting when initially switching threads, requiring subsequent actions to trigger proper rendering.

## Key Details

- **Runtime**: `useLangGraphRuntime`
- **Trigger**: `runtime.threads.switchToThread()` call
- **Issue**: Code blocks in markdown don't render on first thread switch
- **Evidence**: Video and minimal reproduction repo provided in GitHub issue

## References

- **GitHub Issue**: https://github.com/assistant-ui/assistant-ui/issues/2344
- **Reproduction Repository**: https://github.com/eladlachmi/markdown_bug_repro.git
- **Video demonstration**: Available in original GitHub issue

---
*Last synced: 2025-09-30*