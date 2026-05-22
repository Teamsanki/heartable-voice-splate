# Phase 2 — Heartable Pro Build

Bhai ye bohot bada scope hai. Pehle plan lock karte hain, fir ek-ek karke clean implement hoga. Sab Firebase Realtime DB me `heartable/users/{uid}/...` structure me save hoga.

## 1. Audio FX — 10 naye effects (record + trending dono pe)
`src/lib/audio-filters.ts` me extend:
- existing: normal, reverb, echo, radio, deep, chipmunk
- naye: **autotune** (pitch-quantize via PeriodicWave), **telephone** (bandpass), **underwater** (lowpass+chorus), **megaphone** (distortion+bandpass), **whisper** (noise gate), **alien** (ring mod), **stadium** (long reverb), **8-bit** (bitcrusher), **slow-mo** (playbackRate 0.7), **fast-fwd** (1.4x)
- TrendingCard pe filter name chip dikhega (`✨ autotune`)

## 2. iOS voice button fix
- Mic permission ke liye `getUserMedia` ko **user gesture** ke andar call karna (iOS strict)
- `AudioContext.resume()` har record start pe
- MediaRecorder mimeType fallback chain: `audio/mp4` (iOS) → `audio/webm;codecs=opus` → default
- `Recorder.tsx` me touch + click dono handlers

## 3. TikTok feed upgrade
- Circular profile pic + name overlay
- **Voice visualizer ring** (canvas) circle ke neeche, BG bhi visualizer hue se animate
- Follow button (already hai) + filter chip
- Block-aware (blocked posts skip)

## 4. Profile system
- Editable name (inline edit)
- Profile photo upload (Supabase storage `voice` bucket me `avatars/{uid}.jpg`)
- Verified tick badges:
  - **Bronze**: 1K followers + 500 likes
  - **Silver**: 10K followers + 5K likes
  - **Gold**: 100K followers + 50K likes
  - **Diamond**: 1M followers
- Trending pe bhi follow button + tick

## 5. Settings (top-right gear icon — `/settings`)
Profile se Help/Signout hata ke yahan:
- Theme: Dark / System / Light (default dark, persist in RTDB)
- Online activity: on/off
- Block list (manage/unblock)
- Privacy Policy link
- Help (support ticket)
- Sign out
- Delete my voices / stories

## 6. Block system
- `heartable/users/{uid}/blocks/{blockedUid}: true`
- Blocker side: blocked user ki feed/posts hide
- Blocked user side: blocker ka name = "Heartable User", DP hidden, chat send disabled
- DM list block-aware

## 7. Chat (Friends-only DM) + media
- Sirf mutual follow (friends) ke saath DM allow
- DM list sirf friends dikhega
- Voice + image + text messages
- Report button DM top: **Chat report** (select messages → forward to admin) / **User report**

## 8. Reports & Admin moderation
- `heartable/reports/{id}` — feed/voice/user/chat report with reason + link
- Admin panel pe reports tab → action: delete voice / ban voice / warn user / ban user / give penalty
- Banned user → ban screen, data hidden everywhere

## 9. Stories
- Reactions notify owner (`notifications/{uid}` me entry)
- Friends to friends → reply directly opens DM with story attached
- **Admin permanent stories** (>24h, no auto-expire)
- User can delete own story / voice

## 10. Notifications center (`/notifications`)
- In-app feed: likes, comments, follows, story reactions, admin messages
- Browser push: admin broadcast (already done) + extend to likes if permission granted
- Bell icon on home with unread badge

## 11. Owner / Admin / User roles
- Owner: `schoudhary11256@gmail.com` (already)
- Owner can promote user → admin (limited): only user manage + tickets reply
- Owner can change: site name, tagline, favicon (stored in `heartable/site/config`, applied via `__root.tsx` head)
- Admins: cannot change site config

## 12. RTDB structure
```text
heartable/
  site/config: { name, tagline, favicon }
  users/{uid}/
    profile: { name, photo, bio, createdAt }
    settings: { theme, onlineActivity }
    blocks/{blockedUid}: true
    roles: { admin: bool, banned: bool, warnings: n }
    stats: { followers, following, likes, shares }
    notifications/{nid}: { type, fromUid, postId, text, read, ts }
  reports/{id}: { kind, targetId, reporterUid, reason, ts, status }
  bans/{uid}: { reason, by, ts }
```

## Execution order (single turn, but clean separation)
1. Audio filters + Recorder iOS fix (lib level)
2. RTDB helpers (`src/lib/settings.ts`, `src/lib/blocks.ts`, `src/lib/reports.ts`, `src/lib/notifications-store.ts`, `src/lib/admin-ext.ts`, `src/lib/verified.ts`)
3. New routes: `/settings`, `/notifications`
4. Profile cleanup + name edit + verified badge
5. TikTok feed visualizer + filter chip + block filter
6. DM friends-only + media + report
7. Admin panel extensions (reports tab, ban, site config, promote)
8. Story reactions notify + permanent story for admin
9. Wire BottomNav + top-right gear

## Notes / trade-offs
- Image uploads (avatar, chat image) → Supabase `voice` bucket (already public, working)
- Theme = pure CSS class on `<html>`, persisted to RTDB on settings load
- Verified tick = computed client-side from stats (no separate flag needed for milestone tiers)
- Push notifications stay foreground-only (no SW/VAPID), already in place

Ready to build?
