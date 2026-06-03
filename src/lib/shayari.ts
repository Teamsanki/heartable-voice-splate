/** Handwritten / artistic font styles a user can pick for shayari posts. */
export const SHAYARI_FONTS = [
  { id: "caveat", label: "Casual Hand", family: "'Caveat', cursive", weight: 600, css: "https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap" },
  { id: "dancing", label: "Flowing Script", family: "'Dancing Script', cursive", weight: 600, css: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap" },
  { id: "sacramento", label: "Elegant Cursive", family: "'Sacramento', cursive", weight: 400, css: "https://fonts.googleapis.com/css2?family=Sacramento&display=swap" },
  { id: "great-vibes", label: "Royal Vibes", family: "'Great Vibes', cursive", weight: 400, css: "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" },
  { id: "kalam", label: "Devanagari Hand", family: "'Kalam', cursive", weight: 700, css: "https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap" },
  { id: "amita", label: "Hindi Script", family: "'Amita', cursive", weight: 700, css: "https://fonts.googleapis.com/css2?family=Amita:wght@400;700&display=swap" },
  { id: "shadows", label: "Bold Marker", family: "'Shadows Into Light', cursive", weight: 400, css: "https://fonts.googleapis.com/css2?family=Shadows+Into+Light&display=swap" },
  { id: "instrument", label: "Editorial Serif", family: "'Instrument Serif', serif", weight: 400, css: "" },
] as const;

export type ShayariFontId = (typeof SHAYARI_FONTS)[number]["id"];

export function loadShayariFont(id: ShayariFontId) {
  if (typeof document === "undefined") return;
  const meta = SHAYARI_FONTS.find((f) => f.id === id);
  if (!meta?.css) return;
  const existing = document.querySelector(`link[data-font="${id}"]`);
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = meta.css;
  link.dataset.font = id;
  document.head.appendChild(link);
}

export function shayariFontFamily(id?: string | null) {
  return SHAYARI_FONTS.find((f) => f.id === id)?.family || SHAYARI_FONTS[0].family;
}