# Debug Session: clips-not-showing

- Status: OPEN
- Started: 2026-07-21
- Symptom: Twitch credentials appear connected, but no clips are showing in the queue UI.
- Expected: Matching clips should appear when the broadcaster and credentials are valid.

## Hypotheses
- H1: The Twitch broadcaster ID is incorrect, so the Helix clips query returns no relevant records.
- H2: The Twitch app token request succeeds, but the clips or videos requests are failing with an API error or scope issue.
- H3: Clips are being fetched, but all are filtered out because none of the source VOD titles contain `chaserp` or `chase rp`.
- H4: Clips exist, but many or all returned clips lack a usable `video_id`, so they are excluded before display.
- H5: The queue API is returning data, but the client-side state is not selecting or rendering the returned clips correctly.

## Evidence Log
- E1: Broadcaster lookup for `TWITCH_BROADCASTER_ID` succeeded and resolves to the expected Twitch channel `its_teewee`.
- E2: Raw Twitch clips query returns clip data for the broadcaster, so credentials and broadcaster ID are valid.
- E3: Many returned clips have an empty `video_id`, which means they are excluded by design because the source stream title cannot be verified.
- E4: Source VOD lookups for the clips that do have `video_id` values return titles such as `SGT Misha | LSPD | ChaseRP` and `500 follower goal! | SGT Misha | LSPD | ChaseRP`, which do satisfy the filter rule.
- E5: Current window counts from Twitch are:
  - `24h`: 0 clips
  - `3d`: 0 clips
  - `7d`: 1 clip with a usable `video_id`

## Interim Conclusion
- H1 rejected: the broadcaster ID is valid.
- H2 rejected: Twitch auth and Helix queries are succeeding.
- H3 not supported for the visible `7d` sample: at least one source VOD title matches `ChaseRP`.
- H4 supported in part: many clips are excluded because they do not expose a usable `video_id`.
- H5 not supported by current evidence: the primary issue appears to be empty short time windows rather than client rendering.

## Next Steps
- Confirm whether the user is testing on the default `24h` or `3d` view.
- If desired, change the default window to `7d` so the queue is less likely to appear empty on first load.
- Add instrumentation only if the user still sees no clips on `7d`.
