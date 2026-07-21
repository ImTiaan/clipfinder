import type { Metadata } from "next";

import ClipQueueApp from "@/components/ClipQueueApp";
import { getClipQueueData } from "@/lib/clip-queue";
import { ClipQueueResponse, TimeRange } from "@/lib/types";

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
}> {
  try {
    const initialData = await getClipQueueData(DEFAULT_RANGE);
    return {
      initialData,
      initialError: null,
    };
  } catch (error) {
    return {
      initialData: null,
      initialError:
        error instanceof Error
          ? error.message
          : "Could not load the initial Twitch clip queue.",
    };
  }
}

export default async function Home() {
  const { initialData, initialError } = await loadInitialData();

  return (
    <ClipQueueApp
      initialData={initialData}
      initialError={initialError}
      initialRange={DEFAULT_RANGE}
    />
  );
}
