"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";

import { formatCompactNumber, formatDuration, formatRelativeDate } from "@/lib/formatting";
import { ClipQueueItem } from "@/lib/types";
import styles from "@/components/ClipQueueApp.module.css";

interface QueueSidebarProps {
  activeClipId: string | null;
  isReady: boolean;
  items: ClipQueueItem[];
  onSelect: (clipId: string) => void;
  sortModeLabel: string;
  watchedIds: string[];
}

export default function QueueSidebar({
  activeClipId,
  isReady,
  items,
  onSelect,
  sortModeLabel,
  watchedIds,
}: QueueSidebarProps) {
  const queueListRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useLayoutEffect(() => {
    if (!activeClipId || !isReady) {
      return;
    }

    const listElement = queueListRef.current;
    const activeItemElement = itemRefs.current[activeClipId];

    if (!listElement || !activeItemElement) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      const nextScrollTop = Math.max(activeItemElement.offsetTop - listElement.offsetTop, 0);

      listElement.scrollTo({
        top: nextScrollTop,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [activeClipId, isReady, items]);

  return (
    <div className={styles.queueSection}>
      <div className={styles.queueHeader}>
        <div>
          <h2 className={styles.queueTitle}>Queue rail</h2>
          <p className={styles.queueSubtitle}>
            {isReady
              ? `${items.length} playable clips from the broader category feed, sorted by ${sortModeLabel}.`
              : "Loading playable clips from Twitch and preparing the queue rail."}
          </p>
        </div>

        <div className={styles.hotkeys}>
          <span className={styles.hotkey}>Up prev</span>
          <span className={styles.hotkey}>Down next</span>
          <span className={styles.hotkey}>R refresh</span>
          <span className={styles.hotkey}>Delete remove</span>
        </div>
      </div>

      {!isReady ? (
        <div className={styles.queueList} aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`queue-skeleton-${index}`} className={styles.queueItemSkeleton}>
              <div className={`${styles.skeletonBlock} ${styles.queueThumbSkeleton}`} />
              <div className={styles.queueBody}>
                <div className={`${styles.skeletonBlock} ${styles.queueTitleSkeleton}`} />
                <div className={`${styles.skeletonBlock} ${styles.queueMetaSkeleton}`} />
                <div className={`${styles.skeletonBlock} ${styles.queueTagSkeleton}`} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length ? (
        <div ref={queueListRef} className={styles.queueList}>
          {items.map((item) => {
            const isWatched = watchedIds.includes(item.id);

            return (
              <button
                key={item.id}
                ref={(element) => {
                  itemRefs.current[item.id] = element;
                }}
                type="button"
                className={`${styles.queueItem} ${activeClipId === item.id ? styles.queueItemActive : ""}`}
                onClick={() => onSelect(item.id)}
              >
                <div className={styles.queueThumb}>
                  <Image
                    src={item.thumbnailUrl}
                    alt={item.title}
                    width={320}
                    height={180}
                  />
                </div>

                <div className={styles.queueBody}>
                  <p className={styles.queueItemTitle}>{item.title}</p>
                  <div className={styles.queueItemMeta}>
                    <span>{item.creatorName}</span>
                    <span>{formatRelativeDate(item.createdAt)}</span>
                    <span>{formatCompactNumber(item.viewCount)} views</span>
                    <span>{formatDuration(item.durationSeconds)}</span>
                  </div>

                  <div className={styles.tagRow}>
                    <span className={styles.tag}>{item.broadcasterName}</span>
                    <span className={styles.tag}>Source matched</span>
                    {isWatched ? (
                      <span className={`${styles.tag} ${styles.tagWatched}`}>Watched</span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyQueue}>
          The queue is empty for the current time window. Either no clips were created in
          that period, or the returned clips could not be verified against a matching
          source stream title.
        </div>
      )}

      <div className={styles.message}>
        {isReady
          ? `${watchedIds.length} clips have been opened in this session. Title filtering is based on the originating VOD title, not the clip title, and this feed is still best-effort rather than a complete Twitch-wide search.`
          : "We are resolving Twitch playback for every clip in this queue before revealing the live rail."}
      </div>
    </div>
  );
}
