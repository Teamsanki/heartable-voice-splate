import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, push, ref, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/mehfil")({
  head: () => ({ meta: [{ title: "Mehfil — Heartable" }] }),
  component: MehfilList,
});

type Circle = { id: string; name: string; members: number };

function MehfilList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, "mehfil"), (snap) => {
      const out: Circle[] = [];
      snap.forEach((c) => {
        const members = c.child("members").size || 0;
        out.push({
          id: c.key!,
          name: c.child("name").val() || "Mehfil",
          members,
        });
      });
      setCircles(out);
    });
    return () => unsub();
  }, []);

  const create = async () => {
    if (!user || !newName.trim()) return;
    const node = push(ref(db, "mehfil"));
    await set(node, {
      name: newName.trim(),
      createdBy: user.uid,
      createdAt: Date.now(),
      members: { [user.uid]: true },
    });
    setNewName("");
    navigate({ to: "/mehfil/$id", params: { id: node.key! } });
  };

  return (
    <div className="min-h-screen bg-sunset-50 text-sunset-900">
      <div className="max-w-[460px] mx-auto min-h-screen flex flex-col p-6 gap-5 pb-32">
        <h1 className="font-serif italic text-3xl">Mehfil</h1>
        <p className="text-sm opacity-70">Voice circles — friends ke saath khulke baat.</p>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nayi mehfil ka naam…"
            maxLength={40}
            className="flex-1 px-4 py-3 rounded-2xl bg-white ring-1 ring-foreground/10 text-sm outline-none focus:ring-sunset-600"
          />
          <button
            onClick={create}
            disabled={!newName.trim()}
            className="px-5 rounded-2xl bg-sunset-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            Create
          </button>
        </div>

        <div className="space-y-3 mt-2">
          {circles.length === 0 && (
            <p className="text-center text-sm opacity-50 py-10">
              Koi circle nahi — pehli mehfil tu bana!
            </p>
          )}
          {circles.map((c) => (
            <Link
              key={c.id}
              to="/mehfil/$id"
              params={{ id: c.id }}
              className="block bg-white rounded-2xl p-4 ring-1 ring-foreground/5 flex items-center justify-between"
            >
              <div>
                <p className="font-serif italic text-lg">{c.name}</p>
                <p className="text-xs opacity-60">{c.members} members</p>
              </div>
              <span className="text-sunset-600">→</span>
            </Link>
          ))}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
