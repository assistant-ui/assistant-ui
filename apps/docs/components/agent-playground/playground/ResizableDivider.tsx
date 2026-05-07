import { useEffect, useRef, useState } from 'react';

interface ResizableDividerProps {
  onResize: (fraction: number) => void;
  initialFraction?: number | undefined;
  minFraction?: number | undefined;
  maxFraction?: number | undefined;
}

export function ResizableDivider({
  onResize,
  minFraction = 0.2,
  maxFraction = 0.8,
}: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dividerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = dividerRef.current?.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fraction = Math.max(minFraction, Math.min(maxFraction, x / rect.width));
      onResize(fraction);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onResize, minFraction, maxFraction]);

  return (
    <div
      ref={dividerRef}
      className="relative flex w-1 cursor-col-resize bg-border hover:bg-foreground/50 transition-colors"
      onMouseDown={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`w-1 h-8 rounded-full transition-colors ${
            isDragging ? 'bg-foreground' : 'bg-muted-foreground/30 hover:bg-foreground/50'
          }`}
        />
      </div>
    </div>
  );
}
