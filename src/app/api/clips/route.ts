import { NextRequest, NextResponse } from "next/server";

import { getClipQueueData, isTimeRange } from "@/lib/clip-queue";
import { ApiErrorResponse, TIME_RANGE_OPTIONS, TimeRange } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_RANGE: TimeRange = "24h";

export async function GET(request: NextRequest) {
  const rangeParam = request.nextUrl.searchParams.get("range");
  const range = isTimeRange(rangeParam) ? rangeParam : DEFAULT_RANGE;

  try {
    const payload = await getClipQueueData(range);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    const response: ApiErrorResponse = {
      error: "clip_queue_fetch_failed",
      message: "Could not load the Twitch clip queue.",
      details: message,
    };

    return NextResponse.json(response, {
      status: 500,
      headers: {
        "x-supported-ranges": TIME_RANGE_OPTIONS.join(","),
      },
    });
  }
}
