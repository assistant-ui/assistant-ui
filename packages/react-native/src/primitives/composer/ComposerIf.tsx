import { FC, PropsWithChildren } from "react";
import { useComposer } from "../../hooks/useComposer";
import { useThread } from "../../hooks/useThread";

export type ComposerIfProps = PropsWithChildren<{
  canSend?: boolean;
  running?: boolean;
  empty?: boolean;
}>;

export const ComposerIf: FC<ComposerIfProps> = ({
  canSend,
  running,
  empty,
  children,
}) => {
  const composerCanSend = useComposer((state) => state.canSend);
  const composerIsEmpty = useComposer((state) => state.isEmpty);
  const isRunning = useThread((state) => state.isRunning);

  const shouldRender =
    (canSend === undefined || canSend === composerCanSend) &&
    (running === undefined || running === isRunning) &&
    (empty === undefined || empty === composerIsEmpty);

  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
};
