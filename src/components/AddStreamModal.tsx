import { useEffect, useId, useState } from "react";

type Props = {
  open: boolean;
  spaceName: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

export function AddStreamModal({
  open,
  spaceName,
  onClose,
  onSubmit,
}: Props) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stream");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="modal-title">
          Add New stream
        </h2>
        <p className="modal-subtitle">
          Space: <strong>{spaceName}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="stream-name-input">
            Stream name
          </label>
          <input
            id="stream-name-input"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            maxLength={200}
            disabled={submitting}
            autoFocus
          />
          {error ? <p className="inline-error">{error}</p> : null}
          <div className="modal-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? "Adding…" : "Add Stream"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
