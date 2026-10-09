export type SearchHeading = {
  id: string;
  content: string;
};

export type SearchRecord = {
  url: string;
  title: string;
  description: string;
  headings: SearchHeading[];
};

export type SearchHitType = "page" | "heading" | "text";

export type SearchHit = {
  id: string;
  url: string;
  content: string;
  type: SearchHitType;
  score: number;
  element?: HTMLElement;
};

export type SearchGroup = {
  pageUrl: string;
  items: SearchHit[];
};

export type HighlightSegment = {
  type: "text";
  content: string;
  styles?: {
    highlight?: boolean;
  };
};
