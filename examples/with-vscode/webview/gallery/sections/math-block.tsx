import {
  Frac,
  MathBlock,
  Sub,
  Sup,
} from "@assistant-ui/ui/components/assistant-ui/elements/math-block.tsx";
import { defineSections } from "../types";

const STEPS = [
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
  { expression: <>p′(x) = p(x)·(1 − p(x))</>, note: "its derivative" },
  {
    expression: (
      <>
        max<Sub>x</Sub> p′(x) = 0.25 at x = 0
      </>
    ),
    note: "steepest at the midpoint",
  },
];

export default defineSections([
  {
    id: "math-block",
    title: "Math block",
    category: "content",
    notes:
      "Hand-set math (Frac, Sup, Sub) without KaTeX, so no font files load; all three steps visible.",
    render: () => (
      <MathBlock label="derivation" steps={STEPS} visibleSteps={3} />
    ),
  },
  {
    id: "math-block-partial",
    title: "Math block (streaming)",
    category: "content",
    notes: "One of three steps revealed.",
    render: () => (
      <MathBlock label="derivation" steps={STEPS} visibleSteps={1} />
    ),
  },
]);
