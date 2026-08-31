import { formatCompact } from "@/lib/format";

export function GitHubStars({ stars }: { stars: number | null }) {
  if (stars === null) {
    return <span>on GitHub</span>;
  }

  return (
    <span>
      <span className="tabular-nums">{formatCompact(stars)}</span> GitHub stars
    </span>
  );
}
