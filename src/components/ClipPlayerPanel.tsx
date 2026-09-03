"use client";

import { ExternalLink, RefreshCw, SkipBack, SkipForward, Trash2 } from "lucide-react";

import styles from "@/components/ClipQueueApp.module.css";
import { formatAbsoluteDate, formatCompactNumber, formatDuration } from "@/lib/formatting";
import { ClipQueueItem } from "@/lib/types";

interface ClipPlayerPanelProps {
  activeClip: ClipQueueItem | null;
  isReady: boolean;
  isQueueLoading: boolean;
  queueErrorMessage: string | null;
  mediaErrorMessage: string | null;
  mediaUrl: string | null;
  resolvedQuality: string | null;
  isResolvingMedia: boolean;
  autoSkipCountdown: number | null;
  onRefresh: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onDismiss: () => void;
  onPlaybackError: () => void;
}

export default function ClipPlayerPanel({
  activeClip,
  isReady,
  isQueueLoading,
  isResolvingMedia,
  mediaErrorMessage,
  mediaUrl,
  autoSkipCountdown,
  onDismiss,
  onNext,
  onPrevious,
  onPlaybackError,
  queueErrorMessage,
  resolvedQuality,
  onRefresh,
}: ClipPlayerPanelProps) {
  const hasPlayback = Boolean(activeClip && mediaUrl && !mediaErrorMessage);
  const shouldShowLoadingState = Boolean(activeClip && isResolvingMedia && !mediaUrl);

  return (
    <section className={`${styles.panel} ${styles.mainPanel}`}>
      <div className={styles.playerCard}>
        <div className={styles.playerFrame}>
          {!isReady ? (
            <div className={styles.playerSkeleton} aria-hidden="true">
              <div className={`${styles.skeletonBlock} ${styles.playerSkeletonGlow}`} />
            </div>
          ) : hasPlayback && activeClip ? (
            <video
              key={`${activeClip.id}-${mediaUrl}`}
              className={styles.playerVideo}
              src={mediaUrl ?? undefined}
              poster={activeClip.thumbnailUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onEnded={onNext}
              onError={onPlaybackError}
            />
          ) : shouldShowLoadingState ? (
            <div className={styles.playerPlaceholder}>
              <div className={styles.placeholderCard}>
                <p className={styles.placeholderTitle}>Resolving clip playback</p>
                <p className={styles.placeholderText}>
                  Pulling a direct media URL from Twitch so the clip can play here
                  without the embed login wall.
                </p>
              </div>
            </div>
          ) : activeClip ? (
            <div className={styles.playerPlaceholder}>
              <div className={styles.placeholderCard}>
                <p className={styles.placeholderTitle}>This clip could not be played here</p>
                <p className={styles.placeholderText}>
                  Twitch did not return a usable direct media URL for this clip just now.
                  {autoSkipCountdown
                    ? ` Skipping on in ${autoSkipCountdown} seconds unless you intervene.`
                    : " Try refreshing, moving to the next clip, or opening it on Twitch."}
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.playerPlaceholder}>
              <div className={styles.placeholderCard}>
                <p className={styles.placeholderTitle}>No clip selected</p>
                <p className={styles.placeholderText}>
                  Try refreshing the queue or widening the time window. Clips without a
                  source VOD title are excluded automatically so the title filter stays
                  trustworthy.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.featuredBody}>
          {!isReady ? (
            <div className={styles.panelSkeleton} aria-hidden="true">
              <div className={`${styles.skeletonBlock} ${styles.skeletonPillRow}`} />
              <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
              <div className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} />
              <div className={styles.skeletonInfoGrid}>
                <div className={`${styles.skeletonBlock} ${styles.skeletonInfoCard}`} />
                <div className={`${styles.skeletonBlock} ${styles.skeletonInfoCard}`} />
                <div className={`${styles.skeletonBlock} ${styles.skeletonInfoCard}`} />
                <div className={`${styles.skeletonBlock} ${styles.skeletonInfoCard}`} />
              </div>
              <div className={`${styles.skeletonBlock} ${styles.skeletonSourceCard}`} />
            </div>
          ) : (
            <>
          <div className={styles.controlRow}>
            <div className={styles.pillGroup}>
              <button type="button" className={styles.pill} onClick={onPrevious} disabled={!activeClip}>
                <SkipBack size={16} />
                Previous
              </button>
              <button type="button" className={styles.pill} onClick={onNext} disabled={!activeClip}>
                <SkipForward size={16} />
                Next
              </button>
              <button
                type="button"
                className={`${styles.pill} ${styles.pillDanger}`}
                onClick={onDismiss}
                disabled={!activeClip}
              >
                <Trash2 size={16} />
                Remove
              </button>
            </div>

            <div className={styles.pillGroup}>
              <button
                type="button"
                className={styles.pill}
                onClick={onRefresh}
                disabled={isQueueLoading}
              >
                <RefreshCw size={16} />
                {isQueueLoading ? "Refreshing" : "Refresh"}
              </button>
              {activeClip ? (
                <a
                  className={styles.pill}
                  href={activeClip.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={16} />
                  Open on Twitch
                </a>
              ) : null}
            </div>
          </div>

          {queueErrorMessage ? (
            <div className={`${styles.message} ${styles.messageError}`}>{queueErrorMessage}</div>
          ) : null}

          {mediaErrorMessage ? (
            <div className={`${styles.message} ${styles.messageError}`}>{mediaErrorMessage}</div>
          ) : null}

          {activeClip ? (
            <>
              <div className={styles.featuredTop}>
                <div>
                  <h2 className={styles.featuredTitle}>{activeClip.title}</h2>
                  <div className={styles.featuredSubline}>
                    <span>Clipped by {activeClip.creatorName}</span>
                    <span>{formatAbsoluteDate(activeClip.createdAt)}</span>
                    <span>{formatCompactNumber(activeClip.viewCount)} views</span>
                  </div>
                </div>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Clip creator</span>
                  <p className={styles.infoValue}>{activeClip.creatorName}</p>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Clip length</span>
                  <p className={styles.infoValue}>{formatDuration(activeClip.durationSeconds)}</p>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Playback quality</span>
                  <p className={styles.infoValue}>{resolvedQuality ? `${resolvedQuality}p` : "Resolving"}</p>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Broadcaster</span>
                  <p className={styles.infoValue}>{activeClip.broadcasterName}</p>
                </div>
              </div>

              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>Source stream title</span>
                <p className={styles.infoValue}>{activeClip.sourceStreamTitle}</p>
              </div>
            </>
          ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
