# Private sharing, stories, notifications, and creator analytics

## Build
- Restore private Chats as a mutual-follow feature: both users must follow each other, neither can be blocked, and the chat route will show a clear follow-back/access state instead of hanging. Populate the inbox from real thread activity so shared posts and reactions appear immediately.
- Apply the existing rich Share Sheet to feed cards and vertical reels with a new send/share icon. Only mutual followers appear as DM recipients; sends create a real shared-post message in that private thread.
- Upgrade stories with public viewing for signed-in users, animated unseen/seen story rings, unique viewers, total views, rewatches, owner-only viewer details, quick emoji replies, text replies, and recorded voice replies delivered into the story owner’s DM.
- Add report and block actions to shared-post cards in Chats and stories, with immediate feedback and navigation safety after blocking.
- Add per-user controls for replay/DM/story-reaction notifications plus autoplay and Wi-Fi-only playback. Foreground listeners will generate browser/in-app alerts for enabled event types.
- Add a creator analytics route linked from Profile, with date filters and per-post totals for DM sends, story shares, and replays.

## Data and rules
- Store thread summaries/participants for reliable inbox ordering while keeping messages under the existing deterministic thread ID.
- Record timestamped per-post share events for date filtering; preserve existing aggregate counters.
- Store story viewers as `{count, firstSeenAt, lastSeenAt, name, photo}` and send story reactions/replies as typed DM messages.
- Update the documented Realtime Database rules so DM reads/writes require mutual follows and story owner/viewer writes are narrowly scoped.

## Validation
- Verify route rendering and metadata, mutual-follow access states, shared-post DM delivery, story view/rewatch/reaction behavior, settings persistence, analytics filtering, and mobile layouts in the running preview.
