export type WebMcpRegistrationEntry = {
  description: string;
  inputSchemaJson: string;
};

export type WebMcpRegistrationDiff = {
  added: string[];
  updated: string[];
  removed: string[];
};

export const diffRegistrations = (
  prev: ReadonlyMap<string, WebMcpRegistrationEntry>,
  next: ReadonlyMap<string, WebMcpRegistrationEntry>,
): WebMcpRegistrationDiff => {
  const added: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];

  for (const [name, nextEntry] of next) {
    const prevEntry = prev.get(name);
    if (!prevEntry) {
      added.push(name);
    } else if (
      prevEntry.description !== nextEntry.description ||
      prevEntry.inputSchemaJson !== nextEntry.inputSchemaJson
    ) {
      updated.push(name);
    }
  }
  for (const name of prev.keys()) {
    if (!next.has(name)) removed.push(name);
  }

  return { added, updated, removed };
};
