import { createContext } from "react";

export type CloudInitializeResponse = {
  remoteId: string;
  externalId: string | undefined;
};

type CloudContextValue = {
  initialize: () => Promise<CloudInitializeResponse>;
};

export const CloudContext = createContext<CloudContextValue | null>(null);
