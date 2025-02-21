"use client";

import { useEffect, useState } from "react";

export function GitHubStars() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/assistant-ui/assistant-ui")
      .then((res) => res.json())
      .then((data) => setStars(data.stargazers_count))
      .catch(console.error);
  }, []);

  if (stars === null) return null;

  return (
    <div className="flex items-center gap-1">
      <span className="text-xl">🌟</span>
      <span className="text-base">{stars}</span>
    </div>
  );
}
