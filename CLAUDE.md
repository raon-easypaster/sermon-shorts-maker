# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Korean-language web app: paste a sermon YouTube link → AI picks 5–6 highlight segments → renders them as 1080×1920 shorts with burned-in subtitles. UI text is Korean; keep it that way.

Two modes: **설교 쇼츠** (sermon highlights, 2-pass structure → highlights) and **찬양 쇼츠** (`praisePrompt` in `lib/gemini.ts`: find songs from `[노래]`/`[음악]` markers + lyric captions, one chorus clip per song, song title on title line 2; lyric subtitles default off because auto-captions of singing are unreliable).

AI runs either through a **Gemini API key** or a **local subscription CLI** (`lib/ai-cli.ts`: `claude`, `codex`, `gemini` — logged in on this computer, no API cost). CLIs run in a fresh private temp dir with tools off; `cleanCaption` strips `&gt;&gt;` and `[음악]` from display/render text but the AI still sees raw captions. API routes accept only requests from this computer's own page (`lib/guard.ts`) and the server binds 127.0.0.1.

## Commands

```bash
npm run dev      # dev server on port 3939
npm run build    # production build
npx tsc --noEmit # typecheck — the only static check that exists
```

```bash
npm test         # 하네스 (vitest, tests/) — 기존 기능이 바뀌지 않았는지
npm run verify   # tsc + 하네스 + next build — 배포·설치 파일 전 필수 (npm run dist 가 먼저 돈다)
npm run smoke    # 켜진 서버로 실제 한 편 렌더 (1080×1920, 길이, 빈 화면, >>/[음악] 자막 확인)
```

**하네스 규칙 (사용자 요청: 업그레이드해도 이전 기능이 바뀌지 않게)**
- 기능을 바꾸기 전과 후에 `npm test` 를 돌린다. 실패하면 고친 쪽이 틀린 것으로 보고, 일부러 바꾼 동작일 때만 시험을 고친다(스냅숏은 `npx vitest -u` 로 — 무엇이 왜 바뀌었는지 확인한 뒤에만).
- 버그를 고치면 그 버그를 잡는 시험을 `tests/` 에 하나 더한다.
- 배포(태그·설치 파일) 전에는 `npm run verify` 와 `npm run smoke` 를 모두 통과시킨다. GitHub Actions 도 올릴 때마다 시험을 돌린다.
- 시험에 쓰는 자막·설교 글은 지어낸 예시만 쓴다 (실제 성도·설교 내용을 저장소에 넣지 않음).

There is no linter. (`npm run lint` is a dead script: Next 16 removed `next lint`, so it fails parsing "lint" as a directory.)

## Architecture

### A Node server is mandatory

Downloading and editing video can't happen in a browser. `yt-dlp` and `ffmpeg` binaries are spawned from API routes. This rules out serverless (Vercel): deployment needs a long-running Node server with a disk. Cloud IPs are also frequently blocked by YouTube.

### The pipeline, and why it's built this way

`app/page.tsx` drives four steps (setup → analyzing → select → result) against job-polling API routes. The real work:

**Analyze** (`lib/pipeline.ts` `runAnalyze`) — the load-bearing design decision is that **the AI never sees the video**. It reads YouTube's auto-caption text only. This is faster, cheaper, and gives frame-accurate timestamps. Uploading video would only get you "around 7 minutes-ish" and you could never sync subtitles to it.

1. `lib/ytdlp.ts` fetches metadata + Korean auto-caption VTT.
2. `lib/captions.ts` parses it. **YouTube auto-captions carry per-word timestamps** (`<00:00:03.679><c>단어</c>`) — this is the highest-precision signal in the system. The format is "rolling" (each cue repeats the previous line), so the parser flattens to a deduped word stream, then regroups into cues.
3. `lib/gemini.ts` runs **two passes**: first extract the sermon's structure (central message, 대지/sections), then pick highlights *given that structure*. One pass alone grabs a punchy sentence with no surrounding context and the clip makes no sense.
4. `lib/boundaries.ts` + `lib/silence.ts` correct the edges (see below).
5. Cues are cached to disk so re-renders and custom ranges don't re-fetch.

**Render** (`lib/render.ts`) — cut → fit into the video band → composite onto the canvas → burn one ASS file containing *both* title and subtitles in a single `subtitles` filter pass.

### Not cutting mid-sentence

This is a primary product requirement, defended in three layers because none alone is sufficient:

1. **Gemini returns cue *indices*, not seconds** (`lib/gemini.ts`). Free-form seconds land in the middle of a cue, which is a mid-word cut by construction. Indices guarantee cue-edge boundaries.
2. **Silence snap** (`lib/boundaries.ts`). Korean auto-captions have **no punctuation**, so you cannot find sentence ends by looking for periods. Speakers breathe between sentences, so `ffmpeg silencedetect` output is the physical evidence of a sentence boundary. Each edge pulls to the nearest silence within ±2s.
3. **Manual nudge** in the UI — moves edges cue-by-cue as a last resort.

Length is clamped to 30–120s, adjusted only along cue edges.

### Layout constants are measured, not invented

`lib/layout.ts` is the single source of truth for geometry and is **derived from pixel measurements of two sample videos the user supplied** (one dark, one light). Those samples are not in the repo — the measurements below are the surviving record of them. Canvas splits exactly 25/50/25:

| band | y | height |
|---|---|---|
| title | 0–479 | 480 |
| video | 480–1439 | 960 (1080×960 = 9:8) |
| subtitle | 1440–1919 | 480 |

Both samples matched these boundaries to the pixel — the grid is intentional, not incidental. **Don't eyeball changes here.** Templates (`dark`/`light`) differ only in color; layout is shared. Title line 2 is always the accent color, so prompts must split titles with the emphasis on line 2.

`VideoFit` (`crop` | `contain`) is per-highlight: `crop` center-crops to fill (good for a centered preacher), `contain` letterboxes with the template bg (good when slides/PPT are on screen and would be cut).

The workflow was modelled on screenshots of an existing app, which are deliberately **not** in this repo. The UI here is an original design, not a copy — keep it that way.

## Gotchas that will silently break things

- **`--ffmpeg-location` is required** for `yt-dlp` (`lib/ytdlp.ts`). System ffmpeg isn't installed; yt-dlp needs it to merge separate video+audio streams. Without it the download "succeeds" but leaves `.f398.mp4`/`.f140.m4a` fragments and no final mp4.
- **The job store must live on `globalThis`** (`lib/jobs.ts`). Next bundles each route separately, so a module-level `Map` gives `/api/render` and `/api/jobs` *different instances* — jobs get created then 404 on poll.
- **Font family names differ per weight**: `Pretendard-Bold.ttf` → family `Pretendard`; `Pretendard-ExtraBold.ttf` → family `Pretendard ExtraBold`. ASS matches on family name; get it wrong and Korean silently falls back to tofu. Fonts are bundled twice on purpose: `assets/fonts/` (server, for ffmpeg `fontsdir`) and `public/fonts/` (browser UI). Never rely on system fonts — Linux deploy would break.
- **ASS `WrapStyle` must be `0`** (`lib/ass.ts`). `2` disables auto-wrap and long subtitles run off both screen edges.
- **Gemini models are tried in a candidate chain** (`lib/gemini.ts`), because a given key may be denied both new and old models ("no longer available to new users"). Transient 503/429 retries with backoff before falling through. Override with `GEMINI_MODEL`.

## Caching (`.data/`, gitignored)

Source video is downloaded **once per `videoId`** and reused across all 5–6 clips — never re-download per clip. Silence detection and cues are cached alongside. `bin/` holds the auto-downloaded yt-dlp binary.

## API key handling

The key comes from the browser (`localStorage`), is sent per-request, and used only in memory. **Never write it to disk.** `.env.local`'s `GEMINI_API_KEY` is a local-dev fallback only.

## Verifying changes

Run the harness first (`npm test`), then observe real behavior (`npm run smoke`).

- **Render changes**: render a clip, extract a frame (`ffmpeg -ss N -i out.mp4 -vframes 1 f.png`), and *look at it*. To check geometry precisely, decode to raw RGB and scan rows for band boundaries rather than trusting your eyes — that's how `lib/layout.ts` was derived, and how a regression in it should be caught.
- **Pipeline plumbing** can be exercised without a valid Gemini key: `POST /api/analyze` with a dummy key reaches ~55% (metadata + captions succeed) and fails only at the Gemini call. Getting that far proves everything except the AI itself.
- **Full render without AI**: `POST /api/custom-range` (uses cached cues, tolerates a missing key) to build a highlight, then `POST /api/render` and poll `/api/jobs/<id>`.
- Korean text must be checked visually for tofu (□□□); a successful exit code proves nothing about glyph rendering.

## Legal framing

YouTube downloading is a gray area. The app is built on the premise of the user's own church's sermons and states this in the UI. Keep that notice.
