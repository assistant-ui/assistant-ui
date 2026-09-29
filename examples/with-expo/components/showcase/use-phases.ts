import { useEffect, useState } from "react";

export function usePhases(durations: readonly number[]): number {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPhase((currentPhase) => (currentPhase + 1) % durations.length);
    }, durations[phase]);

    return () => clearTimeout(timeout);
  }, [durations, phase]);

  return phase;
}
