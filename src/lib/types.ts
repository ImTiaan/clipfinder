export const TIME_RANGE_OPTIONS = ["24h", "3d", "7d", "30d"] as const;

export type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];

export type SortMode = "newest" | "top";

export interface ClipQueueItem {
  id: string;
  url: string;
  title: string;
  creatorName: string;
  creatorId: string;
  thumbnailUrl: string;
  createdAt: string;
  durationSeconds: number | null;
  viewCount: number;
  broadcasterId: string;
  broadcasterName: string;
  sourceVideoId: string | null;
  sourceStreamTitle: string;
  matchesFilter: true;
}

export interface ClipQueueResponse {
  range: TimeRange;
  sourceRange: TimeRange;
  refreshedAt: string;
  isTruncated: boolean;
  totalFetched: number;
  totalEligible: number;
  excludedWithoutVideo: number;
  filteredOutByTitle: number;
  items: ClipQueueItem[];
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: string;
}

export interface ClipMediaResponse {
  clipId: string;
  clipUrl: string;
  mediaUrl: string;
  quality: string;
  resolvedAt: string;
  source: "twitch-gql";
}
