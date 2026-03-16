"use client";

import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import {
  UserInputProvider,
  useUserInputState,
} from "../hooks/useUserInputState";
import type { UserInputStatus, UserInputQuestion } from "../runtime/types";

export interface UserInputRootProps {
  requestId: string;
  children: ReactNode;
}

const UserInputRoot = ({ requestId, children }: UserInputRootProps) => {
  return (
    <UserInputProvider requestId={requestId}>{children}</UserInputProvider>
  );
};

UserInputRoot.displayName = "UserInputPrimitive.Root";

const UserInputQuestions = ({
  children,
}: {
  children: (question: UserInputQuestion) => ReactNode;
}) => {
  const questions = useUserInputState((s) => s.questions);
  if (!questions) return null;
  return <>{questions.map((q: UserInputQuestion) => children(q))}</>;
};

UserInputQuestions.displayName = "UserInputPrimitive.Questions";

const UserInputStatusDisplay = (props: ComponentPropsWithoutRef<"span">) => {
  const status = useUserInputState((s) => s.status);
  if (!status) return null;
  return <span {...props}>{status}</span>;
};

UserInputStatusDisplay.displayName = "UserInputPrimitive.Status";

export interface UserInputIfProps {
  status: UserInputStatus | UserInputStatus[];
  children: ReactNode;
}

const UserInputIf = ({ status, children }: UserInputIfProps) => {
  const currentStatus = useUserInputState((s) => s.status);
  if (!currentStatus) return null;
  const statuses = Array.isArray(status) ? status : [status];
  if (!statuses.includes(currentStatus)) return null;
  return <>{children}</>;
};

UserInputIf.displayName = "UserInputPrimitive.If";

export const UserInputPrimitive = {
  Root: UserInputRoot,
  Questions: UserInputQuestions,
  Status: UserInputStatusDisplay,
  If: UserInputIf,
};
