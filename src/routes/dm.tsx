import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/dm")({
  head: () => ({ meta: [{ title: "Messages — Heartable" }] }),
  component: DMList,
});

type Person = { uid: string; name: string; photo?: string | null };

function DMList() {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    const unsub = onValue(ref(db, VOICE_ROOT), (snap) => {
      const out: Person[] = [];
      snap.forEach((u) => {
        if (u.key === user?.uid) return;
        const p = u.child("profile");
        if (p.exists()) {
          out.push({
            uid: u.key!,
            name: p.child("name").val() || "Friend",
            photo: p.child("photo").val() || null,
          });
        }
      });
      setPeople(out);
    });
    return () => unsub();
  }, [user]);

  return (
    <div className="min-h-screen bg-sunset-50 text-sunset-900">
      <div className="max-w-[460px] mx-auto min-h-screen flex flex-col p-6 gap-5 pb-32">
        <h1 className="font-serif italic text-3xl">Voice Notes</h1>
        <p className="text-sm opacity-70">1-on-1 awaaz — sun li to gayab.</p>

        <div className="space-y-2 mt-2">
          {people.length === 0 && (
            <p className="text-center text-sm opacity-50 py-10">
              Abhi koi friend nahi. Jaisi hi koi join karega, yahan dikhega.
            </p>
          )}
          {people.map((p) => (
            <Link
              key={p.uid}
              to="/dm/$uid"
              params={{ uid: p.uid }}
              className="flex items-center gap-3 bg-white rounded-2xl p-3 ring-1 ring-foreground/5"
            >
              <div className="size-10 rounded-full bg-sunset-200 grid place-items-center font-semibold overflow-hidden">
                {p.photo ? <img src={p.photo} className="w-full h-full object-cover" /> : p.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="flex-1 text-sm font-semibold">{p.name}</span>
              <span className="text-sunset-600">→</span>
            </Link>
          ))}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
