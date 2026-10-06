import { act, waitFor } from "@testing-library/react";

// React 18's act holds renders until its callback settles, so a task that waits on a render starts inside act and settles outside it, where React can commit what the task waits on.
export async function settleOutsideAct<T>(task: () => Promise<T>): Promise<T> {
  let pending!: Promise<T>;
  await act(async () => {
    pending = task();
    pending.catch(() => {});
  });
  await waitFor(() => pending.then(settled, settled));
  await act(async () => {});
  return pending;
}

const settled = () => {};
