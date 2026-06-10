import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { MobileShell } from "@/components/MobileShell";
import { getProfileRaw, updateProfileFields, updateProfilePhoto } from "@/lib/social";
import { uploadImage } from "@/lib/voice-api";
import { ArrowLeft, Camera } from "lucide-react";

export const Route = createFileRoute("/profile/edit")({
  head: () => ({ meta: [{ title: "Edit Profile — Heartable" }] }),
  component: EditProfile,
});

function EditProfile() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [link, setLink] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProfileRaw(user.uid).then((p) => {
      setName(p.name || "");
      setUsername(p.username || "");
      setBio(p.bio || "");
      setLink(p.link || "");
      setPhoto(p.photo || null);
      setLoaded(true);
    });
  }, [user]);

  if (!user || !profile) {
    return (
      <div className="min-h-screen grid place-items-center text-sm">
        <Link to="/login" className="underline">Login</Link>
      </div>
    );
  }

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(f.type)) { setErr("JPG / PNG / WEBP only"); e.target.value = ""; return; }
    if (f.size > 5 * 1024 * 1024) { setErr("Image must be under 5 MB"); e.target.value = ""; return; }
    setUploading(true); setErr(null);
    try {
      const url = await uploadImage(user.uid, f, "avatars");
      await updateProfilePhoto(user.uid, url);
      setPhoto(url);
    } catch (er: any) { setErr(er?.message || "Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const onSave = async () => {
    if (!name.trim()) { setErr("Name required"); return; }
    if (link && !/^https?:\/\//i.test(link)) { setErr("Link must start with http:// or https://"); return; }
    setSaving(true); setErr(null); setOk(false);
    try {
      await updateProfileFields(user.uid, {
        name: name.trim(),
        username: username.trim(),
        bio: bio.trim(),
        link: link.trim(),
      });
      setOk(true);
      setTimeout(() => nav({ to: "/profile" }), 500);
    } catch (e: any) { setErr(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <MobileShell className="p-5 gap-5">
      <header className="flex items-center gap-3">
        <Link to="/profile" aria-label="Back" className="size-9 grid place-items-center rounded-full bg-sunset-100">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-serif italic text-2xl">Edit profile</h1>
      </header>

      <div className="flex justify-center">
        <label className="relative size-24 rounded-full bg-sunset-900 text-sunset-50 grid place-items-center text-3xl font-semibold overflow-hidden cursor-pointer group">
          {photo ? <img src={photo} className="w-full h-full object-cover" alt="" /> : name.slice(0, 1).toUpperCase() || "?"}
          <span className="absolute inset-0 bg-black/40 grid place-items-center opacity-0 group-hover:opacity-100 transition">
            <Camera className="size-5" />
          </span>
          {uploading && <span className="absolute inset-0 bg-black/60 grid place-items-center text-xs">…</span>}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="hidden" />
        </label>
      </div>

      {loaded && (
        <div className="space-y-3">
          <Field label="Name" hint={`${name.length}/40`}>
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10 text-sm outline-none" />
          </Field>
          <Field label="Username" hint="a-z, 0-9, _ .">
            <div className="flex items-center bg-card rounded-xl ring-1 ring-foreground/10 px-3">
              <span className="text-sm opacity-50">@</span>
              <input value={username} maxLength={24}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                placeholder="yourname"
                className="w-full px-2 py-2.5 bg-transparent text-sm outline-none" />
            </div>
          </Field>
          <Field label="Bio" hint={`${bio.length}/160`}>
            <textarea value={bio} maxLength={160} rows={3}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line about you…"
              className="w-full px-4 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10 text-sm outline-none resize-none" />
          </Field>
          <Field label="Link">
            <input value={link} type="url" placeholder="https://…"
              onChange={(e) => setLink(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-card ring-1 ring-foreground/10 text-sm outline-none" />
          </Field>
        </div>
      )}

      {err && <p className="text-xs text-red-500">{err}</p>}
      {ok && <p className="text-xs text-green-600">Saved!</p>}

      <button onClick={onSave} disabled={saving || !loaded}
        className="w-full py-3 rounded-full bg-sunset-600 text-white text-sm font-semibold disabled:opacity-50">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </MobileShell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <div className="flex justify-between text-[10px] uppercase tracking-widest opacity-60">
        <span>{label}</span>
        {hint && <span>{hint}</span>}
      </div>
      {children}
    </label>
  );
}