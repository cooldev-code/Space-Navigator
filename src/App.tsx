import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import {
  createStream,
  deleteStream,
  fetchSites,
  fetchSpaces,
} from "./api";
import { AddStreamModal } from "./components/AddStreamModal";
import { EmptyState } from "./components/EmptyState";
import { SelectedStreams } from "./components/SelectedStreams";
import { SpaceTree } from "./components/SpaceTree";
import {
  buildSpaceTree,
  cloneSpaces,
  findSpaceIdForStream,
  insertStreamIntoSpaces,
  removeStreamFromSpaces,
  replaceStreamIdOnSpaces,
} from "./spaceTree";
import type { Site, Space, Stream } from "./types";
import "./App.css";

function buildStreamNameLookup(spaces: Space[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const s of spaces) {
    for (const st of s.streams) {
      map.set(st.id, st.name);
    }
  }
  return map;
}

function makeTempStreamId(): number {
  return -Math.floor(Math.random() * 1_000_000_000) - 1;
}

function syncSelectedOrder(prevOrder: number[], next: Set<number>): number[] {
  const kept = prevOrder.filter((id) => next.has(id));
  const prev = new Set(prevOrder);
  const newly = [...next]
    .filter((id) => !prev.has(id))
    .sort((a, b) => a - b);
  return [...kept, ...newly];
}

export default function App() {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [sitesLoading, setSitesLoading] = useState(true);

  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);

  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [spacesError, setSpacesError] = useState<string | null>(null);
  const [spacesLoading, setSpacesLoading] = useState(false);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);

  const [addModal, setAddModal] = useState<{
    spaceId: number;
    spaceName: string;
  } | null>(null);

  const [pendingDeleteStreamIds, setPendingDeleteStreamIds] = useState<
    Set<number>
  >(new Set());

  useEffect(() => {
    let cancelled = false;
    setSitesLoading(true);
    setSitesError(null);
    fetchSites()
      .then((res) => {
        if (cancelled) return;
        setSites(res.sites);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSitesError(
          err instanceof Error ? err.message : "Failed to load sites"
        );
      })
      .finally(() => {
        if (!cancelled) setSitesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedSiteId === null) {
      setSpaces(null);
      setSpacesError(null);
      setSpacesLoading(false);
      setSelected(new Set());
      setSelectedOrder([]);
      return;
    }
    let cancelled = false;
    setSpacesLoading(true);
    setSpacesError(null);
    setSpaces(null);
    setSelected(new Set());
    setSelectedOrder([]);
    fetchSpaces(selectedSiteId)
      .then((data) => {
        if (cancelled) return;
        setSpaces(data.spaces);
        setExpanded(new Set(data.spaces.map((s) => s.id)));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSpacesError(
          err instanceof Error ? err.message : "Failed to load spaces"
        );
      })
      .finally(() => {
        if (!cancelled) setSpacesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSiteId]);

  const roots = useMemo(
    () => (spaces ? buildSpaceTree(spaces) : []),
    [spaces]
  );

  const namesByStreamId = useMemo(
    () => (spaces ? buildStreamNameLookup(spaces) : new Map<number, string>()),
    [spaces]
  );

  const toggleExpanded = useCallback((spaceId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId)) next.delete(spaceId);
      else next.add(spaceId);
      return next;
    });
  }, []);

  const addToSelection = useCallback((streamId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.add(streamId);
      setSelectedOrder((o) => syncSelectedOrder(o, next));
      return next;
    });
  }, []);

  const removeFromSelection = useCallback((streamId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(streamId);
      setSelectedOrder((o) => syncSelectedOrder(o, next));
      return next;
    });
  }, []);

  const replaceSelectionId = useCallback((fromId: number, toId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fromId)) {
        next.delete(fromId);
        next.add(toId);
      }
      return next;
    });
    setSelectedOrder((prev) =>
      prev.map((id) => (id === fromId ? toId : id))
    );
  }, []);

  const toggleStream = useCallback((streamId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(streamId)) next.delete(streamId);
      else next.add(streamId);
      setSelectedOrder((o) => syncSelectedOrder(o, next));
      return next;
    });
  }, []);

  const handleAddStreamSubmit = useCallback(
    async (name: string) => {
      if (!addModal || !spaces) return;
      const { spaceId } = addModal;
      const tempId = makeTempStreamId();
      const optimistic: Stream = { id: tempId, name: name.trim() };
      const snapshot = cloneSpaces(spaces);
      setSpaces(insertStreamIntoSpaces(spaces, spaceId, optimistic));
      try {
        const { stream } = await createStream(spaceId, name.trim());
        setSpaces((prev) =>
          prev
            ? replaceStreamIdOnSpaces(prev, spaceId, tempId, stream)
            : prev
        );
        replaceSelectionId(tempId, stream.id);
        toast.success(`Added “${stream.name}”`);
      } catch (err) {
        setSpaces(snapshot);
        toast.error(
          err instanceof Error ? err.message : "Could not add stream"
        );
        throw err;
      }
    },
    [addModal, spaces, replaceSelectionId]
  );

  const handleDeleteStream = useCallback(
    (streamId: number) => {
      if (!spaces) return;
      const snapshot = cloneSpaces(spaces);
      const spaceId = findSpaceIdForStream(spaces, streamId);
      if (spaceId === null) {
        toast.error("Could not locate stream to delete.");
        return;
      }

      const streamName =
        spaces
          .flatMap((s) => s.streams)
          .find((st) => st.id === streamId)?.name ?? "Stream";

      setPendingDeleteStreamIds((prev) => new Set(prev).add(streamId));
      setSpaces(removeStreamFromSpaces(spaces, streamId));
      removeFromSelection(streamId);

      void deleteStream(streamId)
        .then(() => {
          toast.success(`Removed “${streamName}”`);
        })
        .catch((err: unknown) => {
          setSpaces(snapshot);
          addToSelection(streamId);
          toast.error(
            err instanceof Error ? err.message : "Failed to delete stream"
          );
        })
        .finally(() => {
          setPendingDeleteStreamIds((prev) => {
            const next = new Set(prev);
            next.delete(streamId);
            return next;
          });
        });
    },
    [spaces, removeFromSelection, addToSelection]
  );

  const siteOptions = sites ?? [];

  const showTree =
    selectedSiteId !== null &&
    !spacesLoading &&
    !spacesError &&
    spaces !== null &&
    spaces.length > 0;

  let spacesPanelBody: ReactNode = null;
  if (selectedSiteId === null) {
    spacesPanelBody = (
      <EmptyState
        icon="building"
        title="No Site Selected"
        description="Please select a site to view available spaces and streams"
      />
    );
  } else if (spacesLoading) {
    spacesPanelBody = (
      <p className="muted panel-status">Loading spaces…</p>
    );
  } else if (spacesError) {
    spacesPanelBody = (
      <p className="banner error panel-status" role="alert">
        {spacesError}
      </p>
    );
  } else if (spaces && spaces.length === 0) {
    spacesPanelBody = (
      <EmptyState
        icon="building"
        title="No spaces"
        description="This site has no spaces defined yet."
      />
    );
  } else if (spaces) {
    spacesPanelBody = (
      <div className="spaces-tree-wrap">
        <SpaceTree
          roots={roots}
          expanded={expanded}
          onToggleExpanded={toggleExpanded}
          selected={selected}
          onChangeSelected={(next) => {
            setSelected(next);
            setSelectedOrder((order) => syncSelectedOrder(order, next));
          }}
          onToggleStream={toggleStream}
          onAddSpace={(spaceId, spaceName) => {
            setAddModal({ spaceId, spaceName });
          }}
          onDeleteStream={handleDeleteStream}
          pendingDeleteStreamIds={pendingDeleteStreamIds}
        />
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="top-nav">
        <h1 className="nav-brand">Space Navigator</h1>
        <div className="nav-site-picker">
          {sitesError ? (
            <span className="nav-error" role="alert">
              {sitesError}
            </span>
          ) : sitesLoading ? (
            <div className="nav-site-field">
              <span className="nav-site-label">Select Site</span>
              <select className="select nav-select" disabled aria-busy>
                <option>Loading sites…</option>
              </select>
            </div>
          ) : siteOptions.length === 0 ? (
            <span className="muted">No sites available</span>
          ) : (
            <div className="nav-site-field">
              <label className="nav-site-label" htmlFor="site-select">
                Select Site
              </label>
              <select
                id="site-select"
                className="select nav-select"
                value={selectedSiteId ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setSelectedSiteId(null);
                    return;
                  }
                  const v = Number(raw);
                  setSelectedSiteId(Number.isFinite(v) ? v : null);
                }}
              >
                <option value="">Choose a site…</option>
                {siteOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      <main className="app-main layout-two">
        <section
          className="panel panel-card spaces-panel"
          aria-labelledby="spaces-heading"
        >
          <h2 id="spaces-heading" className="panel-title">
            Spaces
          </h2>
          <div
            className={
              showTree
                ? "panel-body panel-body--scroll"
                : "panel-body panel-body--center"
            }
          >
            {spacesPanelBody}
          </div>
        </section>

        <SelectedStreams
          namesByStreamId={namesByStreamId}
          selectedOrder={selectedOrder}
          onRemove={(id) => {
            toggleStream(id);
          }}
        />
      </main>

      <AddStreamModal
        open={addModal !== null}
        spaceName={addModal?.spaceName ?? ""}
        onClose={() => setAddModal(null)}
        onSubmit={handleAddStreamSubmit}
      />
    </div>
  );
}
