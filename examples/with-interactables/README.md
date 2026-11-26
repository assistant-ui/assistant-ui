# with-interactables

Demonstrates **interactable components**: persistent UI components whose state can be read and updated by both the user and the AI assistant. For the full API, see the [Interactables docs](https://www.assistant-ui.com/docs/tools/interactables).

## Features Demonstrated

### Task Board
- `unstable_useInteractable("taskBoard", config)` registers a single interactable with the explicit id `"taskBoard"`
- Auto-generated `update_taskBoard` tool with partial scalar updates and array operations
- Collection edits go through `tasks.add`, `tasks.update`, `tasks.remove`, and `tasks.clear` on the generated update tool

### Sticky Notes
- `unstable_useInteractable("notes", config)` registers the sticky-note collection and `selectedId` as one state object, with the explicit id `"notes"`
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

- **`unstable_Interactables({ persistence })`**: the scope resource, registered as `unstable_interactables` in `AuiConfig`, with a `load`/`save` adapter defined at module level so its identity stays stable
- **`unstable_useInteractable(name, config)`**: returns `[state, { id, version, setState, isPending, error, flush }]`
- **Explicit `id`**: persisted state is keyed by instance id. Without an `id`, each mount gets an id derived from its position in the React tree, so saved state stops reattaching when the layout changes. Give every persisted instance an explicit `id`, as this example does
- **Partial updates**: auto-generated tools use partial schemas; AI only sends changed fields
- **Array operations**: an array field takes `add`, `remove`, and `clear` on the same `update_{name}` tool, plus `update` when its items have an `id` field. The model never resends the whole array. For id-keyed items, ids of added items are assigned for you, `remove` takes ids, and `update` takes `{ id, ...changedFields }`
- **Selection as state**: focused UI state lives in the interactable's normal schema (`selectedId`), not in a separate manage tool
- **Route wiring**: `app/api/chat/route.ts` turns the uploaded `update_*` tools into AI SDK tools with `frontendTools`, and adds state snapshots with `unstable_injectInteractableContext`
- **`sendAutomaticallyWhen`**: auto-sends follow-up messages when tool calls complete
