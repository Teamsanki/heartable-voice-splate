## Heartable — Full Build Plan

Bhai ye bohot bada scope hai — ek hi turn me sab "perfect" karna realistic nahi, isliye main phased approach me banaunga. Tu approve kar to main sab implement karna shuru kar du.

### Tech decisions

- **Auth & DB**: Firebase (jaisa tune diya) — `firebase/app`, `firebase/auth` (Google + Email/Password + Anonymous for guest), `firebase/database` (Realtime DB), `firebase/storage` (voice files).
- **Note**: Lovable Cloud nahi use kar raha kyunki tu explicitly Firebase chahta hai. Firebase config inline rahega (publishable keys, safe).
- **Recording**: Browser `MediaRecorder` API → Blob → Firebase Storage → URL Realtime DB me save.
- **Filters**: Web Audio API (`AudioContext`) se Echo / Slow / Bass Boost / Reverb / Sad Vibe — playback-time effects (true server-side processing avoid, kyunki edge worker me ffmpeg nahi chalega).
- **Waveform**: Live recording me `AnalyserNode`, feed me static bars decoded from audio buffer.
- **Splash**: Pehli load pe full-screen animated intro (logo + sunset gradient + Instrument Serif "Heartable" reveal), then home.

### Firebase data shape

```
voice/
  {uid}/
    profile/          { name, photo, isGuest, createdAt, guestExpiresAt }
    stories/{id}      { url, filter, createdAt, expiresAt, replays:{}, reactions:{} }
    snaps/{id}        { url, filter, to, listened, createdAt, expiresAt }
    streak/           { count, lastDate, badge }
mehfil/{circleId}/messages/{id}   { uid, name, url, filter, createdAt }
mehfil/{circleId}/members/{uid}   true
feed/{id}             { uid, name, text, url, filter, plays, reactions, createdAt }
```

Client-side filter: 24hr expiry pe story/snap hide. Optional: scheduled cleanup later.

### Phases

**Phase 1 — Foundation**
- `src/lib/firebase.ts` — initialize app, auth, db, storage.
- `src/lib/auth-context.tsx` — React context: user, isGuest, signInGoogle, signInEmail, signUpEmail, signInGuest(name), signOut.
- Splash screen route `/` shows animated intro 2.5s on first load (sessionStorage flag), then redirects to `/home`.
- Routes: `/login`, `/home` (current feed), `/record`, `/story/$id`, `/mehfil/$id`, `/dm/$uid`, `/profile`.

**Phase 2 — Auth UI**
- `/login` page: Google button, email/password form, "Continue as Guest" (asks name → anonymous signIn → writes profile with `guestExpiresAt = now + 7d`).
- Terms & Conditions + Privacy note: "Your data is stored in India-region Firebase and end-to-end secured" checkbox before sign-in.
- Guest expiry check on app load — if expired, force show login & hide guest option for that anon UID.
- "Save your streaks" CTA in profile for guests → upgrade to email/Google (link anonymous account).

**Phase 3 — Voice recording + filters + storage**
- `useRecorder()` hook: start/stop, returns Blob + live amplitude array.
- Recording UI on home hero & dedicated `/record`: hold-to-record (max 60s), live waveform via AnalyserNode, filter chip selection.
- Upload Blob → `storage/voice/{uid}/{ts}.webm` → push to `feed/` or `snaps/` or `stories/`.
- Playback component: fetches URL, applies Web Audio filter graph based on `filter` field, draws waveform from decoded buffer, play/pause.

**Phase 4 — Stories (24h)**
- Story strip on home reads from `voice/*/stories` across followed users (for MVP: all users).
- Tap → full-screen player, auto-progress, "Replay 1x" button (tracks `replays[uid]`), reactions (❤️🔥😢).
- Client filters items where `expiresAt < now`.

**Phase 5 — 1-on-1 voice notes (DM)**
- `/dm/$uid` thread: list of voice notes between current user ↔ peer, send recorder at bottom.
- "Disappears after listen" — on play, write `listened: true`, then hide.

**Phase 6 — Mehfil group circle**
- `/mehfil/$id` — circular avatar arrangement of members, tap center to record & broadcast to circle, list of recent voice notes with play buttons.
- Create circle flow + invite by username.

**Phase 7 — Awaaz Streak**
- On every voice send: check `streak.lastDate`. If yesterday → +1, if today → noop, else reset to 1.
- Badges: 7 = Silver Mic, 30 = Gold Mic, 100 = Diamond.
- Reminder: client-side check at app load — if `lastDate` is yesterday and now > 20:00, show toast "Aaj awaaz nahi bheji, streak tootne wali hai!"

**Phase 8 — Splash + polish**
- Animated SVG/Motion splash: sunset gradient sweep + "Heartable" italic reveal + tagline fade.
- Bottom nav wired to real routes.
- Remove all mock `feed`, `stories` arrays — replace with realtime `onValue` listeners.

### Files to create / change

- new: `src/lib/firebase.ts`, `src/lib/auth-context.tsx`, `src/lib/recorder.ts`, `src/lib/audio-filters.ts`, `src/lib/streak.ts`
- new components: `Splash`, `VoicePlayer`, `Recorder`, `StoryViewer`, `LoginCard`, `GuestNameDialog`, `TermsCheckbox`
- new routes: `login.tsx`, `home.tsx`, `record.tsx`, `story.$id.tsx`, `mehfil.$id.tsx`, `dm.$uid.tsx`, `profile.tsx`
- rewrite: `src/routes/index.tsx` → splash + redirect
- deps: `firebase`, `motion`

### Important caveats

1. **End-to-end encryption** — true E2EE (only sender+receiver can decrypt) Firebase RTDB me out-of-the-box nahi. Main "in transit + at rest encrypted" (Firebase default TLS + Google's at-rest encryption) implement karunga aur UI me wahi messaging dikhaunga. Asli E2EE chahiye to alag custom crypto layer chahiye — bata to add karunga.
2. **India region**: Firebase project tu jo de raha hai uska region tune Firebase console me set kiya hoga. Code me bas use karenge — region change console se hota hai.
3. **Filters server-side nahi** — playback-time apply honge. Recorded file raw rahega (smaller, flexible). Agar tu chahta hai filter "baked in" file me ho to ek extra step chahiye (recordable AudioContext) — bata to wahi karunga.
4. **Size**: Ye 12-18 files ka build hai. Main ek hi turn me sab likhunga but kuch polish (e.g. Mehfil circle animation, perfect splash timing) shayad iterate karna pade.

Approve karega to start kar deta hu. Ya kuch tweak karna hai (e.g. "phase 1-4 only abhi, rest baad me")?