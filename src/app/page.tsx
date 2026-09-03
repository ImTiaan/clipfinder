import type { Metadata } from "next";

import ClipQueueApp from "@/components/ClipQueueApp";
import { resolveClipMedia } from "@/lib/clip-media";
import { getClipQueueData } from "@/lib/clip-queue";
import { ClipMediaResponse, ClipQueueResponse, TimeRange } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_RANGE: TimeRange = "30d";

export const metadata: Metadata = {
  title: "Clip Queue",
  description:
    "Best-effort Twitch clip queue for ChaseRP streams, designed for live review on stream.",
};

async function loadInitialData(): Promise<{
  initialData: ClipQueueResponse | null;
  initialError: string | null;
  initialMedia: ClipMediaResponse | null;
}> {
  try {
    const initialData = await getClipQueueData(DEFAULT_RANGE);
    const firstClip = initialData.items[0] ?? null;
    let initialMedia: ClipMediaResponse | null = null;

    if (firstClip) {
      try {
        initialMedia = await resolveClipMedia(firstClip.url);
      } catch {
        initialMedia = null;
      }
    }

    return {
      initialData,
      initialError: null,
      initialMedia,
    };
  } catch (error) {
    return {
      initialData: null,
      initialError:
        error instanceof Error
          ? error.message
          : "Could not load the initial Twitch clip queue.",
      initialMedia: null,
    };
  }
}

export default async function Home() {
  const { initialData, initialError, initialMedia } = await loadInitialData();

  return (
    <ClipQueueApp
      initialData={initialData}
      initialError={initialError}
      initialMedia={initialMedia}
      initialRange={DEFAULT_RANGE}
    />
  );
}
