// React 18's act holds renders until its callback settles, so a task that waits on a render starts inside act and settles outside it, where React can commit what the task waits on.
export function createSettleOutsideAct(act, waitFor) {
  return async function settleOutsideAct(task) {
    let pending;
    await act(async () => {
      pending = task();
      pending.catch(() => {});
    });
    await waitFor(() => pending.then(settled, settled));
    await act(async () => {});
    return pending;
  };
}

const settled = () => {};
