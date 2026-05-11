import type { Space, SpaceTreeNode, SpaceSelectionVisual, Stream } from "./types";

export function buildSpaceTree(spaces: Space[]): SpaceTreeNode[] {
  const byId = new Map<number, Space>();
  for (const s of spaces) {
    byId.set(s.id, s);
  }

  const childIds = new Map<number | null, number[]>();
  for (const s of spaces) {
    const key = s.parentSpaceId;
    const list = childIds.get(key) ?? [];
    list.push(s.id);
    childIds.set(key, list);
  }

  const buildNode = (id: number): SpaceTreeNode => {
    const s = byId.get(id);
    if (!s) {
      throw new Error(`Missing space ${id}`);
    }
    const rawChildren = childIds.get(id) ?? [];
    const children = rawChildren.map((cid) => buildNode(cid));
    return {
      id: s.id,
      name: s.name,
      streams: s.streams,
      children,
    };
  };

  const roots = childIds.get(null) ?? [];
  return roots.map((id) => buildNode(id));
}

export function flattenStreamsUnderNode(node: SpaceTreeNode): Stream[] {
  const out: Stream[] = [...node.streams];
  for (const c of node.children) {
    out.push(...flattenStreamsUnderNode(c));
  }
  return out;
}

export function getSpaceSelectionVisual(
  node: SpaceTreeNode,
  selected: ReadonlySet<number>
): SpaceSelectionVisual {
  const descendantStreams = flattenStreamsUnderNode(node);
  if (descendantStreams.length === 0) {
    return "none";
  }
  let selectedCount = 0;
  for (const st of descendantStreams) {
    if (selected.has(st.id)) selectedCount += 1;
  }
  if (selectedCount === 0) return "none";
  if (selectedCount === descendantStreams.length) return "all";
  return "partial";
}

export function toggleSpaceSelection(
  node: SpaceTreeNode,
  selected: ReadonlySet<number>
): Set<number> {
  const ids = flattenStreamsUnderNode(node).map((s) => s.id);
  if (ids.length === 0) {
    return new Set(selected);
  }
  const allOn = ids.every((id) => selected.has(id));
  const next = new Set(selected);
  if (allOn) {
    for (const id of ids) next.delete(id);
  } else {
    for (const id of ids) next.add(id);
  }
  return next;
}

export function insertStreamIntoSpaces(
  spaces: Space[],
  spaceId: number,
  stream: Stream
): Space[] {
  return spaces.map((s) => {
    if (s.id !== spaceId) return s;
    return { ...s, streams: [...s.streams, stream] };
  });
}

export function removeStreamFromSpaces(
  spaces: Space[],
  streamId: number
): Space[] {
  return spaces.map((s) => ({
    ...s,
    streams: s.streams.filter((st) => st.id !== streamId),
  }));
}

export function replaceStreamIdOnSpaces(
  spaces: Space[],
  spaceId: number,
  tempId: number,
  real: Stream
): Space[] {
  return spaces.map((s) => {
    if (s.id !== spaceId) return s;
    return {
      ...s,
      streams: s.streams.map((st) =>
        st.id === tempId ? { ...real } : st
      ),
    };
  });
}

export function findSpaceIdForStream(
  spaces: Space[],
  streamId: number
): number | null {
  for (const s of spaces) {
    if (s.streams.some((st) => st.id === streamId)) {
      return s.id;
    }
  }
  return null;
}

export function cloneSpaces(spaces: Space[]): Space[] {
  return spaces.map((s) => ({
    ...s,
    streams: s.streams.map((st) => ({ ...st })),
  }));
}
