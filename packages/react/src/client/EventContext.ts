import {
  createContext,
  tapContext,
  withContextProvider,
} from "@assistant-ui/tap";
import { EventManager } from "../legacy-runtime/client/EventManagerRuntimeClient";

const EventsContext = createContext<EventManager | null>(null);

export const withEventsProvider = <TResult>(
  events: EventManager,
  fn: () => TResult,
) => {
  return withContextProvider(EventsContext, events, fn);
};

export const tapEvents = () => {
  const events = tapContext(EventsContext);
  if (!events) throw new Error("Events context is not available");

  return events;
};
