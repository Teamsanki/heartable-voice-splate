import { useEffect, useMemo, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { push, ref, serverTimestamp, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { bumpStreak } from "@/lib/streak";
import { SHAYARI_FONTS, loadShayariFont, shayariFontFamily } from "@/lib/shayari";

const BG_PRESETS = [
  { id: "ink",  label: "Black Ink", bg: "linear-gradient(135deg,#0a0a0a,#1a1a1a)", fg: "#fff8ee" },
  { id: "sunset", label: "Sunset",  bg: "linear-gradient(135deg,#3a0a00,#a04a1a)", fg: "#fff5e6" },
  { id: "midnight", label: "Midnight", bg: "linear-gradient(135deg,#0a0a2a,#1a1a4a)", fg: "#e8e8ff" },
  { id: "paper", label: "Cream Paper", bg: "linear-gradient(135deg,#f5ecd9,#e8d8b8)", fg: "#2a1a0a" },
  { id: "ruby", label: "Ruby", bg: "linear-gradient(135deg,#3a000a,#8b0030)", fg: "#ffe8ec" },
];

export function ShayariComposer({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [text, setText] = useState("");
  const [fontId, setFontId] = useState<string>(SHAYARI_FONTS[0].id);
  const [bgId, setBgId] = useState<string>(BG_PRESETS[0].id);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadShayariFont(fontId as any); }, [fontId]);
  useEffect(() => { SHAYARI_FONTS.forEach((f) => loadShayariFont(f.id as any)); }, []);

  const bg = useMemo(() => BG_PRESETS.find((b) => b.id === bgId)!, [bgId]);

  const post = async () => {
    if (!user || !profile || !text.trim()) return;
    setBusy(true);
    try {
      const node = push(ref(db, "feed"));
      await set(node, {
        uid: user.uid,
        name: profile.name,
        photo: profile.photo || null,
        type: "shayari",
        text: text.trim().slice(0, 600),
        fontId,
        bgId,
        bgCss: bg.bg,
        fgColor: bg.fg,
        category: "shayari",
        durationSec: 0,
        filter: "none",
        url: "",
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        createdAt: serverTimestamp(),
      });
      await bumpStreak(user.uid);
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div className="w-full sm:max-w-[460px] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-4 border-b border-black/5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] opacity-50">New Post</p>
            <h2 className="font-serif italic text-2xl flex items-center gap-2">Shayari <Sparkles className="size-4 text-amber-500" /></h2>
          </div>
          <button onClick={onClose} className="size-9 rounded-full bg-black/5 grid place-items-center"><X className="size-4" /></button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Live preview */}
          <div
            className="aspect-[4/5] rounded-2xl grid place-items-center p-6 text-center overflow-hidden"
            style={{ background: bg.bg, color: bg.fg }}
          >
            <p
              style={{ fontFamily: shayariFontFamily(fontId), lineHeight: 1.4 }}
              className="text-2xl sm:text-3xl whitespace-pre-wrap break-words"
            >
              {text || "Apni shayari likh…\nTumhari awaaz, tumhare alfaaz."}
            </p>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={600}
            rows={4}
            placeholder="Write your shayari here…"
            className="w-full px-4 py-3 rounded-xl bg-black/5 text-sm outline-none resize-none"
          />

          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Style</p>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {SHAYARI_FONTS.map((f) => (
                <button key={f.id} onClick={() => setFontId(f.id)}
                  className={`px-3 py-2 rounded-full whitespace-nowrap text-sm ring-1 transition ${fontId === f.id ? "bg-sunset-900 text-sunset-50 ring-sunset-900" : "bg-white ring-black/10"}`}
                  style={{ fontFamily: f.family }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Background</p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {BG_PRESETS.map((b) => (
                <button key={b.id} onClick={() => setBgId(b.id)}
                  className={`size-12 rounded-xl ring-2 transition ${bgId === b.id ? "ring-sunset-900 scale-105" : "ring-transparent"}`}
                  style={{ background: b.bg }} aria-label={b.label} />
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-black/5">
          <button onClick={post} disabled={!text.trim() || busy}
            className="w-full py-3 rounded-full bg-sunset-900 text-sunset-50 text-sm font-semibold disabled:opacity-50">
            {busy ? "Posting…" : "Share Shayari"}
          </button>
        </div>
      </div>
    </div>
  );
}