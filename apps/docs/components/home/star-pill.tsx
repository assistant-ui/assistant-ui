"use client";

import { StarIcon } from "lucide-react";
import { useEffect, useState } from "react";

const formatStars = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toString();

export function StarPill() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/assistant-ui/assistant-ui")
      .then((res) => res.json())
      .then((data) => setStars(data.stargazers_count))
      .catch(console.error);
  }, []);

  return (
    <a
      href="https://github.com/assistant-ui/assistant-ui"
      className="rainbow-border relative inline-flex w-fit rounded-full p-px text-sm after:absolute after:inset-0 after:-z-10 after:block after:rounded-full"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-1.5">
        <StarIcon className="size-3.5 fill-amber-400 text-amber-500" />
        <span className="font-medium text-amber-600 tabular-nums dark:text-amber-400">
          {stars ? formatStars(stars) : "—"}
        </span>
        <span className="ml-1 font-medium text-foreground/80">
          Star us on GitHub
        </span>
      </span>
    </a>
  );
}
