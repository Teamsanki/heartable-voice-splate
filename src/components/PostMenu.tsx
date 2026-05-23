import { useState } from "react";
import { MoreHorizontal, Flag, UserX, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { blockUser } from "@/lib/blocks";
import { submitReport } from "@/lib/reports";
import { deletePost } from "@/lib/social";

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

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="size-8 rounded-full grid place-items-center opacity-60 hover:opacity-100">
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-44 bg-card text-card-foreground rounded-xl ring-1 ring-foreground/10 shadow-xl py-1">
            {mine ? (
              <MenuItem icon={<Trash2 className="size-4" />} label="Delete" onClick={onDelete} danger />
            ) : (
              <>
                <MenuItem icon={<Flag className="size-4" />} label="Report" onClick={onReport} />
                <MenuItem icon={<UserX className="size-4" />} label="Block user" onClick={onBlock} danger />
              </>
            )}
          </div>
        </>
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