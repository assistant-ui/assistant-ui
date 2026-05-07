import type { PlaygroundState } from '../types';
import { ExamplePreviewCard } from './ExamplePreviewCard';

export function PreviewCanvas({ playground }: { playground: PlaygroundState }) {
  if (!playground.selectedExample) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading examples…
      </div>
    );
  }

  return (
    <ExamplePreviewCard
      example={playground.selectedExample}
      preview={playground.preview}
      codeHandoff={playground.codeHandoff}
    />
  );
}
