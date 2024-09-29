"use client";

import {
  type FC,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from "react";
import { create } from "zustand";
import { AttachmentContext } from "../react/AttachmentContext";
import { writableStore } from "../ReadonlyStore";
import { AttachmentRuntime } from "../../api/AttachmentRuntime";

type AttachmentRuntimeProviderProps = PropsWithChildren<{
  runtime: AttachmentRuntime;
}>;

const useAttachmentRuntimeStore = (runtime: AttachmentRuntime) => {
  const [store] = useState(() => create(() => runtime));

  useEffect(() => {
    writableStore(store).setState(runtime, true);
  }, [runtime, store]);

  return store;
};
const useAttachmentStore = (runtime: AttachmentRuntime) => {
  const [store] = useState(() => create(() => runtime.getState()));
  useEffect(() => {
    const updateState = () =>
      writableStore(store).setState(runtime.getState(), true);
    updateState();
    return runtime.subscribe(updateState);
  }, [runtime, store]);

  return store;
};

export const AttachmentRuntimeProvider: FC<AttachmentRuntimeProviderProps> = ({
  runtime,
  children,
}) => {
  const useAttachmentRuntime = useAttachmentRuntimeStore(runtime);
  const useAttachment = useAttachmentStore(runtime);
  const source = useAttachment((s) => s.source);
  const context = useMemo(() => {
    return {
      source,
      useAttachmentRuntime,
      useAttachment,
    };
  }, [useAttachmentRuntime, useAttachment]);

  return (
    <AttachmentContext.Provider value={context}>
      {children}
    </AttachmentContext.Provider>
  );
};
