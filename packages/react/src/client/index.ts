// Re-export moved clients from core (matching previous public API)
export { ModelContext as ModelContextClient } from "@assistant-ui/core/store";
export { Suggestions, type SuggestionConfig } from "@assistant-ui/core/store";
export { ChainOfThoughtClient } from "@assistant-ui/core/store";

// Local clients (React-specific)
export { Tools } from "./Tools";
export { DataRenderers } from "./DataRenderers";
export {
  ExternalThread,
  type ExternalThreadProps,
  type ExternalThreadMessage,
} from "./ExternalThread";
export {
  InMemoryThreadList,
  type InMemoryThreadListProps,
} from "./InMemoryThreadList";
