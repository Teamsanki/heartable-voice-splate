import { useEffect, useState } from "react";
import { BarChart3, Calendar, Eye, Heart, MessageSquare, Share2 } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db, VOICE_ROOT } from "@/lib/firebase";

export function PostAnalytics({ postId }: { postId: string }) {
  const [range, setRange] = useState<"7d" | "30d" | "all">("7d");
  const [stats, setStats] = useState({ views: 0, likes: 0, comments: 0, shares: 0 });

  useEffect(() => {
    // In a real app, we'd query by date range. 
    // Here we'll simulate fetching for the specific post.
    return onValue(ref(db, `feed/${postId}`), (snap) => {
      const v = snap.val() || {};
      setStats({
        views: v.viewCount || 0,
        likes: v.likeCount || 0,
        comments: v.commentCount || 0,
        shares: v.shareCount || 0,
      });
    });
  }, [postId, range]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif italic text-xl flex items-center gap-2">
          <BarChart3 className="size-5 text-sunset-600" /> Post Analytics
        </h3>
        <select 
          value={range} 
          onChange={(e) => setRange(e.target.value as any)}
          className="text-xs bg-sunset-100 rounded-lg px-2 py-1 outline-none ring-1 ring-sunset-900/10"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Eye />} label="Views" value={stats.views} />
        <StatCard icon={<Heart />} label="Likes" value={stats.likes} />
        <StatCard icon={<MessageSquare />} label="Comments" value={stats.comments} />
        <StatCard icon={<Share2 />} label="Shares" value={stats.shares} />
      </div>

      <div className="p-3 bg-sunset-50 rounded-xl border border-sunset-200">
        <p className="text-[10px] uppercase tracking-wider opacity-50 flex items-center gap-1 mb-2">
          <Calendar className="size-3" /> Growth trend
        </p>
        <div className="h-20 flex items-end gap-1.5 px-1">
          {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
            <div key={i} className="flex-1 bg-sunset-200 rounded-t-sm relative group">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-sunset-600 rounded-t-sm transition-all duration-500" 
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <div className="p-3 bg-card rounded-2xl ring-1 ring-foreground/5 space-y-1">
      <div className="size-7 rounded-full bg-sunset-100 text-sunset-900 flex items-center justify-center">
        {cloneElement(icon, { className: "size-4" })}
      </div>
      <p className="text-xl font-semibold tabular-nums leading-none pt-1">{value}</p>
      <p className="text-[10px] opacity-50 uppercase tracking-widest">{label}</p>
    </div>
  );
}

import { cloneElement } from "react";
