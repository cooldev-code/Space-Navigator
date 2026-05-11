export type Site = {
  id: number;
  name: string;
};

export type Stream = {
  id: number;
  name: string;
};

export type Space = {
  id: number;
  name: string;
  streams: Stream[];
  parentSpaceId: number | null;
};

export type FlattenedSpacesData = {
  spaces: Space[];
};

export type SpaceTreeNode = {
  id: number;
  name: string;
  streams: Stream[];
  children: SpaceTreeNode[];
};

export type SpaceSelectionVisual = "none" | "partial" | "all";
