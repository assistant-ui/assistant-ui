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
  prev: Record<string, WebMcpRegistrationEntry>,
  next: Record<string, WebMcpRegistrationEntry>,
): WebMcpRegistrationDiff => {
  const added: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];

  for (const [name, nextEntry] of Object.entries(next)) {
    const prevEntry = prev[name];
    if (!prevEntry) {
      added.push(name);
    } else if (
      prevEntry.description !== nextEntry.description ||
      prevEntry.inputSchemaJson !== nextEntry.inputSchemaJson
    ) {
      updated.push(name);
    }
  }
  for (const name of Object.keys(prev)) {
    if (!(name in next)) removed.push(name);
  }

  return { added, updated, removed };
};
