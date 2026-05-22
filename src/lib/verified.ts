export type VerifiedTier = null | "bronze" | "silver" | "gold" | "diamond";

/** Compute tier from followers + likes. */
export function getTier(followers: number, likes: number): VerifiedTier {
  if (followers >= 1_000_000) return "diamond";
  if (followers >= 100_000 && likes >= 50_000) return "gold";
  if (followers >= 10_000 && likes >= 5_000) return "silver";
  if (followers >= 1_000 && likes >= 500) return "bronze";
  return null;
}

export const TIER_COLOR: Record<NonNullable<VerifiedTier>, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  diamond: "#7dd3fc",
};

export const TIER_LABEL: Record<NonNullable<VerifiedTier>, string> = {
  bronze: "Bronze · 1K+ followers",
  silver: "Silver · 10K+ followers",
  gold: "Gold · 100K+ followers",
  diamond: "Diamond · 1M+ followers",
};