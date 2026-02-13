# AI SDK Format Handling

Reference for how assistant-ui handles different AI SDK versions and message formats.

## AI SDK Versions

### v6 (current)

- **Message type:** `UIMessage` (has `parts: Part[]`)
- **Backend response:** `result.toUIMessageStreamResponse()`
- **Streaming protocol:** UIMessageStream (SSE)
- **Frontend package:** `@assistant-ui/react-ai-sdk` with `useChatRuntime()`
- **Cloud persistence format:** `"ai-sdk/v6"`

### v5

- **Compatibility behavior only (not the recommended path).**
- Current `@assistant-ui/react-ai-sdk` is v6-first and does **not** treat v5 as a supported integration mode.
- The repository still contains a compatibility shim: `convertMessage.ts:120-128` converts v5-style `data-*` parts (`data-` prefix) into `data` message parts so legacy streams can still be represented when they reach UIMessage conversion.
- For a supported v5 integration, use the legacy `AI SDK v5` docs path (`/docs/runtimes/ai-sdk/v5-legacy`) or older package versions as documented there.

### v4

- **Legacy path:** **Requires `@assistant-ui/react-data-stream`** with `useDataStreamRuntime({ protocol: "data-stream" })`.
- **Streaming protocol:** DataStream (newline-delimited `{type}:{JSON}\n`)
- **Uses `useLocalRuntime` internally** (not `useChat`), with its own message conversion via `toLanguageModelMessages()`.

## Cloud Persistence Formats

Two storage formats, explicitly specified (not auto-detected):

| Format | Stored by | Message type | Encoder/Decoder |
|--------|-----------|--------------|-----------------|
| `"aui/v0"` | `@assistant-ui/react` (via `AssistantCloudThreadHistoryAdapter`) | `ThreadMessage` | `auiV0Encode()` / `auiV0Decode()` in `packages/react/src/legacy-runtime/cloud/auiV0.ts` |
| `"ai-sdk/v6"` | `@assistant-ui/cloud-ai-sdk` (via `MessagePersistence`) and `@assistant-ui/react-ai-sdk` (runtime adapter path) | `UIMessage` | `aiSdkFormatAdapter` in `packages/cloud-ai-sdk/src/chat/MessagePersistence.ts` and `aiSDKFormatAdapter` in `packages/react-ai-sdk/src/ui/adapters/aiSDKFormatAdapter.ts` |

- `FormattedCloudPersistence.ts` filters by `adapter.format` on load.
- Format is set at write time and filtered at read time. No migration or auto-detection between formats.
- Mixed-format rows can exist in storage if callers write different formats to the same thread, but each format-aware loader only returns rows matching its adapter format.

## Streaming Serialization Formats (assistant-stream)

Four wire formats in `packages/assistant-stream/src/core/serialization/`:

| Format | Directory | Used for |
|--------|-----------|----------|
| **DataStream** | `data-stream/` | AI SDK v4/v5 backend responses |
| **UIMessageStream** | `ui-message-stream/` | AI SDK v6 backend responses |
| **AssistantTransport** | `assistant-transport/` | assistant-ui native streaming protocol |
| **PlainText** | `PlainText.ts` | Plain text streaming |

All four decode into `AssistantStreamChunk` internally. DataStream and UIMessageStream correspond to AI SDK versions; AssistantTransport and PlainText are assistant-ui's own protocols.

## Key Conversion Paths

```
                    ┌─────────────────────────┐
                    │   Cloud Storage          │
                    │   format: "aui/v0"       │◄── auiV0Encode(ThreadMessage)
                    │   format: "ai-sdk/v6"    │◄── v6 adapter encode(UIMessage)
                    └─────────────────────────┘

  ┌──────────────┐    convertMessage.ts     ┌──────────────┐
  │  UIMessage   │ ──────────────────────►  │ ThreadMessage │
  │  (AI SDK v6) │                          │ (assistant-ui)│
  └──────────────┘                          └──────────────┘
        ▲                                          │
        │ toCreateMessage.ts                       │ toGenericMessages.ts
        │ (AppendMessage → CreateUIMessage)        │ (ThreadMessage → GenericMessage)
        │                                          ▼
  ┌──────────────┐                          ┌──────────────┐
  │ User input   │                          │ LLM provider │
  └──────────────┘                          └──────────────┘

  getVercelAIMessages() extracts original UIMessage[] from converted ThreadMessage
  (uses internal symbolInnerMessage, no re-conversion)
```

## Key Files

| File | Package | Purpose |
|------|---------|---------|
| `src/ui/utils/convertMessage.ts` | react-ai-sdk | UIMessage → ThreadMessage (includes v5 data-* handling) |
| `src/ui/utils/toCreateMessage.ts` | react-ai-sdk | AppendMessage → CreateUIMessage |
| `src/ui/getVercelAIMessages.tsx` | react-ai-sdk | Extract original UIMessage from ThreadMessage |
| `src/ui/adapters/aiSDKFormatAdapter.ts` | react-ai-sdk | ai-sdk/v6 cloud persistence adapter |
| `src/chat/MessagePersistence.ts` | cloud-ai-sdk | ai-sdk/v6 cloud persistence adapter used by `useCloudChat` |
| `src/legacy-runtime/cloud/auiV0.ts` | react | aui/v0 cloud persistence format |
| `src/core/serialization/data-stream/DataStream.ts` | assistant-stream | DataStream encoder/decoder (v4/v5) |
| `src/core/serialization/ui-message-stream/UIMessageStream.ts` | assistant-stream | UIMessageStream decoder (v6) |
| `src/core/converters/toGenericMessages.ts` | assistant-stream | ThreadMessage → GenericMessage for LLM providers |
| `src/FormattedCloudPersistence.ts` | cloud | Format-aware persistence wrapper |
| `src/useDataStreamRuntime.ts` | react-data-stream | v4 integration (protocol: "data-stream") |

---

## How to update `AGENTS.md` files

Use this section as the single source for progressive-disclosure updates in package `AGENTS.md` files when format behavior changes.

### Required check-in for format changes

1. **Identify touched format layer** (serialization, runtime conversion, cloud persistence, or docs).
2. **Update only affected sections**:
   - `Structure` (if new/renamed files)
   - `Key Concepts` (if behavior changed)
   - `Tests` / `Important files` blocks if package adds coverage or migration coverage.
3. **Keep wording version-scoped**:
   - `v6` = current supported integration
   - `v5` = legacy/compatibility behavior only (when applicable)
   - `v4` = legacy via `react-data-stream`
4. **Cross-link once** if behavior spans packages (e.g., `react-ai-sdk` + `cloud` + `assistant-stream`).

### Package-specific update map

| Package | AGENTS.md target | Exact sections to revise |
|--------|-------------------|--------------------------|
| `react-ai-sdk` | `packages/react-ai-sdk/AGENTS.md` | `Key Concepts` should explicitly state v6-first behavior and v5 compatibility shim (if present). Add/keep mention of `convertMessage.ts` as cross-version part-normalization point. Note that this package also has a local `aiSDKFormatAdapter` used in runtime integration paths. |
| `cloud-ai-sdk` | `packages/cloud-ai-sdk/AGENTS.md` | `Key Concepts` should call out `MessagePersistence` as `UIMessage` + `ai-sdk/v6` format only (for current package), and mention its local adapter duplication with `react-ai-sdk` to prevent drift. |
| `cloud` | `packages/cloud/AGENTS.md` | `Key Concepts` should continue emphasizing `format` as a hard contract (`aui/v0` or `ai-sdk/v6`) and include both as accepted values. |
| `react` | `packages/react/AGENTS.md` | In `Key Concepts`, keep legacy-runtime distinction plus adapter matrix: `AssistantCloudThreadHistoryAdapter` handles `aui/v0` and `ai-sdk/v6` telemetry extraction, with no auto-format migration. |
| `assistant-stream` | `packages/assistant-stream/AGENTS.md` | `Structure/Key Concepts` should keep the 4-format model and map **DataStream→v4/v5**, **UIMessageStream→v6**. |
| Root | `AGENTS.md` | `Key Concepts`/`Packages` table remains package list, no format behavior changes required unless package set changes. |
| `react-data-stream` | *(no AGENTS.md in-repo)* | No AGENTS change target today; keep behavior documented in dependent package AGENTS/docs where runtime integration is orchestrated. |

### High-signal snippets to mirror

- **v6 format contract**:  
  `packages/cloud-ai-sdk/src/chat/MessagePersistence.ts` (`MESSAGE_FORMAT = "ai-sdk/v6"` and local `aiSdkFormatAdapter`)
  and `packages/react-ai-sdk/src/ui/adapters/aiSDKFormatAdapter.ts` (`format: "ai-sdk/v6"`)

- **v5 compatibility shim**:  
  `packages/react-ai-sdk/src/ui/utils/convertMessage.ts` (lines handling `data-*` parts)

- **Legacy format bridge**:  
  `packages/react/src/legacy-runtime/cloud/auiV0.ts` (`auiV0Encode/Decode`) and `packages/react/src/legacy-runtime/cloud/AssistantCloudThreadHistoryAdapter.tsx` (legacy `aui/v0` + v6 extractor branch)

- **Persistence format filtering**:  
  `packages/cloud/src/FormattedCloudPersistence.ts` (`load` filtered by `adapter.format`)

- **DataStream fallback path**:  
  `packages/react-data-stream/src/useDataStreamRuntime.ts` (`protocol: "data-stream"` / `"ui-message-stream"`)

### Quick verification queries

Use these commands after edits:

```bash
rg -n \"format: \\\"aui/v0\\\"|format: \\\"ai-sdk/v6\\\"|data-\\* parts|protocol: \\\"data-stream\\\"|protocol: \\\"ui-message-stream\\\"\" packages/react-ai-sdk packages/cloud-ai-sdk packages/cloud packages/react packages/assistant-stream packages/react-data-stream -g '!**/dist/**'
rg -n \"v5|v6|legacy|Unsupported|No longer\" packages/*/AGENTS.md apps/docs/content/docs -g '!**/dist/**'
```

Then ensure any AGENTS wording:
- names versions as supported vs compatibility,
- keeps the migration boundary explicit (`v4` and `v5` legacy),
- and aligns with package `package.json` peer/dependency versions.

### Current AGENTS.md issues (as of February 12, 2026)

- `packages/react-ai-sdk/AGENTS.md`:
  - Missing explicit version policy language (`v6` supported, `v5` compatibility-only, `v4` legacy via `react-data-stream` docs path).
  - Does not call out `convertMessage.ts` `data-*` compatibility shim as the cross-version normalization point.

- `packages/cloud-ai-sdk/AGENTS.md`:
  - Mentions `MessagePersistence` but does not explicitly document the `ai-sdk/v6` hard contract for stored message format.
  - Does not mention that v6 adapter logic is intentionally duplicated locally (with `react-ai-sdk`) and should be updated in lockstep.

- `packages/react/AGENTS.md`:
  - Missing `AssistantCloudThreadHistoryAdapter` format bridge note (`aui/v0` + `ai-sdk/v6` telemetry extraction path).
  - Missing explicit statement that there is no automatic format migration.

- `packages/assistant-stream/AGENTS.md`:
  - Lists the four formats but does not explicitly map version boundaries (`DataStream -> v4/v5`, `UIMessageStream -> v6`).

- Cross-package consistency:
  - Current package AGENTS files do not consistently use supported-vs-legacy wording for `v4`/`v5`/`v6`, which makes migration expectations ambiguous.
