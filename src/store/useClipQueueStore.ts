import { create } from "zustand";

import { ClipQueueResponse, SortMode, TimeRange } from "@/lib/types";

interface ClipQueueState {
  queue: ClipQueueResponse | null;
  range: TimeRange;
  sortMode: SortMode;
  selectedClipId: string | null;
  watchedIds: string[];
  dismissedIds: string[];
  isLoading: boolean;
  errorMessage: string | null;
  setInitialState: (
    queue: ClipQueueResponse | null,
    range: TimeRange,
    errorMessage: string | null,
  ) => void;
  setQueue: (queue: ClipQueueResponse) => void;
  setRange: (range: TimeRange) => void;
  setSortMode: (sortMode: SortMode) => void;
  selectClip: (clipId: string) => void;
  markWatched: (clipId: string) => void;
  dismissClip: (clipId: string) => void;
  selectNextClip: () => void;
  selectPreviousClip: () => void;
  setLoading: (isLoading: boolean) => void;
  setErrorMessage: (message: string | null) => void;
}

function getVisibleIds(state: Pick<ClipQueueState, "queue" | "dismissedIds" | "sortMode">): string[] {
  if (!state.queue) {
    return [];
  }

  return state.queue.items
    .filter((item) => !state.dismissedIds.includes(item.id))
    .sort((left, right) => {
      if (state.sortMode === "top") {
        return right.viewCount - left.viewCount;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    })
    .map((item) => item.id);
}

function ensureSelectedClip(
  selectedClipId: string | null,
  visibleIds: string[],
): string | null {
  if (selectedClipId && visibleIds.includes(selectedClipId)) {
    return selectedClipId;
  }

  return visibleIds[0] ?? null;
}

export const useClipQueueStore = create<ClipQueueState>((set, get) => ({
  queue: null,
  range: "24h",
  sortMode: "newest",
  selectedClipId: null,
  watchedIds: [],
  dismissedIds: [],
  isLoading: false,
  errorMessage: null,
  setInitialState: (queue, range, errorMessage) => {
    const visibleIds = getVisibleIds({
      queue,
      dismissedIds: [],
      sortMode: "newest",
    });

    set({
      queue,
      range,
      sortMode: "newest",
      selectedClipId: visibleIds[0] ?? null,
      watchedIds: visibleIds[0] ? [visibleIds[0]] : [],
      dismissedIds: [],
      isLoading: false,
      errorMessage,
    });
  },
  setQueue: (queue) => {
    const state = get();
    const visibleIds = getVisibleIds({
      queue,
      dismissedIds: state.dismissedIds,
      sortMode: state.sortMode,
    });
    const selectedClipId = ensureSelectedClip(state.selectedClipId, visibleIds);

    set({
      queue,
      selectedClipId,
      watchedIds: selectedClipId
        ? Array.from(new Set([...state.watchedIds, selectedClipId]))
        : state.watchedIds,
      errorMessage: null,
    });
  },
  setRange: (range) => set({ range }),
  setSortMode: (sortMode) => {
    const state = get();
    const visibleIds = getVisibleIds({
      queue: state.queue,
      dismissedIds: state.dismissedIds,
      sortMode,
    });

    set({
      sortMode,
      selectedClipId: ensureSelectedClip(state.selectedClipId, visibleIds),
    });
  },
  selectClip: (clipId) => {
    const state = get();

    set({
      selectedClipId: clipId,
      watchedIds: Array.from(new Set([...state.watchedIds, clipId])),
    });
  },
  markWatched: (clipId) => {
    const state = get();

    set({
      watchedIds: Array.from(new Set([...state.watchedIds, clipId])),
    });
  },
  dismissClip: (clipId) => {
    const state = get();
    const dismissedIds = Array.from(new Set([...state.dismissedIds, clipId]));
    const visibleIds = getVisibleIds({
      queue: state.queue,
      dismissedIds,
      sortMode: state.sortMode,
    });

    set({
      dismissedIds,
      selectedClipId: ensureSelectedClip(
        state.selectedClipId === clipId ? null : state.selectedClipId,
        visibleIds,
      ),
    });
  },
  selectNextClip: () => {
    const state = get();
    const visibleIds = getVisibleIds(state);

    if (!visibleIds.length) {
      return;
    }

    const currentIndex = state.selectedClipId ? visibleIds.indexOf(state.selectedClipId) : -1;
    const nextClipId = visibleIds[(currentIndex + 1 + visibleIds.length) % visibleIds.length];

    set({
      selectedClipId: nextClipId,
      watchedIds: Array.from(new Set([...state.watchedIds, nextClipId])),
    });
  },
  selectPreviousClip: () => {
    const state = get();
    const visibleIds = getVisibleIds(state);

    if (!visibleIds.length) {
      return;
    }

    const currentIndex = state.selectedClipId ? visibleIds.indexOf(state.selectedClipId) : 0;
    const previousClipId =
      visibleIds[(currentIndex - 1 + visibleIds.length) % visibleIds.length];

    set({
      selectedClipId: previousClipId,
      watchedIds: Array.from(new Set([...state.watchedIds, previousClipId])),
    });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
}));
