import { createTransformer } from "../utils/createTransformer";

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
    root.find(j.Literal).forEach((path: any) => {
      const node = path.value;

      if (typeof node.value === "string") {
        const oldEventName = node.value;

        if (Object.hasOwn(eventNameMap, oldEventName)) {
          const newEventName = eventNameMap[oldEventName];
          node.value = newEventName;
          markAsChanged();
        }
      }
    });

    root.find(j.TemplateLiteral).forEach((path: any) => {
      const node = path.value;

      node.quasis.forEach((quasi: any) => {
        if (quasi.value && typeof quasi.value.raw === "string") {
          const oldEventName = quasi.value.raw;

          if (Object.hasOwn(eventNameMap, oldEventName)) {
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
