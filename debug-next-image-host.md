# Debug Session: next-image-host

- Status: OPEN
- Started: 2026-07-21
- Symptom: `next/image` throws a runtime error for Twitch thumbnail URLs from `static-cdn.jtvnw.net`.
- Expected: Queue thumbnails should render without host validation errors.

## Hypotheses
- H1: `static-cdn.jtvnw.net` is missing from `images.remotePatterns`.
- H2: The queue uses a Twitch thumbnail host different from the clip asset hosts already configured.
- H3: The error persists because the local dev server has not reloaded the updated Next config.
- H4: The failing image URL shape requires a broader remote image rule than the current config provides.

## Evidence Log
- E1: Runtime error explicitly states that `static-cdn.jtvnw.net` is not configured under Next image hosts.
- E2: Current `next.config.ts` only includes `clips-media-assets.twitch.tv` and `clips-media-assets2.twitch.tv`.

## Planned Fix
- Add `static-cdn.jtvnw.net` to `images.remotePatterns`.
- Rebuild and verify that the project compiles cleanly.
