# with-interactables

Demonstrates **interactable components** — persistent UI components whose state can be read and updated by both the user and the AI assistant.

## Features Demonstrated

### Task Board (single instance + custom tool)
- `unstable_useInteractable("taskBoard", config)` — registers a single interactable
- `Tools({ toolkit })` — custom tool for incremental add/toggle/remove/clear
- Auto-generated `update_taskBoard` tool with **partial updates** (AI only sends changed fields)

### Sticky Notes (collection actions + multi-instance updates)
- The notes panel registers a small `notes` index interactable for note IDs and the selected note ID
- Multiple `<NoteCard>` components each call `unstable_useInteractable("note", { id: noteId, ... })`
- **Collection actions**: `manage_notes` adds/selects/removes/clears notes and can update an existing note by `noteId`
- **Multi-instance**: all notes share one `update_note` tool; the AI addresses a note by its `id`
- **Selection**: click a note to select it; the parent updates `selectedId`, and each note syncs its own `selected` field so the AI sees focus in message metadata
- **Partial updates**: AI can change just `{ id, color: "pink" }` without resending title and content

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
- **Multi-instance** — same `name`, different `id`; one stable `update_{name}` tool addressed by `id`
- **Selection** — the parent owns `selectedId`; each note mirrors it into a `selected` state field that is stamped into message metadata
- **`Tools({ toolkit })`** — custom frontend tools for collection-level actions
- **`sendAutomaticallyWhen`** — auto-sends follow-up messages when tool calls complete
