import { useEffect, useRef } from "react";
import type { SpaceTreeNode } from "../types";
import {
  flattenStreamsUnderNode,
  getSpaceSelectionVisual,
  toggleSpaceSelection,
} from "../spaceTree";

export type SpaceTreeCallbacks = {
  expanded: ReadonlySet<number>;
  onToggleExpanded: (spaceId: number) => void;
  selected: ReadonlySet<number>;
  onChangeSelected: (next: Set<number>) => void;
  onToggleStream: (streamId: number) => void;
  onAddSpace: (spaceId: number, spaceName: string) => void;
  onDeleteStream: (streamId: number) => void;
  pendingDeleteStreamIds: ReadonlySet<number>;
};

type NodeProps = SpaceTreeCallbacks & {
  node: SpaceTreeNode;
};

function TreeChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className="chevron-icon"
      viewBox="0 0 12 12"
      width={12}
      height={12}
      aria-hidden
    >
      {expanded ? (
        <path
          d="M2 4.5 L6 8.5 L10 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M4.5 2 L8.5 6 L4.5 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function SpaceCheckbox({
  visual,
  onChange,
  disabled,
}: {
  visual: "none" | "partial" | "all";
  onChange: () => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.indeterminate = visual === "partial";
  }, [visual]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="row-checkbox"
      checked={visual === "all"}
      onChange={onChange}
      disabled={disabled}
      aria-label="Select all streams in this space"
    />
  );
}

function SpaceNodeRow({
  node,
  expanded,
  onToggleExpanded,
  selected,
  onChangeSelected,
  onToggleStream,
  onAddSpace,
  onDeleteStream,
  pendingDeleteStreamIds,
}: NodeProps) {
  const hasExpandableContent =
    node.streams.length > 0 || node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const visual = getSpaceSelectionVisual(node, selected);
  const descendantStreams = flattenStreamsUnderNode(node);
  const spaceCheckboxDisabled = descendantStreams.length === 0;

  return (
    <li className="tree-node">
      <div
        className={
          "tree-row space-row" +
          (hasExpandableContent ? "" : " tree-row--no-chevron")
        }
      >
        {hasExpandableContent ? (
          <button
            type="button"
            className="chevron"
            onClick={() => onToggleExpanded(node.id)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <TreeChevronIcon expanded={isExpanded} />
          </button>
        ) : null}
        <SpaceCheckbox
          visual={visual}
          disabled={spaceCheckboxDisabled}
          onChange={() => {
            if (spaceCheckboxDisabled) return;
            onChangeSelected(toggleSpaceSelection(node, selected));
          }}
        />
        <div className="tree-main">
          <span className="tree-label">{node.name}</span>
          <button
            type="button"
            className="btn-icon btn-icon--add btn-icon--add-inline"
            aria-label={`Add stream to ${node.name}`}
            onClick={() => onAddSpace(node.id, node.name)}
          >
            +
          </button>
        </div>
      </div>
      {isExpanded && hasExpandableContent ? (
        <ul className="tree-children">
          {node.streams.map((st) => (
            <li key={st.id} className="tree-leaf">
              <div className="tree-row stream-row tree-row--no-chevron">
                <input
                  type="checkbox"
                  className="row-checkbox"
                  checked={selected.has(st.id)}
                  onChange={() => onToggleStream(st.id)}
                  aria-label={`Select ${st.name}`}
                />
                <div className="tree-main tree-main--stream">
                  <span className="tree-label">{st.name}</span>
                </div>
                <div className="tree-actions">
                  <button
                    type="button"
                    className="btn-icon btn-icon--remove"
                    aria-label={`Delete ${st.name}`}
                    disabled={pendingDeleteStreamIds.has(st.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteStream(st.id);
                    }}
                  >
                    {pendingDeleteStreamIds.has(st.id) ? "…" : "×"}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {node.children.map((child) => (
            <SpaceNodeRow
              key={child.id}
              node={child}
              expanded={expanded}
              onToggleExpanded={onToggleExpanded}
              selected={selected}
              onChangeSelected={onChangeSelected}
              onToggleStream={onToggleStream}
              onAddSpace={onAddSpace}
              onDeleteStream={onDeleteStream}
              pendingDeleteStreamIds={pendingDeleteStreamIds}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export type SpaceTreeProps = SpaceTreeCallbacks & { roots: SpaceTreeNode[] };

export function SpaceTree({ roots, ...callbacks }: SpaceTreeProps) {
  if (roots.length === 0) {
    return <p className="muted">No spaces for this site.</p>;
  }
  return (
    <ul className="tree-root">
      {roots.map((node) => (
        <SpaceNodeRow key={node.id} {...callbacks} node={node} />
      ))}
    </ul>
  );
}
