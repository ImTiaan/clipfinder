import { ClipMediaResponse } from "@/lib/types";

const TWITCH_GQL_ENDPOINT = "https://gql.twitch.tv/gql";
const TWITCH_WEB_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const CLIP_MEDIA_CACHE_TTL_MS = 10 * 60 * 1000;
const CLIP_PLAYBACK_QUERY = `
  query ClipPlayback($slug: ID!) {
    clip(slug: $slug) {
      id
      playbackAccessToken(
        params: { platform: "web", playerBackend: "mediaplayer", playerType: "embed" }
      ) {
        signature
        value
      }
      videoQualities {
        quality
        sourceURL
      }
    }
  }
`;

interface ClipVideoQuality {
  quality: string;
  sourceURL: string;
}

interface ClipPlaybackAccessToken {
  signature: string;
  value: string;
}

interface ClipPlaybackPayload {
  clip: {
    id: string;
    playbackAccessToken: ClipPlaybackAccessToken;
    videoQualities: ClipVideoQuality[];
  } | null;
}

interface ClipPlaybackResponseItem {
  data?: ClipPlaybackPayload;
  errors?: Array<{
    message?: string;
  }>;
}

interface CachedClipMedia {
  clipId: string;
  clipUrl: string;
  mediaUrl: string;
  quality: string;
  resolvedAt: string;
  source: "twitch-gql";
  expiresAt: number;
}

const clipMediaCache = new Map<string, CachedClipMedia>();

export function extractClipSlug(clipUrl: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(clipUrl);
  } catch {
    throw new Error("The clip URL is invalid.");
  }

  const pathnameParts = parsedUrl.pathname.split("/").filter(Boolean);
  const clipSegment = pathnameParts[pathnameParts.length - 1];

  if (!clipSegment) {
    throw new Error("The clip URL does not include a clip slug.");
  }

  return clipSegment;
}

function getCachedClipMedia(clipUrl: string): ClipMediaResponse | null {
  const cached = clipMediaCache.get(clipUrl);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    clipMediaCache.delete(clipUrl);
    return null;
  }

  return {
    clipId: cached.clipId,
    clipUrl: cached.clipUrl,
    mediaUrl: cached.mediaUrl,
    quality: cached.quality,
    resolvedAt: cached.resolvedAt,
    source: cached.source,
  };
}

function setCachedClipMedia(payload: ClipMediaResponse): void {
  clipMediaCache.set(payload.clipUrl, {
    ...payload,
    expiresAt: Date.now() + CLIP_MEDIA_CACHE_TTL_MS,
  });
}

function buildSignedClipMediaUrl(sourceURL: string, signature: string, token: string): string {
  const playbackUrl = new URL(sourceURL);

  playbackUrl.searchParams.set("sig", signature);
  playbackUrl.searchParams.set("token", token);

  return playbackUrl.toString();
}

function pickPreferredQuality(videoQualities: ClipVideoQuality[]): ClipVideoQuality {
  const rankedQualities = [...videoQualities].sort((left, right) => {
    return Number(right.quality) - Number(left.quality);
  });

  const preferredQuality =
    rankedQualities.find((quality) => Number(quality.quality) <= 720) ?? rankedQualities[0];

  if (!preferredQuality) {
    throw new Error("Twitch did not return a playable clip quality.");
  }

  return preferredQuality;
}

async function fetchClipPlaybackData(slug: string): Promise<ClipPlaybackResponseItem> {
  const response = await fetch(TWITCH_GQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Client-ID": TWITCH_WEB_CLIENT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operationName: "ClipPlayback",
      query: CLIP_PLAYBACK_QUERY,
      variables: {
        slug,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Twitch clip media lookup failed (${response.status}).`);
  }

  return (await response.json()) as ClipPlaybackResponseItem;
}

export async function resolveClipMedia(clipUrl: string): Promise<ClipMediaResponse> {
  const cached = getCachedClipMedia(clipUrl);
  if (cached) {
    return cached;
  }

  const slug = extractClipSlug(clipUrl);
  const payload = await fetchClipPlaybackData(slug);
  const errorMessage = payload.errors?.[0]?.message;

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const clip = payload.data?.clip;
  const playbackAccessToken = clip?.playbackAccessToken;

  if (!clip || !playbackAccessToken || !clip.videoQualities.length) {
    throw new Error("Twitch did not return playable media for this clip.");
  }

  const selectedQuality = pickPreferredQuality(clip.videoQualities);
  const resolvedPayload: ClipMediaResponse = {
    clipId: clip.id,
    clipUrl,
    mediaUrl: buildSignedClipMediaUrl(
      selectedQuality.sourceURL,
      playbackAccessToken.signature,
      playbackAccessToken.value,
    ),
    quality: selectedQuality.quality,
    resolvedAt: new Date().toISOString(),
    source: "twitch-gql",
  };

  setCachedClipMedia(resolvedPayload);
  return resolvedPayload;
}
