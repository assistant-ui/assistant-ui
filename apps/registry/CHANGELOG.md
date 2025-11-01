# assistant-ui/registry

> [!NOTE]
> Versions are labels only, previous versions are not hosted, commands always point to the latest version.

## 2025-10-31 - Initial Version Tracking

All existing registry components have been versioned to track changes over time.

### Stable Components (1.0)

Production-ready components representing the current stable state:

- **thread@1.0** - Composable chat thread UI with composer, messages, and suggestions
- **thread-list@1.0** - Thread list management component
- **markdown-text@1.0** - Markdown rendering
- **attachment@1.0** - File attachment UI
- **tooltip-icon-button@1.0** - Accessible tooltip button primitive
- **assistant-modal@1.0** - Modal dialog for thread interface
- **assistant-sidebar@1.0** - Resizable sidebar for assistant
- **tool-fallback@1.0** - Fallback UI for tool calls
- **shiki-highlighter@1.0** - Code syntax highlighting with Shiki
- **mermaid-diagram@1.0** - Mermaid diagram rendering
- **threadlist-sidebar@1.0** - Sidebar with thread list integration
- **follow-up-suggestions@1.0** - Follow-up suggestion chips

### Experimental Components (0.1)

Legacy/experimental components:

- **syntax-highlighter@0.1** - Code syntax highlighting with react-syntax-highlighter (legacy, replaced by shiki-highlighter)
- **ai-sdk-backend@0.1** - AI SDK backend route template (legacy)
- **chat/b/ai-sdk-quick-start/json@0.1** - V0 chat quick-start template (legacy)

---

## Version Scheme

- **1.0+** - Stable, production-ready components
- **pre-1.0** - Experimental or legacy components

Future updates will be documented here with version bumps:

- **Minor** (1.0 → 1.1) - Minor new features or styling, non-breaking
- **Major** (1.0 → 2.0) - Major or Breaking changes
