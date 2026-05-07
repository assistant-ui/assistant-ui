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
      {filePath ? <div className="text-xs text-muted-foreground">{filePath}</div> : null}
      {oldContent ? (
        <pre className="scrollbar-thin max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-900 dark:text-red-100">
          {oldContent}
        </pre>
      ) : null}
      {newContent ? (
        <pre className="scrollbar-thin max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-100">
          {newContent}
        </pre>
      ) : null}
    </div>
  );
}
