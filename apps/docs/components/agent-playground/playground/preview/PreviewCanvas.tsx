import type { PlaygroundState } from "../types";
import { ExamplePreviewCard } from "./ExamplePreviewCard";

type ExportStatus = "idle" | "exporting" | "error";

export function PreviewCanvas({
  playground,
  onExportWorkspace,
  exportStatus,
  exportError,
  exportDisabled,
  exportTitle,
}: {
  playground: PlaygroundState;
  onExportWorkspace?: (() => void | Promise<void>) | undefined;
  exportStatus?: ExportStatus | undefined;
  exportError?: string | null | undefined;
  exportDisabled?: boolean | undefined;
  exportTitle?: string | undefined;
}) {
  if (!playground.selectedExample) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Loading examples…
      </div>
    );
  }

  return (
    <ExamplePreviewCard
      example={playground.selectedExample}
      preview={playground.preview}
      codeHandoff={playground.codeHandoff}
      onExportWorkspace={onExportWorkspace}
      exportStatus={exportStatus}
      exportError={exportError}
      exportDisabled={exportDisabled}
      exportTitle={exportTitle}
    />
  );
}
