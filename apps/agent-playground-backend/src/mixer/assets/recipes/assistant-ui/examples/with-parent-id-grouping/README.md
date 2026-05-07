# Parent ID Grouping Example

This example demonstrates how to use the parent ID feature in assistant-ui to group related message parts together.

## Quick Start

### Using CLI (Recommended)

```bash
npx assistant-ui@latest create my-app --example with-parent-id-grouping
cd my-app
```

### Environment Variables

Create `.env.local`:

```
OPENAI_API_KEY=sk-...
```

### Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the example.

## Features

- **Parent ID Support**: Message parts can have a `parentId` field that groups them together
- **Visual Grouping**: Related parts are displayed in collapsible groups
- **Custom Group Component**: Shows grouped parts in a bordered container with expand/collapse functionality

## How it works

1. **Message Structure**: The example uses the external store runtime with predefined messages that include parts with `parentId` fields:

   ```typescript
   {
     type: "text",
     text: "Some related text",
     parentId: "research-climate-causes"
   }
   ```

2. **Grouping Component**: Uses `MessagePrimitive.Unstable_PartsGroupedByParentId` which automatically groups parts by their `parentId`

3. **Custom Rendering**: The `ParentIdGroup` component provides collapsible sections for each group

## Use Cases

This pattern is useful for:

- Grouping research sources with their related findings
- Organizing multi-step tool executions
- Creating hierarchical content structures
- Showing related content in collapsible sections

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [Message Structure Guide](https://www.assistant-ui.com/docs/concepts/messages)
