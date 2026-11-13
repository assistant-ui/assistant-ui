/**
 * `setup-agent/guide`: what the setup server needs to serve the CLI's guide
 * at `<setup-url>/guide`. The builder, its checks and the CLI side stay
 * internal so they can change between releases; see `guide-builder.ts`.
 */
export {
  GUIDE_PROTOCOL,
  MIN_GUIDE_PROTOCOL,
  buildGuide,
  respondToGuideRequest,
} from "./guide-builder";
export type {
  Guide,
  GuideContext,
  GuideRequest,
  GuideResponse,
  GuideStep,
  GuideTextKey,
} from "./guide-builder";
