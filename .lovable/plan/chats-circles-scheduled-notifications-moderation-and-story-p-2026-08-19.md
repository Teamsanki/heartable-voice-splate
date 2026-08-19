# Chats, circles, scheduled notifications, moderation, and story privacy

## Build
- Repair private Chat navigation and inbox loading around mutual-follow access, including explicit loading, permission, signed-out, blocked, and follow-back states with one-tap retry. Populate and order the inbox from thread summaries instead of scanning every message.
- Move Circles into the Chats screen as a dedicated tab. Replace the current auto-join voice room with Telegram-style circles: creation asks for name, description, optional link, public/private visibility, and a unique public handle; public circles open via a shareable Heartable link, while private circles require an invite link or membership.
- Add circle discovery, join/leave, owner controls, member count, share/copy invite, and a proper conversation screen for text, voice, and shared-post messages. Existing `/mehfil` links will redirect into the new Chats/Circles experience.
- Add inbox search plus filters for unread conversations, shared reels/posts, story reactions/replies, and circles; matching searches will inspect thread metadata and recent message content.

## Notifications
- Extend notification preferences with quiet hours, timezone, and optional per-type delivery windows for Chat/DM sends, story reactions, and story replays. The same scheduler will control browser alerts and the in-app notification center; events remain visible in-app even when push delivery is silenced.
- Add richer notification-center filtering, unread state, and links to the relevant chat, story, or post.
- Scaffold Firebase Cloud Messaging for the published app: messaging service worker, browser token registration, device-token lifecycle, and permission UI. Because credentials are not available yet, background delivery will remain safely disabled until the VAPID key and trusted sender credentials are connected; foreground and in-app notifications will work now.
- Add a protected notification dispatch endpoint design for DM sends and story replays so credentials can be connected later without exposing secrets in the browser.

## Reports and privacy
- Give users a “My reports” view with live `open`, `under review`, `actioned`, and `dismissed` statuses. Report submission will create a per-user status index while preserving the admin queue.
- Auto-hide reported DM cards and story shares for the reporter while a report is open/under review, with a compact placeholder and an option to reveal it. Admin actions update the reporter-facing status.
- Add story viewer privacy settings: full viewer list, recent viewers only, or totals-only. Enforce the selected mode in the story UI while always keeping aggregate views and rewatch totals visible to the story owner.

## Data and access rules
- Add normalized thread summaries and per-user inbox indexes so chat rows are readable and sortable without broad message reads.
- Store circles separately with metadata, unique handles, memberships, invite tokens, and messages. Public metadata is discoverable to signed-in users; message reads/writes require membership; private-circle access requires membership or a valid invite flow.
- Store FCM device tokens only under the owning user, notification events under the recipient, schedule preferences under user settings, and report-status indexes under the reporter.
- Tighten the documented Realtime Database and Storage rules for mutual-follow DMs, circle ownership/membership, notification tokens, report visibility, and story viewer privacy.

## Validation
- Verify signed-in navigation from inbox to an existing mutual-follow chat, retry/follow-back states, real message delivery, unread ordering, and all inbox filters.
- Verify public handle uniqueness, public/private circle creation, invite/join/leave behavior, circle links, and text/voice messages on mobile.
- Verify quiet hours across midnight and timezone changes, per-type windows, foreground/in-app consistency, and graceful “push setup pending” behavior.
- Verify report status updates, reporter-only auto-hiding, admin moderation transitions, and all three story viewer privacy modes in the running preview.
