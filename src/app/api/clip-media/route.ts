import { NextRequest, NextResponse } from "next/server";

import { resolveClipMedia } from "@/lib/clip-media";
import { ApiErrorResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const clipUrl = request.nextUrl.searchParams.get("clipUrl");

  if (!clipUrl) {
    const response: ApiErrorResponse = {
      error: "clip_media_missing_url",
      message: "Could not resolve clip playback.",
      details: "A clip URL is required.",
    };

    return NextResponse.json(response, { status: 400 });
  }

  try {
    const payload = await resolveClipMedia(clipUrl);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    const response: ApiErrorResponse = {
      error: "clip_media_lookup_failed",
      message: "Could not resolve direct playback for this clip.",
      details: message,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
