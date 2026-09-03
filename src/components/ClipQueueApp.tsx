"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownAZ, Clock3 } from "lucide-react";

import ClipPlayerPanel from "@/components/ClipPlayerPanel";
import QueueSidebar from "@/components/QueueSidebar";
import AnimatedBackground from "@/components/AnimatedBackground";
import styles from "@/components/ClipQueueApp.module.css";
import {
  ApiErrorResponse,
  ClipMediaResponse,
  ClipQueueResponse,
  TIME_RANGE_OPTIONS,
  TimeRange,
} from "@/lib/types";
import { useClipQueueStore } from "@/store/useClipQueueStore";

interface ClipQueueAppProps {
  initialData: ClipQueueResponse | null;
  initialError: string | null;
  initialMedia: ClipMediaResponse | null;
  initialRange: TimeRange;
}

const PRELOAD_BATCH_SIZE = 8;

function getApiErrorMessage(payload: ApiErrorResponse | null): string {
  if (!payload) {
    return "Could not refresh the queue.";
  }

  if (payload.details) {
    return `${payload.message} ${payload.details}`;
  }

  return payload.message;
}

export default function ClipQueueApp({
  initialData,
  initialError,
  initialMedia,
  initialRange,
}: ClipQueueAppProps) {
  const [mediaByClipId, setMediaByClipId] = useState<Record<string, ClipMediaResponse>>({});
  const [mediaErrorsByClipId, setMediaErrorsByClipId] = useState<Record<string, string>>({});
  const [resolvingClipId, setResolvingClipId] = useState<string | null>(null);
  const [isPreparingView, setIsPreparingView] = useState(true);
  const [failedSkipState, setFailedSkipState] = useState<{
    clipId: string;
    remainingSeconds: number;
  } | null>(null);
  const {
    dismissedIds,
    errorMessage,
    isLoading,
    markWatched,
    queue,
    range,
    selectClip,
    selectNextClip,
    selectPreviousClip,
    selectedClipId,
    setErrorMessage,
    setInitialState,
    setLoading,
    setRange,
    setSortMode,
    sortMode,
    watchedIds,
    dismissClip,
  } = useClipQueueStore();

  useEffect(() => {
    setInitialState(initialData, initialRange, initialError);
  }, [initialData, initialError, initialRange, setInitialState]);

  useEffect(() => {
    if (!initialData && initialError) {
      setIsPreparingView(false);
    }
  }, [initialData, initialError]);

  useEffect(() => {
    if (!initialData?.items[0] || !initialMedia) {
      return;
    }

    setMediaByClipId((currentMedia) => ({
      ...currentMedia,
      [initialData.items[0].id]: initialMedia,
    }));
  }, [initialData, initialMedia]);

  const visibleItems = useMemo(() => {
    if (!queue) {
      return [];
    }

    return queue.items
      .filter((item) => !dismissedIds.includes(item.id))
      .sort((left, right) => {
        if (sortMode === "top") {
          return right.viewCount - left.viewCount;
        }

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [dismissedIds, queue, sortMode]);

  const activeClip = useMemo(() => {
    return visibleItems.find((item) => item.id === selectedClipId) ?? visibleItems[0] ?? null;
  }, [selectedClipId, visibleItems]);

  const activeClipMedia = activeClip ? mediaByClipId[activeClip.id] ?? null : null;
  const isResolvingMedia = Boolean(activeClip && resolvingClipId === activeClip.id);
  const mediaErrorMessage = activeClip ? mediaErrorsByClipId[activeClip.id] ?? null : null;
  const unresolvedItems = useMemo(() => {
    return visibleItems.filter((item) => {
      return !mediaByClipId[item.id] && !mediaErrorsByClipId[item.id];
    });
  }, [mediaByClipId, mediaErrorsByClipId, visibleItems]);
  const isQueueReady = Boolean(queue);
  const shouldShowGhostLoaders =
    isPreparingView || (!isQueueReady && !errorMessage) || unresolvedItems.length > 0;
  const autoSkipCountdown =
    activeClip && failedSkipState?.clipId === activeClip.id
      ? failedSkipState.remainingSeconds
      : null;

  useEffect(() => {
    if (shouldShowGhostLoaders || !queue) {
      return;
    }

    setIsPreparingView(false);
  }, [queue, shouldShowGhostLoaders]);

  useEffect(() => {
    if (!queue || !isPreparingView || !unresolvedItems.length) {
      return;
    }

    let isCancelled = false;

    const resolveClipMediaPayload = async (clipUrl: string): Promise<ClipMediaResponse> => {
      const params = new URLSearchParams({
        clipUrl,
      });
      const response = await fetch(`/api/clip-media?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as ClipMediaResponse | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload as ApiErrorResponse));
      }

      return payload as ClipMediaResponse;
    };

    const preloadVisibleClipMedia = async () => {
      const resolvedMedia: Record<string, ClipMediaResponse> = {};
      const mediaErrors: Record<string, string> = {};

      for (let index = 0; index < unresolvedItems.length; index += PRELOAD_BATCH_SIZE) {
        const batch = unresolvedItems.slice(index, index + PRELOAD_BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (item) => {
            try {
              const payload = await resolveClipMediaPayload(item.url);
              return {
                status: "resolved",
                clipId: item.id,
                payload,
              } as const;
            } catch (error) {
              return {
                status: "failed",
                clipId: item.id,
                error:
                  error instanceof Error
                    ? error.message
                    : "Could not prepare this clip for direct playback.",
              } as const;
            }
          }),
        );

        if (isCancelled) {
          return;
        }

        for (const result of batchResults) {
          if (result.status === "resolved") {
            resolvedMedia[result.clipId] = result.payload;
            continue;
          }

          mediaErrors[result.clipId] = result.error;
        }
      }

      if (isCancelled) {
        return;
      }

      if (Object.keys(resolvedMedia).length) {
        setMediaByClipId((currentMedia) => ({
          ...currentMedia,
          ...resolvedMedia,
        }));
      }

      if (Object.keys(mediaErrors).length) {
        setMediaErrorsByClipId((currentErrors) => ({
          ...currentErrors,
          ...mediaErrors,
        }));
      }

      setIsPreparingView(false);
    };

    void preloadVisibleClipMedia();

    return () => {
      isCancelled = true;
    };
  }, [isPreparingView, queue, unresolvedItems]);

  useEffect(() => {
    if (activeClip) {
      markWatched(activeClip.id);
    }
  }, [activeClip, markWatched]);

  useEffect(() => {
    if (!activeClip || isPreparingView) {
      return;
    }

    const cachedMedia = mediaByClipId[activeClip.id];
    if (cachedMedia) {
      return;
    }

    let isCancelled = false;

    const loadClipMedia = async () => {
      setResolvingClipId(activeClip.id);

      const params = new URLSearchParams({
        clipUrl: activeClip.url,
      });

      try {
        const response = await fetch(`/api/clip-media?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as ClipMediaResponse | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload as ApiErrorResponse));
        }

        if (isCancelled) {
          return;
        }

        setMediaByClipId((currentMedia) => ({
          ...currentMedia,
          [activeClip.id]: payload as ClipMediaResponse,
        }));
        setFailedSkipState((currentState) =>
          currentState?.clipId === activeClip.id ? null : currentState,
        );
        setMediaErrorsByClipId((currentErrors) => {
          const nextErrors = { ...currentErrors };
          delete nextErrors[activeClip.id];
          return nextErrors;
        });
      } catch (error: unknown) {
        if (isCancelled) {
          return;
        }

        setMediaErrorsByClipId((currentErrors) => ({
          ...currentErrors,
          [activeClip.id]:
            error instanceof Error
              ? error.message
              : "Could not prepare this clip for direct playback.",
        }));
        setFailedSkipState({
          clipId: activeClip.id,
          remainingSeconds: 3,
        });
      } finally {
        if (!isCancelled) {
          setResolvingClipId((currentClipId) =>
            currentClipId === activeClip.id ? null : currentClipId,
          );
        }
      }
    };

    void loadClipMedia();

    return () => {
      isCancelled = true;
    };
  }, [activeClip, isPreparingView, mediaByClipId]);

  useEffect(() => {
    if (!activeClip || !mediaErrorMessage || visibleItems.length <= 1) {
      return;
    }

    if (!failedSkipState || failedSkipState.clipId !== activeClip.id) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (failedSkipState.remainingSeconds <= 1) {
        setFailedSkipState(null);
        selectNextClip();
        return;
      }

      setFailedSkipState((currentState) =>
        currentState && currentState.clipId === activeClip.id
          ? {
              ...currentState,
              remainingSeconds: currentState.remainingSeconds - 1,
            }
          : currentState,
      );
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [activeClip, failedSkipState, mediaErrorMessage, selectNextClip, visibleItems.length]);

  const clearFailedSkipState = useCallback(() => {
    setFailedSkipState(null);
  }, []);

  const handleSelectClip = useCallback(
    (clipId: string) => {
      clearFailedSkipState();
      selectClip(clipId);
    },
    [clearFailedSkipState, selectClip],
  );

  const handleNextClip = useCallback(() => {
    clearFailedSkipState();
    selectNextClip();
  }, [clearFailedSkipState, selectNextClip]);

  const handlePreviousClip = useCallback(() => {
    clearFailedSkipState();
    selectPreviousClip();
  }, [clearFailedSkipState, selectPreviousClip]);

  const handleDismissClip = useCallback(() => {
    if (!activeClip) {
      return;
    }

    clearFailedSkipState();
    dismissClip(activeClip.id);
  }, [activeClip, clearFailedSkipState, dismissClip]);

  const handlePlaybackError = useCallback(() => {
    if (!activeClip) {
      return;
    }

    setMediaErrorsByClipId((currentErrors) => ({
      ...currentErrors,
      [activeClip.id]: "Playback failed for this clip. Skipping on shortly.",
    }));
    setFailedSkipState({
      clipId: activeClip.id,
      remainingSeconds: 3,
    });
  }, [activeClip]);

  const fetchQueue = useCallback(
    async (nextRange: TimeRange, resetSession: boolean) => {
      setLoading(true);
      setIsPreparingView(true);
      clearFailedSkipState();

      try {
        const response = await fetch(`/api/clips?range=${encodeURIComponent(nextRange)}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as ClipQueueResponse | ApiErrorResponse;

        if (!response.ok) {
          setErrorMessage(getApiErrorMessage(payload as ApiErrorResponse));
          setIsPreparingView(false);
          return;
        }

        setInitialState(payload as ClipQueueResponse, nextRange, null);

        if (!resetSession && activeClip) {
          selectClip(activeClip.id);
        }
      } catch {
        setErrorMessage("Could not reach Twitch right now. Try refreshing again in a moment.");
        setIsPreparingView(false);
      } finally {
        setLoading(false);
      }
    },
    [activeClip, clearFailedSkipState, selectClip, setErrorMessage, setInitialState, setLoading],
  );

  const handleRangeChange = useCallback(
    (nextRange: TimeRange) => {
      if (nextRange === range) {
        return;
      }

      setRange(nextRange);
      void fetchQueue(nextRange, true);
    },
    [fetchQueue, range, setRange],
  );

  const handleRefresh = useCallback(() => {
    void fetchQueue(range, false);
  }, [fetchQueue, range]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isEditable) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        handleNextClip();
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        handlePreviousClip();
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        void fetchQueue(range, false);
      }

      if (event.key === "Delete" && activeClip) {
        event.preventDefault();
        handleDismissClip();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeClip, fetchQueue, handleDismissClip, handleNextClip, handlePreviousClip, range]);

  return (
    <main className={styles.shell}>
      <AnimatedBackground />

      <div className={styles.inner}>
        <div className={styles.frame}>
          <ClipPlayerPanel
            activeClip={activeClip}
            autoSkipCountdown={autoSkipCountdown}
            isReady={!shouldShowGhostLoaders}
            isQueueLoading={isLoading}
            isResolvingMedia={isResolvingMedia}
            mediaErrorMessage={mediaErrorMessage}
            mediaUrl={activeClipMedia?.mediaUrl ?? null}
            onDismiss={handleDismissClip}
            onNext={handleNextClip}
            onPlaybackError={handlePlaybackError}
            onPrevious={handlePreviousClip}
            queueErrorMessage={errorMessage}
            resolvedQuality={activeClipMedia?.quality ?? null}
            onRefresh={handleRefresh}
          />

          <div className={styles.panel}>
            <div className={styles.sidebar}>
              <div className={styles.controlRow}>
                <div className={styles.pillGroup}>
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`${styles.pill} ${range === option ? styles.pillActive : ""}`}
                      onClick={() => handleRangeChange(option)}
                    >
                      <Clock3 size={16} />
                      {option}
                    </button>
                  ))}
                </div>

                <div className={styles.pillGroup}>
                  <button
                    type="button"
                    className={`${styles.pill} ${sortMode === "newest" ? styles.pillActive : ""}`}
                    onClick={() => setSortMode("newest")}
                  >
                    <Clock3 size={16} />
                    Newest
                  </button>
                  <button
                    type="button"
                    className={`${styles.pill} ${sortMode === "top" ? styles.pillActive : ""}`}
                    onClick={() => setSortMode("top")}
                  >
                    <ArrowDownAZ size={16} />
                    Top views
                  </button>
                </div>
              </div>

              <QueueSidebar
                activeClipId={activeClip?.id ?? null}
                isReady={!shouldShowGhostLoaders}
                items={visibleItems}
                onSelect={handleSelectClip}
                sortModeLabel={sortMode === "top" ? "view count" : "newest first"}
                watchedIds={watchedIds}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
