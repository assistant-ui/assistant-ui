import { PreviewCanvas } from './preview/PreviewCanvas';
import type { PlaygroundState } from './types';

type ExportStatus = 'idle' | 'exporting' | 'error';

export function PlaygroundCanvas({
  playground,
  onExportWorkspace,
  exportStatus = 'idle',
  exportError = null,
  exportDisabled = true,
  exportTitle = '',
}: {
  playground: PlaygroundState;
  onExportWorkspace?: (() => void | Promise<void>) | undefined;
  exportStatus?: ExportStatus | undefined;
  exportError?: string | null | undefined;
  exportDisabled?: boolean | undefined;
  exportTitle?: string | undefined;
}) {
  return (
    <section data-slot="playground-canvas" className="flex h-full min-h-0 flex-col bg-background">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
        <PreviewCanvas
          playground={playground}
          onExportWorkspace={onExportWorkspace}
          exportStatus={exportStatus}
          exportError={exportError}
          exportDisabled={exportDisabled}
          exportTitle={exportTitle}
        />
      </div>
    </section>
  );
}
