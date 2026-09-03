import { describe, expect, it } from "vitest";

import {
  createQueueResponseFromClips,
  getTimeSlicesForRange,
  hasMoreClipPages,
  matchesSourceTitle,
} from "./clip-queue";

describe("matchesSourceTitle", () => {
  it("matches chaserp regardless of case", () => {
    expect(matchesSourceTitle("Big CHASERP courthouse showdown")).toBe(true);
  });

  it("matches chase rp with spacing", () => {
    expect(matchesSourceTitle("Late-night Chase RP patrol")).toBe(true);
  });

  it("matches chase roleplay variations", () => {
    expect(matchesSourceTitle("Evening Chase Roleplay shift")).toBe(true);
    expect(matchesSourceTitle("Evening chase-roleplay shift")).toBe(true);
    expect(matchesSourceTitle("Evening chase_roleplay shift")).toBe(true);
    expect(matchesSourceTitle("Evening chaseroleplay shift")).toBe(true);
  });

  it("matches hashtag and bang-prefixed chaserp tags", () => {
    expect(matchesSourceTitle("#chaserp patrol stream")).toBe(true);
    expect(matchesSourceTitle("!chaserp patrol stream")).toBe(true);
  });

  it("rejects unrelated titles", () => {
    expect(matchesSourceTitle("Variety stream warm-up")).toBe(false);
  });

  it("does not match the keyword as part of a larger word", () => {
    expect(matchesSourceTitle("notchaserp variety hour")).toBe(false);
  });
});

describe("createQueueResponseFromClips", () => {
  it("keeps only clips with a matching source stream title", () => {
    const payload = createQueueResponseFromClips({
      clips: [
        {
          id: "AlphaClip",
          url: "https://clips.twitch.tv/AlphaClip",
          broadcaster_id: "1",
          broadcaster_name: "teewee",
          creator_id: "10",
          creator_name: "viewerA",
          title: "Courtroom chaos",
          view_count: 420,
          created_at: "2026-07-21T10:00:00.000Z",
          thumbnail_url: "https://clips-media-assets2.twitch.tv/example-1-preview-480x272.jpg",
          duration: 30,
          video_id: "vod-1",
        },
        {
          id: "BravoClip",
          url: "https://clips.twitch.tv/BravoClip",
          broadcaster_id: "1",
          broadcaster_name: "teewee",
          creator_id: "11",
          creator_name: "viewerB",
          title: "Random chaos",
          view_count: 60,
          created_at: "2026-07-20T10:00:00.000Z",
          thumbnail_url: "https://clips-media-assets2.twitch.tv/example-2-preview-480x272.jpg",
          duration: 27,
          video_id: "vod-2",
        },
        {
          id: "CharlieClip",
          url: "https://clips.twitch.tv/CharlieClip",
          broadcaster_id: "1",
          broadcaster_name: "teewee",
          creator_id: "12",
          creator_name: "viewerC",
          title: "No source vod",
          view_count: 15,
          created_at: "2026-07-20T11:00:00.000Z",
          thumbnail_url: "https://clips-media-assets2.twitch.tv/example-3-preview-480x272.jpg",
          duration: 18,
          video_id: "",
        },
      ],
      range: "24h",
      refreshedAt: new Date("2026-07-21T12:00:00.000Z"),
      videosById: new Map([
        ["vod-1", { id: "vod-1", title: "!chaserp criminal trial stream" }],
        ["vod-2", { id: "vod-2", title: "Morning variety stream" }],
      ]),
    });

    expect(payload.totalFetched).toBe(3);
    expect(payload.totalEligible).toBe(1);
    expect(payload.excludedWithoutVideo).toBe(1);
    expect(payload.filteredOutByTitle).toBe(1);
    expect(payload.items[0]?.id).toBe("AlphaClip");
    expect(payload.items[0]?.sourceStreamTitle).toBe("!chaserp criminal trial stream");
  });
});

describe("getTimeSlicesForRange", () => {
  const now = new Date("2026-07-21T12:00:00.000Z");

  it("returns a single 24 hour slice for the 24h window", () => {
    const slices = getTimeSlicesForRange("24h", now);

    expect(slices).toEqual([
      {
        startedAt: "2026-07-20T12:00:00.000Z",
        endedAt: "2026-07-21T12:00:00.000Z",
      },
    ]);
  });

  it("builds daily slices for the 7d window", () => {
    const slices = getTimeSlicesForRange("7d", now);

    expect(slices).toHaveLength(7);
    expect(slices[0]).toEqual({
      startedAt: "2026-07-20T12:00:00.000Z",
      endedAt: "2026-07-21T12:00:00.000Z",
    });
    expect(slices[6]).toEqual({
      startedAt: "2026-07-14T12:00:00.000Z",
      endedAt: "2026-07-15T12:00:00.000Z",
    });
  });

  it("keeps the most recent week as daily slices inside the 30d window", () => {
    const slices = getTimeSlicesForRange("30d", now);

    expect(slices).toHaveLength(15);
    expect(slices.slice(0, 7)).toEqual(getTimeSlicesForRange("7d", now));
    expect(slices[7]).toEqual({
      startedAt: "2026-07-11T12:00:00.000Z",
      endedAt: "2026-07-14T12:00:00.000Z",
    });
    expect(slices[14]).toEqual({
      startedAt: "2026-06-21T12:00:00.000Z",
      endedAt: "2026-06-23T12:00:00.000Z",
    });
  });
});

describe("hasMoreClipPages", () => {
  it("continues pagination when Twitch provides a cursor", () => {
    expect(hasMoreClipPages("next-page", 1)).toBe(true);
  });

  it("stops pagination when Twitch omits the cursor", () => {
    expect(hasMoreClipPages(undefined, 1)).toBe(false);
  });

  it("stops pagination when the slice page cap is reached", () => {
    expect(hasMoreClipPages("next-page", 10)).toBe(false);
  });
});
