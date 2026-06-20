# with-interactables

Demonstrates **interactable components** — persistent UI components whose state can be read and updated by both the user and the AI assistant.

## Features Demonstrated

### Task Board
- `unstable_useInteractable("taskBoard", config)` — registers a single interactable
- Auto-generated `update_taskBoard` tool with partial scalar updates and array operations
- Collection edits go through `tasks.add`, `tasks.update`, `tasks.remove`, and `tasks.clear` on the generated update tool

### Sticky Notes
- `unstable_useInteractable("notes", config)` — registers the sticky-note collection and `selectedId` as one state object
- Auto-generated `update_notes` manages both note collection edits and selected-note focus
- **Selection**: click a note to set `selectedId`; the AI can change focus by updating the same normal state field
- **Partial updates**: AI can change just one note field with `notes.update: [{ id, color: "pink" }]`

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

- **`unstable_Interactables({ persistence })`** — scope resource registered via `useAui`, with a `load`/`save` adapter
- **`unstable_useInteractable(name, config)`** — returns `[state, { id, setState, isPending, error, flush }]`
- **Partial updates** — auto-generated tools use partial schemas; AI only sends changed fields
- **Array operations** — array fields support generated `add`, `update`, `remove`, `clear`, and `set` operations on the same `update_{name}` tool
- **Selection as state** — focused UI state lives in the interactable's normal schema (`selectedId`), not in a separate manage tool
- **`sendAutomaticallyWhen`** — auto-sends follow-up messages when tool calls complete
