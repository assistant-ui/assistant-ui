import { useEffect, useState } from "react";
import { createProgressSimulation } from "./progress-simulation";

const TICK_MS = 250;
const COMPLETE_MS = 600;

type Simulation = ReturnType<typeof createProgressSimulation>;

const simulations = new Map<string, Simulation>();

const freshSimulation = (stepKey: string) => {
  const simulation = createProgressSimulation(Math.random() * 2 ** 32);
  simulations.set(stepKey, simulation);
  return simulation;
};

export function useSyntheticProgress({
  active,
  stepKey,
}: {
  active: boolean;
  stepKey: string;
}) {
  const [simulation, setSimulation] = useState(
    () => simulations.get(stepKey) ?? freshSimulation(stepKey),
  );
  const [value, setValue] = useState(simulation.value);
  const [seenKey, setSeenKey] = useState(stepKey);
  const [complete, setComplete] = useState(false);
  if (seenKey !== stepKey) {
    setSeenKey(stepKey);
    setValue(1);
    setComplete(true);
  }
  useEffect(() => {
    if (!complete) return;
    const timer = setTimeout(() => {
      setSimulation(freshSimulation(seenKey));
      setValue(0);
      setComplete(false);
    }, COMPLETE_MS);
    return () => clearTimeout(timer);
  }, [complete, seenKey]);
  useEffect(() => {
    if (!active || complete) return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      setValue(simulation.advance(now - last));
      last = now;
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [active, complete, simulation]);
  return { value, complete };
}
