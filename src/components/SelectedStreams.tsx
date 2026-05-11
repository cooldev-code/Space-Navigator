import { EmptyState } from "./EmptyState";

type Props = {
  namesByStreamId: Map<number, string>;
  selectedOrder: number[];
  onRemove: (streamId: number) => void;
};

export function SelectedStreams({
  namesByStreamId,
  selectedOrder,
  onRemove,
}: Props) {
  const count = selectedOrder.length;
  const hasStreams = count > 0;

  return (
    <section
      className="panel panel-card selected-panel"
      aria-labelledby="selected-heading"
    >
      <h2 id="selected-heading" className="panel-title panel-title-inline">
        <span>Selected Streams</span>
        <span className="count-badge" aria-label={`${count} selected`}>
          {count}
        </span>
      </h2>
      <div
        className={
          hasStreams
            ? "panel-body panel-body--scroll"
            : "panel-body panel-body--center"
        }
      >
        {!hasStreams ? (
          <EmptyState
            icon="clipboard"
            title="No Streams Selected"
            description="Select streams from the tree view to see them here"
          />
        ) : (
          <ul className="selected-list">
            {selectedOrder.map((id) => (
              <li key={id} className="selected-row">
                <span className="selected-name">
                  {namesByStreamId.get(id) ?? `Stream ${id}`}
                </span>
                <button
                  type="button"
                  className="selected-remove"
                  aria-label={`Remove ${namesByStreamId.get(id) ?? "stream"}`}
                  onClick={() => onRemove(id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
