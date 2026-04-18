# with-interactables

Demonstrates **interactable components** — persistent UI components whose state can be read and updated by both the user and the AI assistant.

## Features Demonstrated

### Task Board (single instance + custom tool)
- `useInteractable("taskBoard", config)` — registers a single interactable
- `useAssistantTool("manage_tasks")` — custom tool for incremental add/toggle/remove/clear
- Auto-generated `update_taskBoard` tool with **partial updates** (AI only sends changed fields)

### Sticky Notes (multi-instance + selection + partial updates)
- Multiple `<NoteCard>` components each call `useInteractable("note", { id: noteId, ... })`
- **Multi-instance**: each note gets its own `update_note_{id}` tool automatically
- **Selection**: click a note to select it; AI sees `(SELECTED)` in system prompt and prioritizes it
- **Partial updates**: AI can change just `{ color: "pink" }` without resending title and content

## Getting Started

```bash
# Install dependencies (from monorepo root)
pnpm install

# Set your OpenAI API key
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY

# Run the development server
pnpm --filter with-interactables dev
```

Open [http://localhost:3000](http://localhost:3000) to see the example.

## Key Concepts

- **`Interactables()`** — scope resource registered via `useAui`
- **`useInteractable(name, config)`** — returns `[state, setState, { id, setSelected }]`
- **Partial updates** — auto-generated tools use partial schemas; AI only sends changed fields
- **Multi-instance** — same `name`, different `id`; tools named `update_{name}_{id}`
- **Selection** — `setSelected(true)` marks a component as focused for the AI
- **`useAssistantTool`** — custom frontend tools for fine-grained control
- **`sendAutomaticallyWhen`** — auto-sends follow-up messages when tool calls complete
