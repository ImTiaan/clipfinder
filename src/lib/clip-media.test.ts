import { afterEach, describe, expect, it, vi } from "vitest";

import { extractClipSlug, resolveClipMedia } from "./clip-media";

describe("extractClipSlug", () => {
  it("reads the clip slug from a channel clip URL", () => {
    expect(
      extractClipSlug("https://www.twitch.tv/its_teewee/clip/FunClipSlug-Example123"),
    ).toBe("FunClipSlug-Example123");
  });

  it("throws for an invalid clip URL", () => {
    expect(() => extractClipSlug("not-a-url")).toThrow("The clip URL is invalid.");
  });
});

describe("resolveClipMedia", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a signed direct media URL from Twitch clip playback data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          clip: {
            id: "ExampleClip",
            playbackAccessToken: {
              signature: "signed-value",
              value: '{"clip_slug":"ExampleClip","expires":123}',
            },
            videoQualities: [
              {
                quality: "1080",
                sourceURL: "https://cdn.example.com/1080/index.mp4",
              },
              {
                quality: "720",
                sourceURL: "https://cdn.example.com/720/index.mp4",
              },
            ],
          },
        },
      }),
    } as Response);

    const payload = await resolveClipMedia(
      "https://www.twitch.tv/its_teewee/clip/ExampleClip",
    );

    expect(payload.clipId).toBe("ExampleClip");
    expect(payload.quality).toBe("720");
    expect(payload.source).toBe("twitch-gql");
    expect(payload.mediaUrl).toContain("https://cdn.example.com/720/index.mp4");
    expect(payload.mediaUrl).toContain("sig=signed-value");
    expect(payload.mediaUrl).toContain("token=%7B%22clip_slug%22%3A%22ExampleClip%22");
  });
});
