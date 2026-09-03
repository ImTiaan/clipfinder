import { ClipQueueItem, ClipQueueResponse, TIME_RANGE_OPTIONS, TimeRange } from "@/lib/types";

const RANGE_TO_MS: Record<TimeRange, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const TITLE_MATCHER =
  /(^|[^a-z0-9])(chaserp|chase[\s_-]?rp|chase[\s_-]?roleplay|chaseroleplay)($|[^a-z0-9])/i;
const TWITCH_HELIX_BASE = "https://api.twitch.tv/helix";
const HELIX_BATCH_LIMIT = 100;
const DEFAULT_TWITCH_GAME_ID = "32982";
const MAX_PAGES_PER_SLICE = 10;

interface TimeSlice {
  startedAt: string;
  endedAt: string;
}

interface TwitchTokenCache {
  accessToken: string;
  expiresAt: number;
}

interface HelixClip {
  id: string;
  url: string;
  broadcaster_id: string;
  broadcaster_name: string;
  creator_id: string;
  creator_name: string;
  title: string;
  view_count: number;
  created_at: string;
  thumbnail_url: string;
  duration: number;
  video_id: string;
}

interface HelixVideo {
  id: string;
  title: string;
}

interface HelixPagination {
  cursor?: string;
}

interface HelixResponse<T> {
  data: T[];
  pagination?: HelixPagination;
}

interface QueueFromClipsInput {
  clips: HelixClip[];
  range: TimeRange;
  refreshedAt?: Date;
  isTruncated?: boolean;
  videosById: Map<string, HelixVideo>;
}

interface FetchRecentClipsResult {
  clips: HelixClip[];
  isTruncated: boolean;
}

let twitchTokenCache: TwitchTokenCache | null = null;

export function isTimeRange(value: string | null | undefined): value is TimeRange {
  return TIME_RANGE_OPTIONS.includes(value as TimeRange);
}

export function matchesSourceTitle(title: string): boolean {
  return TITLE_MATCHER.test(title);
}

export function getRangeStartIso(range: TimeRange, now = new Date()): string {
  return new Date(now.getTime() - RANGE_TO_MS[range]).toISOString();
}

export function getTimeSlicesForRange(range: TimeRange, now = new Date()): TimeSlice[] {
  const slices: TimeSlice[] = [];
  const endTime = now.getTime();

  if (range === "24h") {
    return [
      {
        startedAt: new Date(endTime - RANGE_TO_MS[range]).toISOString(),
        endedAt: now.toISOString(),
      },
    ];
  }

  if (range === "3d" || range === "7d") {
    const totalDays = range === "3d" ? 3 : 7;

    for (let dayOffset = 0; dayOffset < totalDays; dayOffset += 1) {
      const sliceEnd = endTime - dayOffset * 24 * 60 * 60 * 1000;
      const sliceStart = sliceEnd - 24 * 60 * 60 * 1000;

      slices.push({
        startedAt: new Date(sliceStart).toISOString(),
        endedAt: new Date(sliceEnd).toISOString(),
      });
    }

    return slices;
  }

  const firstWeekDays = 7;
  for (let dayOffset = 0; dayOffset < firstWeekDays; dayOffset += 1) {
    const sliceEnd = endTime - dayOffset * 24 * 60 * 60 * 1000;
    const sliceStart = sliceEnd - 24 * 60 * 60 * 1000;

    slices.push({
      startedAt: new Date(sliceStart).toISOString(),
      endedAt: new Date(sliceEnd).toISOString(),
    });
  }

  let remainingDays = 30 - firstWeekDays;
  let coveredDays = firstWeekDays;

  while (remainingDays > 0) {
    const chunkDays = Math.min(3, remainingDays);
    const sliceEnd = endTime - coveredDays * 24 * 60 * 60 * 1000;
    const sliceStart = sliceEnd - chunkDays * 24 * 60 * 60 * 1000;

    slices.push({
      startedAt: new Date(sliceStart).toISOString(),
      endedAt: new Date(sliceEnd).toISOString(),
    });

    coveredDays += chunkDays;
    remainingDays -= chunkDays;
  }

  return slices;
}

export function filterQueueResponseByRange(
  sourceQueue: ClipQueueResponse,
  range: TimeRange,
): ClipQueueResponse {
  const referenceTime = new Date(sourceQueue.refreshedAt);
  const rangeStart = referenceTime.getTime() - RANGE_TO_MS[range];
  const items = sourceQueue.items.filter((item) => {
    return new Date(item.createdAt).getTime() >= rangeStart;
  });

  return {
    ...sourceQueue,
    range,
    sourceRange: sourceQueue.sourceRange,
    isTruncated: sourceQueue.isTruncated,
    totalEligible: items.length,
    items,
  };
}

export function hasMoreClipPages(
  cursor: string | undefined,
  pagesFetched: number,
  maxPagesPerSlice = MAX_PAGES_PER_SLICE,
): boolean {
  if (!cursor) {
    return false;
  }

  return pagesFetched < maxPagesPerSlice;
}

export function createQueueResponseFromClips({
  clips,
  range,
  refreshedAt = new Date(),
  isTruncated = false,
  videosById,
}: QueueFromClipsInput): ClipQueueResponse {
  let excludedWithoutVideo = 0;
  let filteredOutByTitle = 0;

  const items = clips
    .filter((clip) => {
      if (!clip.video_id) {
        excludedWithoutVideo += 1;
        return false;
      }

      const sourceVideo = videosById.get(clip.video_id);
      if (!sourceVideo) {
        excludedWithoutVideo += 1;
        return false;
      }

      if (!matchesSourceTitle(sourceVideo.title)) {
        filteredOutByTitle += 1;
        return false;
      }

      return true;
    })
    .map<ClipQueueItem>((clip) => {
      const sourceVideo = videosById.get(clip.video_id);

      return {
        id: clip.id,
        url: clip.url,
        title: clip.title,
        creatorName: clip.creator_name,
        creatorId: clip.creator_id,
        thumbnailUrl: clip.thumbnail_url,
        createdAt: clip.created_at,
        durationSeconds: Number.isFinite(clip.duration) ? Math.round(clip.duration) : null,
        viewCount: clip.view_count,
        broadcasterId: clip.broadcaster_id,
        broadcasterName: clip.broadcaster_name,
        sourceVideoId: clip.video_id || null,
        sourceStreamTitle: sourceVideo?.title ?? "Unknown stream",
        matchesFilter: true,
      };
    })
    .sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  return {
    range,
    sourceRange: range,
    refreshedAt: refreshedAt.toISOString(),
    isTruncated,
    totalFetched: clips.length,
    totalEligible: items.length,
    excludedWithoutVideo,
    filteredOutByTitle,
    items,
  };
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function getTwitchAppAccessToken(): Promise<string> {
  if (twitchTokenCache && twitchTokenCache.expiresAt > Date.now()) {
    return twitchTokenCache.accessToken;
  }

  const clientId = getRequiredEnv("TWITCH_CLIENT_ID");
  const clientSecret = getRequiredEnv("TWITCH_CLIENT_SECRET");
  const authUrl = new URL("https://id.twitch.tv/oauth2/token");

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("client_secret", clientSecret);
  authUrl.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(authUrl, {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to authenticate with Twitch (${response.status})`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  twitchTokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(payload.expires_in - 60, 60) * 1000,
  };

  return payload.access_token;
}

async function fetchHelix<T>(path: string, searchParams: URLSearchParams): Promise<HelixResponse<T>> {
  const accessToken = await getTwitchAppAccessToken();
  const clientId = getRequiredEnv("TWITCH_CLIENT_ID");
  const requestUrl = `${TWITCH_HELIX_BASE}${path}?${searchParams.toString()}`;
  const response = await fetch(requestUrl, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Client-Id": clientId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Twitch request failed (${response.status})`);
  }

  return (await response.json()) as HelixResponse<T>;
}

function getConfiguredGameId(): string {
  return process.env.TWITCH_GAME_ID?.trim() || DEFAULT_TWITCH_GAME_ID;
}

async function fetchRecentClips(range: TimeRange): Promise<FetchRecentClipsResult> {
  const gameId = getConfiguredGameId();
  const clipsById = new Map<string, HelixClip>();
  const timeSlices = getTimeSlicesForRange(range);
  let isTruncated = false;

  for (const slice of timeSlices) {
    let cursor: string | undefined;

    for (let page = 0; page < MAX_PAGES_PER_SLICE; page += 1) {
      const searchParams = new URLSearchParams({
        game_id: gameId,
        first: String(HELIX_BATCH_LIMIT),
        started_at: slice.startedAt,
        ended_at: slice.endedAt,
      });

      if (cursor) {
        searchParams.set("after", cursor);
      }

      const payload = await fetchHelix<HelixClip>("/clips", searchParams);
      for (const clip of payload.data) {
        clipsById.set(clip.id, clip);
      }

      cursor = payload.pagination?.cursor;
      // Helix can return fewer than the requested page size and still provide a cursor.
      if (!hasMoreClipPages(cursor, page + 1)) {
        if (cursor) {
          isTruncated = true;
        }
        break;
      }
    }
  }

  return {
    clips: Array.from(clipsById.values()).sort((left, right) => {
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    }),
    isTruncated,
  };
}

async function fetchVideosById(videoIds: string[]): Promise<Map<string, HelixVideo>> {
  const videosById = new Map<string, HelixVideo>();

  for (let index = 0; index < videoIds.length; index += HELIX_BATCH_LIMIT) {
    const batch = videoIds.slice(index, index + HELIX_BATCH_LIMIT);
    const searchParams = new URLSearchParams();

    for (const videoId of batch) {
      searchParams.append("id", videoId);
    }

    const payload = await fetchHelix<HelixVideo>("/videos", searchParams);
    for (const video of payload.data) {
      videosById.set(video.id, video);
    }
  }

  return videosById;
}

export async function getClipQueueData(range: TimeRange): Promise<ClipQueueResponse> {
  const { clips, isTruncated } = await fetchRecentClips(range);
  const uniqueVideoIds = Array.from(
    new Set(clips.map((clip) => clip.video_id).filter((videoId) => Boolean(videoId))),
  ) as string[];
  const videosById = await fetchVideosById(uniqueVideoIds);

  return createQueueResponseFromClips({
    clips,
    range,
    isTruncated,
    videosById,
  });
}
