"use client";

import Image from "next/image";

import { formatCompactNumber, formatDuration, formatRelativeDate } from "@/lib/formatting";
import { ClipQueueItem } from "@/lib/types";
import styles from "@/components/ClipQueueApp.module.css";

interface QueueSidebarProps {
  activeClipId: string | null;
  items: ClipQueueItem[];
  onSelect: (clipId: string) => void;
  sortModeLabel: string;
  watchedIds: string[];
}

export default function QueueSidebar({
  activeClipId,
  items,
  onSelect,
  sortModeLabel,
  watchedIds,
}: QueueSidebarProps) {
  return (
    <div className={styles.queueSection}>
      <div className={styles.queueHeader}>
        <div>
          <h2 className={styles.queueTitle}>Queue rail</h2>
          <p className={styles.queueSubtitle}>
            {items.length} playable clips from the broader category feed, sorted by{" "}
            {sortModeLabel}.
          </p>
        </div>

        <div className={styles.hotkeys}>
          <span className={styles.hotkey}>Up prev</span>
          <span className={styles.hotkey}>Down next</span>
          <span className={styles.hotkey}>R refresh</span>
          <span className={styles.hotkey}>Delete remove</span>
        </div>
      </div>

      {items.length ? (
        <div className={styles.queueList}>
          {items.map((item) => {
            const isWatched = watchedIds.includes(item.id);

            return (
              <button
                key={item.id}
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
        {watchedIds.length} clips have been opened in this session. Title filtering is
        based on the originating VOD title, not the clip title, and this feed is still
        best-effort rather than a complete Twitch-wide search.
      </div>
    </div>
  );
}
