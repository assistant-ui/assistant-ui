export function ToolDiff({
  filePath,
  oldContent,
  newContent,
}: {
  filePath?: string | undefined;
  oldContent?: string | undefined;
  newContent?: string | undefined;
}) {
  return (
    <div className="space-y-2">
      {filePath ? (
        <div className="text-muted-foreground text-xs">{filePath}</div>
      ) : null}
      {oldContent ? (
        <pre className="scrollbar-thin max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-red-500/30 bg-red-500/10 p-3 text-red-900 text-xs dark:text-red-100">
          {oldContent}
        </pre>
      ) : null}
      {newContent ? (
        <pre className="scrollbar-thin max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-900 text-xs dark:text-emerald-100">
          {newContent}
        </pre>
      ) : null}
    </div>
  );
}
