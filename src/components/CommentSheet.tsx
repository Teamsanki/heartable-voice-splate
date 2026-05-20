import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { addComment, listenComments } from "@/lib/social";

export function CommentSheet({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => listenComments(postId, setItems), [postId]);

  const send = async () => {
    if (!user || !profile || !text.trim()) return;
    setBusy(true);
    try {
      await addComment(postId, user.uid, profile.name, text.trim());
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full sm:max-w-[480px] mx-auto bg-sunset-50 rounded-t-3xl max-h-[80dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h3 className="font-serif italic text-xl">Comments · {items.length}</h3>
          <button onClick={onClose} className="text-2xl opacity-50">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3">
          {items.length === 0 && (
            <p className="text-center text-sm opacity-50 py-10">
              Pehla comment tu kar.
            </p>
          )}
          {items.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-3 ring-1 ring-foreground/5">
              <p className="text-[11px] font-semibold mb-1">{c.name}</p>
              <p className="text-sm">{c.text}</p>
            </div>
          ))}
        </div>
        <div
          className="border-t border-foreground/5 p-3 flex gap-2"
          style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kuch bol…"
            maxLength={300}
            className="flex-1 px-4 py-2.5 rounded-full bg-white ring-1 ring-foreground/10 text-sm outline-none focus:ring-sunset-600"
          />
          <button
            onClick={send}
            disabled={busy || !text.trim()}
            className="px-5 rounded-full bg-sunset-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}