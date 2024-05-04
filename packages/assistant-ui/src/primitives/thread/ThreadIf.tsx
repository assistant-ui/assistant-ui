"use client";
import { FC } from "react";
import { useThreadContext } from "../../utils/context/Context";
import { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type ThreadIfFilters = {
  empty: boolean;
  busy: boolean;
};

type ThreadIfProps = RequireAtLeastOne<ThreadIfFilters> & {
  children: React.ReactNode;
};

const useThreadIf = (props: RequireAtLeastOne<ThreadIfFilters>) => {
  const thread = useThreadContext();

  if (props.empty === true && thread.messages.length !== 0) return false;
  if (props.empty === false && thread.messages.length === 0) return false;
  if (props.busy === true && !thread.isLoading) return false;
  if (props.busy === false && thread.isLoading) return false;

  return true;
};

export const ThreadIf: FC<ThreadIfProps> = ({ children, ...query }) => {
  const result = useThreadIf(query);
  return result ? children : null;
};
