import { FC, PropsWithChildren } from "react";
import { useThread } from "../../hooks/useThread";

export type ThreadIfProps = PropsWithChildren<{
  empty?: boolean;
  running?: boolean;
  loading?: boolean;
}>;

export const ThreadIf: FC<ThreadIfProps> = ({
  empty,
  running,
  loading,
  children,
}) => {
  const isEmpty = useThread((state) => state.isEmpty);
  const isRunning = useThread((state) => state.isRunning);
  const isLoading = useThread((state) => state.isLoading);

  const shouldRender =
    (empty === undefined || empty === isEmpty) &&
    (running === undefined || running === isRunning) &&
    (loading === undefined || loading === isLoading);

  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
};
