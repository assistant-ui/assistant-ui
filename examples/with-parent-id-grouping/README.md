# Parent ID Grouping Example

This example demonstrates how to use the parent ID feature in assistant-ui to group related message parts together.

## Features

- **Parent ID Support**: Message parts can have a `parentId` field that groups them together
- **Visual Grouping**: Related parts are displayed in collapsible groups
- **Custom Group Component**: The example shows how to create a custom Group component that:
  - Shows grouped parts in a bordered container
  - Provides expand/collapse functionality
  - Displays meaningful labels for each group
  - Leaves ungrouped parts (without parentId) as-is

## How it works

1. **Message Structure**: The example uses the external store runtime with predefined messages that include parts with `parentId` fields:

   ```typescript
   {
     type: "text",
     text: "Some related text",
     parentId: "research-climate-causes"
   }
   ```

2. **Grouping Component**: Uses `MessagePrimitive.Unstable_PartsGroupedByParentId` which automatically:
   - Groups parts by their `parentId`
   - Maintains order based on first occurrence
   - Places ungrouped parts after grouped ones

3. **Custom Rendering**: The `ParentIdGroup` component provides:
   - Collapsible sections for each group
   - Custom styling with borders and backgrounds
   - Meaningful labels based on the parent ID

## Running the Example

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the example.

## Key Components

- `MyRuntimeProvider.tsx`: Sets up the external store with dummy messages containing parent IDs
- `thread.tsx`: Contains the custom `ParentIdGroup` component and uses `Unstable_PartsGroupedByParentId`

## Use Cases

This pattern is useful for:

- Grouping research sources with their related findings
- Organizing multi-step tool executions
- Creating hierarchical content structures
- Showing related content in collapsible sections
