"use client";

export const SampleFrame = ({
  sampleText,
  children,
}: {
  sampleText?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="bg-muted/50 relative rounded-lg border p-4">
      <div className="bg-primary text-primary-foreground absolute -top-2 left-4 rounded px-2 py-0.5 text-xs">
        {sampleText || "Sample"}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
};
