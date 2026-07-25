import {
  normalizeSpec,
  type NormalizedUIElement,
  type NormalizedUINode,
} from "../ir";
import { boundSpec } from "./boundSpec";
import {
  CAROUSEL_ATTACHMENT_CAP,
  PAYLOAD_SOFT_CAP,
  buildAttachment,
  clampReasonDetail,
  utf8ByteLength,
} from "./constants";
import {
  convertElement,
  convertRootToCard,
  type ConversionContext,
} from "./toAdaptiveCard";
import type {
  TeamsAttachmentsResult,
  TeamsCardAttachment,
  TeamsConversionWarning,
  ToAdaptiveCardOptions,
} from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isElement = (node: NormalizedUINode): node is NormalizedUIElement =>
  isRecord(node);

const normalizedList = (
  node: NormalizedUINode | undefined,
): NormalizedUINode[] => {
  if (node === undefined || node === null) return [];
  if (!Array.isArray(node)) return [node];
  return node.flatMap((child) => normalizedList(child));
};

const clampArray = <T>(
  value: readonly T[],
  cap: number,
): { readonly items: T[]; readonly truncated: boolean } => ({
  items: value.slice(0, cap),
  truncated: value.length > cap,
});

/**
 * Recognizes a root that is a single `Carousel` element, returning its `Card`
 * children. Every child is routed through {@link convertElement} first (its
 * result is discarded) so an unknown or unsupported child still produces its
 * usual "dropped" warning instead of being filtered out silently; non-card
 * children are then dropped. `undefined` means the root is not exclusively a
 * root-level carousel, so the caller falls back to converting the whole tree
 * as one card.
 */
function rootCarouselCards(
  root: NormalizedUINode | readonly NormalizedUINode[],
  context: ConversionContext,
): NormalizedUIElement[] | undefined {
  const element = Array.isArray(root) && root.length === 1 ? root[0] : root;
  if (!isElement(element) || element.type !== "Carousel") return undefined;
  const cards: NormalizedUIElement[] = [];
  for (const child of normalizedList(element.children)) {
    if (!isElement(child)) continue;
    if (child.type === "Card") {
      cards.push(child);
    } else {
      convertElement(child, context, 1);
    }
  }
  return cards;
}

/**
 * Converts a generative-ui tree into Teams bot-framework message attachments.
 * A root-level `Carousel` becomes one attachment per `Card` child (clamped to
 * {@link CAROUSEL_ATTACHMENT_CAP}) with `attachmentLayout: "carousel"`;
 * anything else converts through {@link toAdaptiveCard}'s engine into a
 * single attachment. Never throws.
 */
export function toTeamsAttachments(
  node: unknown,
  _options?: ToAdaptiveCardOptions,
): TeamsAttachmentsResult {
  const warnings: TeamsConversionWarning[] = [];
  const context: ConversionContext = { warnings, usedInputIds: new Set() };
  try {
    const bounded = boundSpec(node, (reason) =>
      warnings.push({
        code: "clamped",
        component: "Root",
        detail: clampReasonDetail(reason),
      }),
    );
    const { root } = normalizeSpec(bounded as never);
    const carouselCards = rootCarouselCards(root, context);
    if (carouselCards !== undefined) {
      const { items, truncated } = clampArray(
        carouselCards,
        CAROUSEL_ATTACHMENT_CAP,
      );
      if (truncated) {
        warnings.push({
          code: "clamped",
          component: "Carousel",
          detail: `cards were clamped to ${CAROUSEL_ATTACHMENT_CAP} entries.`,
        });
      }
      const attachments: TeamsCardAttachment[] = items.map((child) =>
        buildAttachment(convertRootToCard(child, context)),
      );
      const size = utf8ByteLength(JSON.stringify(attachments));
      if (size > PAYLOAD_SOFT_CAP) {
        warnings.push({
          code: "clamped",
          component: "Carousel",
          detail: `the carousel attachments total ${size} bytes, exceeding Teams' 100 KB bot message limit.`,
        });
      }
      return { attachments, attachmentLayout: "carousel", warnings };
    }
    const attachment = buildAttachment(convertRootToCard(root, context));
    return { attachments: [attachment], warnings };
  } catch {
    return {
      attachments: [],
      warnings: [
        {
          code: "dropped",
          component: "Root",
          detail: "Input could not be converted.",
        },
      ],
    };
  }
}
