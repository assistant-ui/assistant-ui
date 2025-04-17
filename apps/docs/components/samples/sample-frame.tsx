"use client";

export const SampleFrame = ({
    sampleText,
    children,
}: {
    sampleText?: string;
    children: React.ReactNode;
}) => {
  return (
    <div className="relative border rounded-lg p-4 bg-muted/50">
      <div className="absolute -top-2 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded">
        {sampleText || "Sample"}
      </div>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
};
