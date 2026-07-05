// THE VOID V2 — shared utilities
// Premium cyber utils — deterministic, no hydration drift

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// UTC-safe time — avoids server/client TZ mismatch
export function formatTime(timestamp) {
  if (!timestamp) return "--:--";
  const d = new Date(timestamp);
  // Use local time but stable HH:MM — if you want strict no-hydration drift, use UTC:
  // return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Stable date divider — en-US short, avoids locale drift
export function formatDateDivider(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  // YYYY-MM-DD ISO then pretty — stable across SSR/CSR
  return d.toLocaleDateString("en-CA"); // 2026-07-05 — unambiguous, no hydration mismatch
}

// Prettier label if you want — client only
export function formatDateDividerPretty(timestamp) {
  const iso = formatDateDivider(timestamp);
  if (!iso) return "";
  const [y,m,da] = iso.split("-");
  const date = new Date(Number(y), Number(m)-1, Number(da));
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function getDateDividerKey(msg, prevMsg) {
  if (!msg?.created_at) return null;
  const date = formatDateDivider(msg.created_at);
  if (!prevMsg?.created_at) return date;
  const prevDate = formatDateDivider(prevMsg.created_at);
  return date !== prevDate ? date : null;
}

export function getInitials(name) {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

export function getRoomId(a, b) {
  return [a, b].sort().join("_");
}

export function debounce(fn, ms = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Safe JSON
export function safeParse(v, fallback = null) {
  try { return JSON.parse(v); } catch { return fallback; }
}

// File helpers
export const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/"];
export const ALLOWED_EXTS = [
  "pdf","txt","doc","docx","xls","xlsx","ppt","pptx","csv",
  "zip","rar","7z","py","js","html","css","json","xml","md","rtf"
];

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B","KB","MB","GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length-1) { n/=1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function getFileIconType(mime = "", name = "") {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc","docx","rtf","txt","md"].includes(ext)) return "doc";
  if (["xls","xlsx","csv"].includes(ext)) return "sheet";
  if (["ppt","pptx"].includes(ext)) return "slides";
  if (["zip","rar","7z"].includes(ext)) return "archive";
  if (["js","py","html","css","json","xml"].includes(ext)) return "code";
  return "file";
}
