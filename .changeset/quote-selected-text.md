---
"@assistant-ui/react": minor
---

feat: Quote Selected Text primitives

Added new primitives and hooks for quoting selected text from messages:

- `SelectionToolbarPrimitive.Root` - Floating toolbar that appears on text selection within a message
- `SelectionToolbarPrimitive.Quote` - Button inside the floating toolbar to capture the selection as a quote
- `ComposerPrimitive.Quote` - Container for quote preview (renders only when quote is set)
- `ComposerPrimitive.QuoteText` - Displays the quoted text
- `ComposerPrimitive.QuoteDismiss` - Button to clear the quote
- `useMessageQuote()` - Hook to read quote info from message metadata
- `QuoteInfo` type - `{ text: string; messageId: string }`
- `ComposerRuntime.setQuote()` - Programmatic API to set/clear quotes
- `MessagePrimitive.Root` now renders `data-message-id` attribute
