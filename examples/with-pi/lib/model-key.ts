/** Stable, collision-free model option id — model ids repeat across providers.
 * Shared by the server handshake and the composer's model selector; the two
 * must agree for the seeded selection to preselect in the UI. */
export const modelKey = (provider: string, modelId: string): string =>
  `${provider}:${modelId}`;
