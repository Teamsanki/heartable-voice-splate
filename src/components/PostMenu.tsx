import { useEffect, useState } from "react";
import { MoreHorizontal, Flag, UserX, Trash2, Settings2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { blockUser } from "@/lib/blocks";
import { submitReport } from "@/lib/reports";
import { deletePost } from "@/lib/social";
import { updatePostSettings } from "@/lib/posts";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";

export function PostMenu({
  postId,
  authorUid,
  onDeleted,
}: {
  postId: string;
  authorUid: string;
  onDeleted?: () => void;
}) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [s, setS] = useState({ hidePlays: false, hideLikes: false, commentsOff: false, hideShares: false });

  useEffect(() => {
    if (!settingsOpen) return;
    return onValue(ref(db, `feed/${postId}`), (snap) => {
      const v = snap.val() || {};
      setS({ hidePlays: !!v.hidePlays, hideLikes: !!v.hideLikes, commentsOff: !!v.commentsOff, hideShares: !!v.hideShares });
    });
  }, [settingsOpen, postId]);

  if (!user) return null;
  const mine = user.uid === authorUid;

  const onReport = async () => {
    const reason = prompt("Report kyu? (spam / abusive / nsfw / other)");
    if (!reason) return;
    await submitReport({
      kind: "post",
      targetId: postId,
      targetUid: authorUid,
      reporterUid: user.uid,
      reporterName: profile?.name || "User",
      reason: reason.slice(0, 200),
      link: `/p/${postId}`,
    });
    alert("Report bhej diya. Admin dekh lega.");
    setOpen(false);
  };

  const onBlock = async () => {
    if (!confirm("Block this user? Iski posts tujhe nahi dikhengi.")) return;
    await blockUser(user.uid, authorUid);
    setOpen(false);
  };

  const onDelete = async () => {
    if (!confirm("Delete this voice?")) return;
    await deletePost(postId);
    onDeleted?.();
    setOpen(false);
  };

  const toggle = async (k: "hidePlays" | "hideLikes" | "commentsOff" | "hideShares") => {
    const next = { ...s, [k]: !s[k] };
    setS(next);
    await updatePostSettings(postId, next);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="size-8 rounded-full grid place-items-center opacity-60 hover:opacity-100">
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-52 bg-card text-card-foreground rounded-xl ring-1 ring-foreground/10 shadow-xl py-1">
            {mine ? (
              <>
                <MenuItem icon={<Settings2 className="size-4" />} label="Post settings" onClick={() => { setSettingsOpen(true); setOpen(false); }} />
                <MenuItem icon={<Trash2 className="size-4" />} label="Delete" onClick={onDelete} danger />
              </>
            ) : (
              <>
                <MenuItem icon={<Flag className="size-4" />} label="Report" onClick={onReport} />
                <MenuItem icon={<UserX className="size-4" />} label="Block user" onClick={onBlock} danger />
              </>
            )}
          </div>
        </>
      )}
      {settingsOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 grid place-items-center p-4" onClick={() => setSettingsOpen(false)}>
          <div className="w-full max-w-sm bg-card text-card-foreground rounded-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif italic text-xl">Post settings</h3>
            <p className="text-[11px] opacity-60">Control how others see this post.</p>
            <Row label="Hide play count" on={s.hidePlays} onChange={() => toggle("hidePlays")} />
            <Row label="Hide like count" on={s.hideLikes} onChange={() => toggle("hideLikes")} />
            <Row label="Turn off comments" on={s.commentsOff} onChange={() => toggle("commentsOff")} />
            <Row label="Hide share count" on={s.hideShares} onChange={() => toggle("hideShares")} />
            <button onClick={() => setSettingsOpen(false)} className="w-full py-2.5 rounded-full bg-sunset-900 text-sunset-50 text-sm font-semibold mt-2">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-foreground/5 ${danger ? "text-red-600" : ""}`}
    >
      {icon} {label}
    </button>
  );
}

function Row({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl ring-1 ring-foreground/10 text-sm">
      <span>{label}</span>
      <span className={`w-9 h-5 rounded-full relative transition ${on ? "bg-sunset-600" : "bg-foreground/20"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white transition ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}