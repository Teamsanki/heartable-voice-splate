import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { isFounder } from "@/lib/roles";
import { UserBadges } from "@/components/UserBadges";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/BottomNav";
import { MobileShell } from "@/components/MobileShell";
import { GuestExpiryCard } from "@/components/GuestExpiryCard";
import { badgeFor } from "@/lib/streak";
import { listenUserStats, listenUserPosts, type UserStats } from "@/lib/social";
import { updateProfileName, updateProfilePhoto } from "@/lib/social";
import { uploadImage } from "@/lib/voice-api";

import { Settings as SettingsIcon, Pencil, Camera, Bookmark, Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Heartable" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, isGuest, upgradeGuestEmail, upgradeGuestGoogle } = useAuth();
  const navigate = useNavigate();
  const [streak, setStreak] = useState<{ count: number; badge: string } | null>(null);
  const [stats, setStats] = useState<UserStats>({ followers: 0, following: 0, totalLikes: 0, totalShares: 0 });
  const [posts, setPosts] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!user) return;
    const u1 = onValue(ref(db, `${VOICE_ROOT}/${user.uid}/streak`), (s) =>
      setStreak(s.val()),
    );
    const u2 = listenUserStats(user.uid, setStats);
    const u3 = listenUserPosts(user.uid, setPosts);
    return () => { u1(); u2(); u3(); };
  }, [user]);

  if (!user || !profile) {
    return (
      <div className="min-h-screen grid place-items-center">
        <button onClick={() => navigate({ to: "/login" })} className="underline">Login</button>
      </div>
    );
  }

  const days = streak?.count || 0;
  const badge = streak?.badge || badgeFor(days);
  const isAdmin = isFounder(user.email);

  const upgradeEmail = async () => {
    setBusy(true); setErr(null);
    try { await upgradeGuestEmail(email.trim(), pw); }
    catch (e: any) { setErr(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  const upgradeGoogle = async () => {
    setBusy(true); setErr(null);
    try { await upgradeGuestGoogle(); }
    catch (e: any) { setErr(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadImage(user.uid, f, "avatars");
      await updateProfilePhoto(user.uid, url);
    } catch (err: any) {
      alert(err?.message || "Upload fail");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  return (
    <MobileShell className="p-5 gap-5">
        <div className="flex justify-end gap-2 -mb-2">
          <Link to="/search" aria-label="Search"
            className="size-9 rounded-full bg-sunset-100 grid place-items-center">
            <SearchIcon className="size-4" />
          </Link>
          <Link to="/bookmarks" aria-label="Saved"
            className="size-9 rounded-full bg-sunset-100 grid place-items-center">
            <Bookmark className="size-4" />
          </Link>
          <Link to="/settings" aria-label="Settings"
            className="size-9 rounded-full bg-sunset-100 grid place-items-center">
            <SettingsIcon className="size-4" />
          </Link>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <label className="relative size-16 rounded-full bg-sunset-900 text-sunset-50 grid place-items-center text-2xl font-semibold overflow-hidden cursor-pointer group">
            {profile.photo ? <img src={profile.photo} className="w-full h-full object-cover" /> : profile.name.slice(0, 1).toUpperCase()}
            <span className="absolute inset-0 bg-black/40 grid place-items-center opacity-0 group-hover:opacity-100 transition">
              <Camera className="size-5" />
            </span>
            {uploadingPhoto && <span className="absolute inset-0 bg-black/60 grid place-items-center text-[10px]">…</span>}
            <input type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
          </label>
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus
                  className="px-2 py-1 rounded-lg bg-white ring-1 ring-foreground/10 text-lg outline-none" />
                <button onClick={async () => {
                  if (nameDraft.trim()) await updateProfileName(user.uid, nameDraft.trim());
                  setEditingName(false);
                }} className="text-xs font-semibold text-sunset-600">Save</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="font-serif italic text-3xl leading-none">{profile.name}</h1>
                <UserBadges uid={user.uid} email={user.email} size={14} />
                <button onClick={() => { setNameDraft(profile.name); setEditingName(true); }}
                  className="opacity-50 hover:opacity-100"><Pencil className="size-3.5" /></button>
              </div>
            )}
            <p className="text-xs opacity-60 mt-1">
              {isGuest ? "Guest account" : user.email || "Signed in"}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 bg-white rounded-2xl p-3 ring-1 ring-foreground/5 text-center">
          {[
            { k: stats.followers, l: "Followers" },
            { k: stats.following, l: "Following" },
            { k: stats.totalLikes, l: "Likes" },
            { k: stats.totalShares, l: "Shares" },
          ].map((s) => (
            <div key={s.l}>
              <p className="font-serif italic text-xl leading-none">{s.k}</p>
              <p className="text-[9px] uppercase tracking-widest opacity-60 mt-1">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="bg-sunset-900 text-sunset-50 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Awaaz Streak</p>
            <p className="font-serif text-2xl italic mt-1">{days} days · {badge}</p>
          </div>
          <div className="text-3xl">🎙️</div>
        </div>

        {isGuest && profile.guestExpiresAt && (
          <GuestExpiryCard expiresAt={profile.guestExpiresAt} />
        )}

        {isGuest && (
          <div className="bg-white rounded-2xl p-5 ring-1 ring-foreground/5 space-y-3">
            <h2 className="font-serif italic text-xl">Save your streaks</h2>
            <p className="text-xs opacity-70">
              Guest mode 7 din ka hai. Google se bind kar — data tere paas hi rahega,
              streaks aur followers bach jaayenge.
            </p>
            <button
              onClick={upgradeGoogle}
              disabled={busy}
              className="w-full py-3 rounded-full bg-white ring-1 ring-foreground/10 text-sm font-semibold hover:bg-sunset-50 transition disabled:opacity-50"
            >
              🔗 Link with Google
            </button>
            <div className="space-y-2">
              <input
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-2.5 rounded-xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none"
              />
              <input
                value={pw}
                type="password"
                onChange={(e) => setPw(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2.5 rounded-xl bg-sunset-50 ring-1 ring-foreground/10 text-sm outline-none"
              />
              <button
                onClick={upgradeEmail}
                disabled={busy || !email || !pw}
                className="w-full py-3 rounded-full bg-sunset-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                Save account
              </button>
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
          </div>
        )}

        {/* My posts */}
        {posts.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-serif italic text-lg">Meri Awaazein · {posts.length}</h3>
            <div className="grid grid-cols-3 gap-2">
              {posts.slice(0, 9).map((p) => (
                <Link
                  key={p.id}
                  to="/p/$id"
                  params={{ id: p.id }}
                  className="aspect-square rounded-xl bg-gradient-to-br from-sunset-300 to-sunset-700 p-3 text-sunset-50 flex flex-col justify-between"
                >
                  <span className="text-[10px] opacity-80">🎙️ {Math.round(p.durationSec)}s</span>
                  <span className="text-[10px] font-medium truncate">
                    {p.caption || "voice"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <Link
            to="/admin"
            className="w-full py-3 rounded-full bg-sunset-900 text-sunset-50 text-sm font-semibold text-center"
          >
            Admin Panel →
          </Link>
        )}

        <BottomNav />
    </MobileShell>
  );
}
