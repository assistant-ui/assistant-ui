---
"@assistant-ui/react": minor
---

feat: Add *ByIndex primitives for direct indexed access

Added new primitives that allow rendering individual items by index, improving performance and enabling more granular control:

- `ThreadPrimitive.MessageByIndex` - Render a specific message by index
- `MessagePrimitive.PartByIndex` - Render a specific message part by index  
- `MessagePrimitive.AttachmentByIndex` - Render a specific message attachment by index
- `ComposerPrimitive.AttachmentByIndex` - Render a specific composer attachment by index
- `ThreadListPrimitive.ItemByIndex` - Render a specific thread list item by index

These primitives provide direct access to individual items without iterating through entire collections, and are now used internally by their parent components (Messages, Parts, Attachments, Items) for improved efficiency.