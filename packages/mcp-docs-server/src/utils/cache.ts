export function cacheListing(
  scan: () => Promise<string[]>,
): () => Promise<string[]> {
  let cache: Promise<string[]> | null = null;
  return () => {
    if (!cache) {
      cache = scan().then(
        (result) => {
          if (result.length === 0) cache = null;
          return result;
        },
        (error) => {
          cache = null;
          throw error;
        },
      );
    }
    return cache;
  };
}
