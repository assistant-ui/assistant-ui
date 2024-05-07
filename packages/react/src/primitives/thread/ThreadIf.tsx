"use client";

import type { FC, PropsWithChildren } from "react";
import { useThreadContext } from "../../utils/context/ThreadContext";
import type { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type ThreadIfFilters = {
	empty: boolean | undefined;
	busy: boolean | undefined;
};

type ThreadIfProps = PropsWithChildren<RequireAtLeastOne<ThreadIfFilters>>;

const useThreadIf = (props: RequireAtLeastOne<ThreadIfFilters>) => {
	return useThreadContext("Thread.If", (s) => {
		const thread = s.chat;

		if (props.empty === true && thread.messages.length !== 0) return false;
		if (props.empty === false && thread.messages.length === 0) return false;
		if (props.busy === true && !thread.isLoading) return false;
		if (props.busy === false && thread.isLoading) return false;

		return true;
	});
};

export const ThreadIf: FC<ThreadIfProps> = ({ children, ...query }) => {
	const result = useThreadIf(query);
	return result ? children : null;
};
