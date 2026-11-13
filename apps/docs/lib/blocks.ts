import {
  BLOCKS as REGISTRY_BLOCKS,
  blockRegistryName,
  type BlockEntry,
  type BlockFile,
} from "../../registry/src/blocks";

export type { BlockFile };

export type Block = BlockEntry & {
  index: number;
  href: string;
  /** The name the shadcn CLI installs: `@assistant-ui/<registryName>`. */
  registryName: string;
};

export const BLOCKS: Block[] = REGISTRY_BLOCKS.map((block, index) => ({
  ...block,
  index: index + 1,
  href: `/blocks/${block.slug}`,
  registryName: blockRegistryName(block.slug),
}));

export const getBlock = (slug: string): Block | undefined =>
  BLOCKS.find((block) => block.slug === slug);
