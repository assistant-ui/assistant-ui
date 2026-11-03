"use client";

import {
  Frac,
  MathBlock,
  Sub,
  Sup,
  type MathStep,
} from "@/components/assistant-ui/elements/math-block";
import { defineStates } from "./types";

const LOGISTIC: readonly MathStep[] = [
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

const BARE: readonly MathStep[] = [
  {
    expression: (
      <>
        (a + b)<Sup>2</Sup> = a<Sup>2</Sup> + 2ab + b<Sup>2</Sup>
      </>
    ),
  },
];

const LONG: readonly MathStep[] = [
  {
    expression: (
      <>
        L(θ) = −
        <Frac over={<>1</>} under={<>N</>} />Σ<Sub>i=1</Sub>
        <Sup>N</Sup> [ y<Sub>i</Sub> log σ(θ<Sup>T</Sup>x<Sub>i</Sub>) + (1 − y
        <Sub>i</Sub>) log(1 − σ(θ<Sup>T</Sup>x<Sub>i</Sub>)) ] + λ‖θ‖
        <Sub>2</Sub>
        <Sup>2</Sup>
      </>
    ),
    note: "regularized cross-entropy over N examples",
  },
  {
    expression: (
      <>
        ∇<Sub>θ</Sub>L = <Frac over={<>1</>} under={<>N</>} /> X<Sup>T</Sup>
        (σ(Xθ) − y) + 2λθ
      </>
    ),
    note: "its gradient, which scrolls when it is wider than the card",
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "The first step has arrived and the rest of the working is still coming.",
    Component: () => (
      <MathBlock label="derivation" steps={LOGISTIC} visibleSteps={1} />
    ),
  },
  {
    key: "complete",
    label: "Complete",
    note: "Every step of the derivation is shown.",
    Component: () => (
      <MathBlock
        label="derivation"
        steps={LOGISTIC}
        visibleSteps={LOGISTIC.length}
      />
    ),
  },
  {
    key: "bare",
    label: "No label",
    note: "A single expression with no label or step notes.",
    Component: () => <MathBlock steps={BARE} visibleSteps={1} />,
  },
  {
    key: "long-content",
    label: "Long expression",
    note: "An expression wider than the card scrolls on its own line.",
    Component: () => (
      <MathBlock label="loss" steps={LONG} visibleSteps={LONG.length} />
    ),
  },
]);
