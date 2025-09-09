import {
  createContext,
  tapContext,
  withContextProvider,
} from "@assistant-ui/tap";
import { EventManagerActions } from "../legacy-runtime/client/EventManagerRuntimeClient";

const EventsContext = createContext<EventManagerActions>({
  on: () => () => {},
  emit: () => {},
});

export const withEventsProvider = <TResult>(
  events: EventManagerActions,
  fn: () => TResult,
) => {
  return withContextProvider(EventsContext, events, fn);
};

export const tapEvents = () => {
  return tapContext(EventsContext);
};
