"use client";

import { useState, useEffect } from "react";

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  return `${hours}h ago`;
}

export function useRelativeTime(timestamp: Date): string {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const age = Date.now() - timestamp.getTime();

    // Update frequency based on age:
    // - Under 1 minute: every second
    // - Under 1 hour: every 30 seconds
    // - Otherwise: every minute
    let interval: number;
    if (age < 60_000) {
      interval = 1000;
    } else if (age < 3_600_000) {
      interval = 30_000;
    } else {
      interval = 60_000;
    }

    const timer = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, interval);

    return () => clearInterval(timer);
  }, [timestamp]);

  return formatRelativeTime(timestamp);
}
