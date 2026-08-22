// .trim() alone doesn't strip zero-width characters (U+200B/200C/200D,
// U+FEFF BOM) that some apps silently leave behind on copy — a pasted API
// key that looks correct on screen then gets rejected as invalid by Google.
export function sanitizeApiKey(raw: string): string {
  return raw.replace(/[​-‍﻿]/g, "").trim();
}

// Masked, display-only diagnostics so the user can eyeball "did I actually
// copy this right?" without the key ever appearing in full anywhere (UI,
// logs, or this app's own storage debug views).
//
// Deliberately not a pass/fail validator: Google is mid-migration from
// "AIza..." standard keys to newer "auth" keys with a different prefix, so
// hard-coding one shape as "correct" would flag legitimate new keys as
// broken. This only reports facts (length, first/last chars) for the user
// to compare against what they actually copied.
export function describeApiKey(raw: string): string {
  const key = sanitizeApiKey(raw);
  if (!key) return "";
  if (key.length <= 8) return `${key.length}자 — 너무 짧아요. 키 전체가 복사됐는지 확인하세요.`;
  return `${key.length}자, ${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export function durLabel(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}분 ${r}초` : `${m}분`;
}

// "1:30" or "90" -> seconds
export function parseTime(input: string): number | null {
  const t = input.trim();
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(\d+):(\d{1,2})$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return null;
}
