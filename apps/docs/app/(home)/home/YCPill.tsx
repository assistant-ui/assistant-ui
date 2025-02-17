"use client";
export function YCPill() {
  return (
    <div className="flex justify-center">
      <a
        className="rainbow-border relative items-center justify-center rounded-full p-[1px] text-sm after:absolute after:inset-0 after:-z-10 after:block after:rounded-full"
        href="https://www.ycombinator.com/launches/Mnc-assistant-ui-open-source-typescript-react-library-for-ai-chat"
      >
        <span className="bg-background inline-flex items-center gap-1 overflow-clip whitespace-nowrap rounded-full px-5 py-1.5">
          <div>Backed by</div>
          <div className="text-[#f60]">Y Combinator</div>
        </span>
      </a>
    </div>
  );
}
