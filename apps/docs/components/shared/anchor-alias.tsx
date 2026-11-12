/** Keeps an old heading anchor working after the heading was renamed: `#id` lands here, just above the new heading. */
export function AnchorAlias({ id }: { id: string }) {
  return <span id={id} aria-hidden className="block scroll-m-28" />;
}
