"use client";
import { StarIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function StarPill() {
  const [stars, setStars] = useState<number | null>(3000);

  useEffect(() => {
    fetch("https://api.github.com/repos/assistant-ui/assistant-ui")
      .then((res) => res.json())
      .then((data) => setStars(data.stargazers_count))
      .catch(console.error);
  }, []);

  return (
    <div className="mb-2 flex">
      <a
        className="rainbow-border after:-z-10 relative items-center justify-center rounded-full p-[1px] text-sm after:absolute after:inset-0 after:block after:rounded-full"
        href="https://github.com/assistant-ui/assistant-ui"
      >
        <span className="inline-flex items-center gap-2 overflow-clip whitespace-nowrap rounded-full bg-background px-5 py-1.5">
          <span className="hidden text-md dark:inline">🌟</span>
          <span className="text-md dark:hidden">
            <StarIcon className="size-4 fill-amber-300 text-amber-600" />
          </span>
          <div className="font-medium text-amber-600 dark:text-amber-400">
            {stars}
          </div>
          <div className="ml-2 font-semibold">Star us on GitHub</div>
        </span>
      </a>
    </div>
  );
}
