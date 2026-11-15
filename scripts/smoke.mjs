#!/usr/bin/env node
// 실제로 한 편 만들어 보기 (켜져 있는 서버로). 업그레이드 뒤 '정말 영상이 나오는지' 확인용.
//   node scripts/smoke.mjs                 → 127.0.0.1:3939, 캐시에 있는 영상 하나로 (AI 없이 제목은 기본값)
//   node scripts/smoke.mjs --ai claude     → 구간 제목을 구독 AI로 (claude | codex | gemini)
//   node scripts/smoke.mjs --url <유튜브 주소> --port 3949
// 확인: 구간 만들기 → 렌더 → 1080×1920 mp4, 길이가 구간과 맞는지, 첫 화면이 비어 있지 않은지.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const port = arg("--port", "3939");
const base = `http://127.0.0.1:${port}`;
const H = { "Content-Type": "application/json", Origin: base };
const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const ok = (m) => console.log(`✓ ${m}`);

const cacheDir = path.join(process.env.SHORTS_DATA_DIR || path.join(process.cwd(), ".data"), "cache");
let videoId = arg("--video", "");
if (!videoId) {
  const c = fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir).filter((f) => f.endsWith(".cues.json")) : [];
  if (!c.length) fail("캐시된 영상이 없습니다. 화면에서 한 번 분석하거나 --video <영상번호> 를 주세요.");
  videoId = c.sort((a, b) => fs.existsSync(path.join(cacheDir, b.replace(".cues.json", ".mp4"))) - fs.existsSync(path.join(cacheDir, a.replace(".cues.json", ".mp4"))))[0].replace(".cues.json", "");
}
const url = arg("--url", `https://www.youtube.com/watch?v=${videoId}`);
const cues = JSON.parse(fs.readFileSync(path.join(cacheDir, `${videoId}.cues.json`), "utf8"));
const mid = cues[Math.floor(cues.length / 2)].start;
const startSec = Math.floor(mid), endSec = startSec + 35;

const post = async (p, body) => { const r = await fetch(base + p, { method: "POST", headers: H, body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) fail(`${p}: ${j.error}`); return j; };
const poll = async (id) => { for (;;) { const j = await (await fetch(`${base}/api/jobs/${id}`)).json(); if (j.status === "done") return j.result; if (j.status === "error") fail(j.error); await new Promise((r) => setTimeout(r, 2000)); } };

try { await fetch(base); } catch { fail(`${base} 에 서버가 없습니다. 먼저 npm run start (또는 dev) 로 켜 주세요.`); }
const { highlight } = await post("/api/custom-range", { videoId, startSec, endSec, provider: arg("--ai", "none") === "none" ? undefined : arg("--ai") });
if (!highlight?.cues?.length) fail("구간 자막이 비었습니다");
if (highlight.cues.some((c) => /&gt;|\[음악\]|\[노래\]/.test(c.text))) fail("자막에 >> 나 [음악] 표시가 남아 있습니다");
ok(`구간 ${startSec}~${endSec}초, 제목 "${highlight.titleLine1} / ${highlight.titleLine2}"`);

const { jobId } = await post("/api/render", { url, videoId, highlight, template: "dark", subtitles: { enabled: true, size: "large", position: "band" }, churchName: "" });
const res = await poll(jobId);
const file = path.join(path.dirname(cacheDir), "out", res.name);
if (!fs.existsSync(file)) fail(`결과 파일이 없습니다: ${file}`);
const ff = require("ffmpeg-static");
const info = spawnSync(ff, ["-i", file], { encoding: "utf8" }).stderr;
if (!/1080x1920/.test(info)) fail("영상 크기가 1080×1920 이 아닙니다");
const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(info);
const sec = d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : 0;
if (Math.abs(sec - (highlight.endSec - highlight.startSec)) > 2) fail(`길이가 맞지 않습니다 (${sec}초)`);
const frame = spawnSync(ff, ["-ss", "3", "-i", file, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-s", "108x192", "-"], { maxBuffer: 1e7 }).stdout;
const lit = [...frame].filter((v) => v > 40).length / frame.length;
if (lit < 0.05) fail("첫 화면이 거의 까맣습니다");
ok(`렌더 완료: ${res.name} (${sec.toFixed(1)}초, 1080×1920)`);
console.log(`\n눈으로도 확인하세요: 한글이 □로 나오지 않는지 → ${file}`);
