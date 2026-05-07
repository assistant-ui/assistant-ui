import { PreviewCanvas } from './preview/PreviewCanvas';
import type { PlaygroundState } from './types';

export function PlaygroundCanvas({ playground }: { playground: PlaygroundState }) {
  return (
    <section data-slot="playground-canvas" className="flex h-full min-h-0 flex-col bg-background">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
        <PreviewCanvas playground={playground} />
      </div>
    </section>
  );
}
