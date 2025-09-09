import {
  createContext,
  tapContext,
  withContextProvider,
} from "@assistant-ui/tap";
import { EventManagerActions } from "../legacy-runtime/client/EventManagerRuntimeClient";

const EventsContext = createContext<EventManagerActions | null>(null);

export const withEventsProvider = <TResult>(
  events: EventManagerActions,
  fn: () => TResult,
) => {
  return withContextProvider(EventsContext, events, fn);
};

export const tapEvents = () => {
  const events = tapContext(EventsContext);
  if (!events) throw new Error("Events context is not available");

  return events;
};
