import type { Grade } from "./judge.ts";

/** A person's grade; the concept exam also used "missing" for "the reader found nothing". */
export type HandGrade = Grade | "missing";

export interface Agreement {
  n: number;
  /** Share of answers where judge and person gave the same grade. */
  exact: number;
  /** Share where both said correct, or both said not correct. */
  correctVsNot: number;
  /** Cohen's kappa on correct vs not, which discounts agreement by chance. */
  kappa: number;
  /** Of the answers the person marked not correct, the share the judge also did. */
  notCorrectRecall: number;
  /** Of the answers the judge marked not correct, the share the person also did. */
  notCorrectPrecision: number;
  /** confusion[hand][judge] = count */
  confusion: Record<string, Record<string, number>>;
}

const ratio = (a: number, b: number) => (b === 0 ? 1 : a / b);

export function agreement(
  pairs: { hand: HandGrade; judge: Grade }[],
): Agreement {
  // No pairs means nothing was validated, not perfect agreement.
  if (pairs.length === 0) throw new Error("no graded answers to compare");
  const confusion: Record<string, Record<string, number>> = {};
  let exact = 0;
  let both = 0;
  let handNot = 0;
  let judgeNot = 0;
  let bothNot = 0;
  for (const { hand: h, judge: j } of pairs) {
    const hand = h === "missing" ? "wrong" : h;
    confusion[hand] ??= {};
    confusion[hand][j] = (confusion[hand][j] ?? 0) + 1;
    if (hand === j) exact++;
    const hc = hand === "correct";
    const jc = j === "correct";
    if (hc === jc) both++;
    if (!hc) handNot++;
    if (!jc) judgeNot++;
    if (!hc && !jc) bothNot++;
  }
  const n = pairs.length;
  const po = ratio(both, n);
  const pHand = ratio(handNot, n);
  const pJudge = ratio(judgeNot, n);
  const pe = pHand * pJudge + (1 - pHand) * (1 - pJudge);
  return {
    n,
    exact: ratio(exact, n),
    correctVsNot: po,
    kappa: pe === 1 ? 1 : (po - pe) / (1 - pe),
    notCorrectRecall: ratio(bothNot, handNot),
    notCorrectPrecision: ratio(bothNot, judgeNot),
    confusion,
  };
}
