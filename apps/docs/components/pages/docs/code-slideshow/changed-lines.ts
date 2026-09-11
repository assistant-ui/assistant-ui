import type { BlockAnnotation } from "codehike/code";

export const changedLineAnnotations = (
  previous: string,
  next: string,
): BlockAnnotation[] => {
  const a = previous.split("\n");
  const b = next.split("\n");

  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] =
        a[i] === b[j]
          ? lcs[i + 1]![j + 1]! + 1
          : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const changed: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      i++;
    } else {
      changed.push(j++);
    }
  }
  while (j < b.length) changed.push(j++);

  const marked = new Set(changed.filter((line) => b[line]!.trim() !== ""));
  let k = 0;
  while (k < b.length) {
    if (b[k]!.trim() !== "") {
      k++;
      continue;
    }
    let end = k;
    while (end < b.length && b[end]!.trim() === "") end++;
    if (k > 0 && end < b.length && marked.has(k - 1) && marked.has(end)) {
      for (let blank = k; blank < end; blank++) marked.add(blank);
    }
    k = end;
  }

  return [...marked]
    .sort((x, y) => x - y)
    .reduce<BlockAnnotation[]>((annotations, line) => {
      const last = annotations.at(-1);
      if (last && last.toLineNumber === line) {
        last.toLineNumber = line + 1;
      } else {
        annotations.push({
          name: "mark",
          query: "",
          fromLineNumber: line + 1,
          toLineNumber: line + 1,
        });
      }
      return annotations;
    }, []);
};
