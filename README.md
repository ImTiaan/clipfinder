# Clipfinder

Clipfinder is a desktop-first Twitch clip queue built for `clips.teewee.live`. It fetches recent clips from a broader Twitch category feed, looks up the originating VOD title, and only keeps clips whose source stream title matches the expanded ChaseRP title rules, case-insensitively.

## What It Does

- Offers fixed time windows: `24h`, `3d`, `7d`, and `30d`
- Shows a large native video player on the left for stream playback
- Shows a right-hand queue with clip thumbnails, creator details, views, and watched state
- Excludes clips that cannot be verified against a source VOD title
- Resolves signed direct clip media through Twitch GraphQL instead of using the Twitch iframe
- Builds wider date windows from smaller time slices so `30d` better behaves like an extension of `7d`, `3d`, and `24h`
- Auto-skips failed clips after a short countdown so the queue does not stall on stream
- Uses a dark green, glassy visual system designed to sit alongside `teewee.live`

## Environment Setup

Create a local `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

Fill in these values:

```env
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
TWITCH_GAME_ID=32982
```

Notes:

- `TWITCH_GAME_ID=32982` targets the GTA V category and is the intended best-effort discovery mode for ChaseRP clips.
- If Twitch does not return a usable `video_id` for a clip, that clip is excluded from the playable queue.
- The current title matcher accepts these variants: `chaserp`, `chase rp`, `chase roleplay`, `chaseroleplay`, `chase-rp`, `chase-roleplay`, `#chaserp`, `!chaserp`, `chase_rp`, and `chase_roleplay`.
- This setup does not guarantee every matching Twitch clip, because Twitch does not expose a true global clip search by source stream title.
- Direct playback URLs are resolved on demand and may expire, so the app re-resolves them as needed.

## Local Development

Install dependencies:

```bash
npm install
```

Start the local server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Quality Checks

Run the full verification suite with:

```bash
npm run check
```

This runs linting, unit tests, and a production build.
