import { createTransformer } from "../utils/createTransformer";

// Map of old kebab-case event names to new camelCase event names
const eventNameMap: Record<string, string> = {
  "thread.run-start": "thread.runStart",
  "thread.run-end": "thread.runEnd",
  "thread.model-context-update": "thread.modelContextUpdate",
  "composer.attachment-add": "composer.attachmentAdd",
  "thread-list-item.switched-to": "threadListItem.switchedTo",
  "thread-list-item.switched-away": "threadListItem.switchedAway",
};

const migrateEventNamesToCamelCase = createTransformer(
  ({ j, root, markAsChanged }) => {
    // Find all string literals in the code
    root.find(j.Literal).forEach((path: any) => {
      const node = path.value;

      // Check if this is a string literal
      if (typeof node.value === "string") {
        const oldEventName = node.value;

        // Check if this event name needs to be migrated
        if (eventNameMap[oldEventName]) {
          const newEventName = eventNameMap[oldEventName];
          node.value = newEventName;
          markAsChanged();
        }
      }
    });

    // Also handle template literals (in case event names are in template strings)
    root.find(j.TemplateLiteral).forEach((path: any) => {
      const node = path.value;

      // Check quasi (string parts) in template literals
      node.quasis.forEach((quasi: any) => {
        if (quasi.value && typeof quasi.value.raw === "string") {
          const oldEventName = quasi.value.raw;

          if (eventNameMap[oldEventName]) {
            const newEventName = eventNameMap[oldEventName];
            quasi.value.raw = newEventName;
            quasi.value.cooked = newEventName;
            markAsChanged();
          }
        }
      });
    });
  },
);

export default migrateEventNamesToCamelCase;
