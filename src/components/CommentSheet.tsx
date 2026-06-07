import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { addComment, listenComments } from "@/lib/social";
import { deleteComment } from "@/lib/posts";
import { submitReport } from "@/lib/reports";
import { Trash2, Flag } from "lucide-react";

export function CommentSheet({
  postId,
  authorUid,
  onClose,
}: {
  postId: string;
  authorUid: string;
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
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[11px] font-semibold">{c.name}</p>
                <div className="flex items-center gap-1.5">
                  {user && c.uid !== user.uid && (
                    <button
                      onClick={async () => {
                        const reason = prompt("Report this comment — reason?");
                        if (!reason) return;
                        await submitReport({
                          kind: "comment",
                          targetId: `${postId}/${c.id}`,
                          targetUid: c.uid,
                          reporterUid: user.uid,
                          reporterName: profile?.name || "User",
                          reason: reason.slice(0, 200),
                          link: `/p/${postId}`,
                        });
                        alert("Reported. Admin will review.");
                      }}
                      className="opacity-40 hover:opacity-100"
                      aria-label="Report comment"
                    >
                      <Flag className="size-3.5" />
                    </button>
                  )}
                  {user && (user.uid === authorUid || user.uid === c.uid) && (
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this comment?")) return;
                        await deleteComment(postId, c.id);
                      }}
                      className="opacity-40 hover:opacity-100 text-red-600"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
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