import { formatCompact } from "@/lib/format";

export function NpmDownloads({ downloads }: { downloads: number | null }) {
  if (downloads === null) {
    return <span>on npm</span>;
  }

  return (
    <span>
      <span className="tabular-nums">{formatCompact(downloads)}</span> weekly
      downloads
    </span>
  );
}
