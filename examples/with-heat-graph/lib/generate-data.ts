import type { DataPoint } from "heat-graph";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

export function generateSampleData(
  end: Date = new Date(),
  days = 365,
): DataPoint[] {
  const data: DataPoint[] = [];
  const rand = seededRandom(42);

  for (let i = 0; i < days; i++) {
    const date = new Date(end);
    date.setDate(date.getDate() - (days - 1 - i));

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base activity: higher on weekdays
    const base = isWeekend ? 2 : 8;
    const noise = rand();

    // Create some streaks and gaps
    const monthProgress = date.getDate() / 31;
    const monthBoost = Math.sin(monthProgress * Math.PI) * 5;

    // Some days have no activity
    if (noise < 0.15) {
      continue;
    }

    const count = Math.max(0, Math.round(base + monthBoost + noise * 12 - 3));

    if (count > 0) {
      data.push({ date, count });
    }
  }

  return data;
}
