export function cacheListing(
  scan: () => Promise<string[]>,
): () => Promise<string[]> {
  let cache: Promise<string[]> | null = null;
  return () => {
    if (!cache) {
      cache = scan().catch((error) => {
        cache = null;
        throw error;
      });
    }
    return cache;
  };
}
