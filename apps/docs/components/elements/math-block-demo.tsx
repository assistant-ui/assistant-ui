"use client";

import { Frac, MathBlock, Sub, Sup } from "@/components/elements/math-block";
import { useStoryPhases } from "./use-demo";

const PHASES = [900, 900, 0] as const;

export function MathBlockDemo() {
  const { phase } = useStoryPhases(PHASES);

  const steps = [
    {
      expression: (
        <>
          p(x) ={" "}
          <Frac
            over={<>1</>}
            under={
              <>
                1 + e<Sup>−x</Sup>
              </>
            }
          />
        </>
      ),
      note: "the logistic",
    },
    {
      expression: <>p′(x) = p(x)·(1 − p(x))</>,
      note: "its derivative",
    },
    {
      expression: (
        <>
          max<Sub>x</Sub> p′(x) = 0.25 at x = 0
        </>
      ),
      note: "steepest at the midpoint",
    },
  ];

  return (
    <MathBlock
      label="derivation"
      steps={steps}
      visibleSteps={Math.min(phase + 1, steps.length)}
    />
  );
}
