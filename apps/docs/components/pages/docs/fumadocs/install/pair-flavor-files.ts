type FlavorFile = { path: string };

/**
 * Pairs each Base UI file with the next unpaired Radix UI file at the same
 * path, so a path that two registry items both ship pairs one-to-one. Radix
 * UI files left over have no Base UI counterpart.
 */
export function pairFlavorFiles<F extends FlavorFile>(
  base: readonly F[],
  radix: readonly F[],
): { pairs: (readonly [F, F | undefined])[]; radixOnly: F[] } {
  const unpaired = new Map<string, F[]>();
  for (const file of radix) {
    unpaired.set(file.path, [...(unpaired.get(file.path) ?? []), file]);
  }
  const pairs = base.map(
    (file) => [file, unpaired.get(file.path)?.shift()] as const,
  );
  const radixOnly = radix.filter((file) =>
    unpaired.get(file.path)?.includes(file),
  );
  return { pairs, radixOnly };
}
