// 이 컴퓨터에 로그인된 AI 구독(Claude · ChatGPT · Gemini)으로 글을 만든다.
// API 키나 추가 요금 없이, 각 회사의 공식 명령줄 도구(claude / codex / gemini)를 실행해 구독 사용량을 쓴다.
// 다른 폴더의 설정·파일을 읽지 않도록 빈 작업 폴더에서, 도구 없이 글만 쓰게 실행한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

export type CliProvider = "claude" | "codex" | "gemini";
export type Provider = "auto" | "gemini-api" | CliProvider;

export const PROVIDER_LABEL: Record<CliProvider | "gemini-api", string> = {
  claude: "Claude 구독",
  codex: "ChatGPT 구독",
  gemini: "Gemini 구독",
  "gemini-api": "Gemini API 키",
};

const WIN = process.platform === "win32";
const HOME = os.homedir();
const TIMEOUT = 10 * 60 * 1000;

// 데스크톱 앱·허브에서 켜면 PATH 가 짧을 수 있어 흔한 설치 위치를 더한다.
const EXTRA = WIN
  ? [path.join(HOME, ".local", "bin"), path.join(process.env.APPDATA || path.join(HOME, "AppData", "Roaming"), "npm")]
  : [path.join(HOME, ".local/bin"), path.join(HOME, ".local/node/bin"), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
const CLI_PATH = [...EXTRA, ...(process.env.PATH || "").split(path.delimiter)].filter(Boolean).join(path.delimiter);

export class AiError extends Error {
  constructor(message: string, public kind: "missing" | "login" | "limit" | "timeout" | "fail" = "fail") {
    super(message);
  }
}

function findWin(cmd: string): string | null {
  for (const dir of CLI_PATH.split(";")) {
    for (const ext of [".exe", ".cmd", ".bat"]) {
      const f = path.join(dir, cmd + ext);
      if (fs.existsSync(f)) return f;
    }
  }
  return null;
}
const q = (a: string) => (a === "" || /[\s"&|<>^()%!]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a);

function spawnCli(cmd: string, args: string[], cwd: string): ChildProcess {
  const opts = { cwd, env: { ...process.env, PATH: CLI_PATH } };
  if (!WIN) return spawn(cmd, args, opts);
  const file = findWin(cmd);
  if (!file) throw Object.assign(new Error(`${cmd} not found`), { code: "ENOENT" });
  if (file.endsWith(".exe")) return spawn(file, args, { ...opts, windowsHide: true });
  return spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `"${[file, ...args].map(q).join(" ")}"`], {
    ...opts,
    windowsHide: true,
    windowsVerbatimArguments: true,
  });
}

// 실행할 때마다 나만 쓰는 빈 폴더를 새로 만들고(0700), 끝나면 지운다.
// 다른 사용자가 미리 만들어 둔 폴더의 설정 파일을 AI 도구가 읽는 일이 없게.
function freshDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sermon-shorts-ai-"));
}

async function run(
  cmd: string,
  args: string[] | ((dir: string) => string[]),
  input: string | null,
  timeout: number,
  after?: (dir: string) => void,
): Promise<{ code: number | null; out: string; err: string }> {
  const dir = freshDir();
  try {
    const r = await runIn(dir, cmd, typeof args === "function" ? args(dir) : args, input, timeout);
    after?.(dir);
    return r;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runIn(dir: string, cmd: string, args: string[], input: string | null, timeout: number): Promise<{ code: number | null; out: string; err: string }> {
  return new Promise((resolve, reject) => {
    let child: ChildProcess;
    const missing = () => new AiError(`${cmd} 프로그램이 이 컴퓨터에 없습니다.`, "missing");
    try {
      child = spawnCli(cmd, args, dir);
    } catch (e) {
      reject((e as { code?: string }).code === "ENOENT" ? missing() : e);
      return;
    }
    let out = "";
    let err = "";
    const t = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new AiError(`AI 응답이 ${Math.round(timeout / 60000)}분 넘게 없어 멈췄습니다. 잠시 뒤 다시 시도해 주세요.`, "timeout"));
    }, timeout);
    child.stdout?.on("data", (c) => (out += c));
    child.stderr?.on("data", (c) => {
      err += c;
      if (err.length > 1e5) err = err.slice(-5e4);
    });
    child.on("error", (e) => {
      clearTimeout(t);
      reject((e as { code?: string }).code === "ENOENT" ? missing() : e);
    });
    child.on("close", (code) => {
      clearTimeout(t);
      resolve({ code, out, err });
    });
    child.stdin?.end(input ?? "");
  });
}

export interface CliState {
  installed: boolean;
  loggedIn: boolean;
}
export interface AiStatus {
  claude: CliState;
  codex: CliState;
  gemini: CliState;
  best: CliProvider | null;
}

let cache: { at: number; v: AiStatus | null } = { at: 0, v: null };

export async function aiStatus(force = false): Promise<AiStatus> {
  if (!force && cache.v && Date.now() - cache.at < 60_000) return cache.v;
  const off: CliState = { installed: false, loggedIn: false };
  const [claude, codex, gemini] = await Promise.all([
    run("claude", ["auth", "status"], null, 15_000).then(
      (r) => {
        try {
          const j = JSON.parse(r.out);
          return { installed: true, loggedIn: !!j.loggedIn };
        } catch {
          return { installed: true, loggedIn: false };
        }
      },
      () => off,
    ),
    run("codex", ["login", "status"], null, 15_000).then(
      (r) => ({ installed: true, loggedIn: /Logged in/i.test(r.out + r.err) }),
      () => off,
    ),
    run("gemini", ["--version"], null, 15_000).then(
      () => ({ installed: true, loggedIn: geminiLoggedIn() }),
      () => off,
    ),
  ]);
  const st = { claude, codex, gemini };
  const best = (["claude", "codex", "gemini"] as CliProvider[]).find((p) => st[p].loggedIn) || null;
  cache = { at: Date.now(), v: { ...st, best } };
  return cache.v!;
}

// Gemini CLI 는 구글 계정으로 로그인하면 ~/.gemini/oauth_creds.json 이 생긴다.
function geminiLoggedIn(): boolean {
  const dir = path.join(HOME, ".gemini");
  if (fs.existsSync(path.join(dir, "oauth_creds.json"))) return true;
  try {
    const s = JSON.parse(fs.readFileSync(path.join(dir, "settings.json"), "utf8"));
    const t = s?.security?.auth?.selectedType || s?.selectedAuthType;
    return !!t && t !== "oauth-personal";
  } catch {
    return false;
  }
}

const limitRe = /usage limit|rate limit|quota|limit reached|exceeded/i;

async function withClaude(prompt: string): Promise<string> {
  const r = await run(
    "claude",
    ["-p", "--output-format", "json", "--model", "sonnet", "--setting-sources", "", "--strict-mcp-config", "--disable-slash-commands", "--no-session-persistence", "--tools", ""],
    prompt,
    TIMEOUT,
  );
  let j: { is_error?: boolean; result?: string; error?: string } | null = null;
  try {
    j = JSON.parse(r.out);
  } catch {
    j = null;
  }
  if (!j) throw new AiError(`Claude 실행 실패: ${(r.err || r.out).trim().slice(-300) || `종료 코드 ${r.code}`}`);
  if (j.is_error) {
    const m = String(j.result || j.error || "");
    if (/log ?in|auth|credential/i.test(m)) throw new AiError("Claude에 로그인되어 있지 않습니다. 터미널에서 claude 를 실행해 로그인해 주세요.", "login");
    if (limitRe.test(m)) throw new AiError(`Claude 구독 사용 한도에 걸렸습니다: ${m.slice(0, 200)}`, "limit");
    throw new AiError(`Claude 오류: ${m.slice(0, 300)}`);
  }
  return String(j.result || "");
}

async function withCodex(prompt: string): Promise<string> {
  let text = "";
  const r = await run(
    "codex",
    (dir) => ["exec", "--skip-git-repo-check", "--ephemeral", "-s", "read-only", "-c", "tools.web_search=false", "-C", dir, "-o", path.join(dir, "answer.txt"), "-"],
    prompt,
    TIMEOUT,
    (dir) => {
      try {
        text = fs.readFileSync(path.join(dir, "answer.txt"), "utf8");
      } catch {
        /* 없음 */
      }
    },
  );
  if (r.code === 0 && text.trim()) return text;
  const last = (r.err.match(/"message":"([^"]+)"/) || [])[1] || r.err.trim().split("\n").pop() || `종료 코드 ${r.code}`;
  if (/not logged in|unauthorized|login/i.test(last)) throw new AiError("ChatGPT(Codex)에 로그인되어 있지 않습니다. 터미널에서 codex login 을 실행해 주세요.", "login");
  if (limitRe.test(last)) throw new AiError(`ChatGPT 구독 사용 한도에 걸렸습니다: ${last.slice(0, 200)}`, "limit");
  throw new AiError(`ChatGPT(Codex) 실행 실패: ${last.slice(0, 300)}`);
}

async function withGemini(prompt: string): Promise<string> {
  // 글은 표준입력으로, -p 는 비대화(headless) 실행 표시용. 도구는 쓰지 않는다(plan = 읽기 전용).
  // plan = 읽기 전용, 확장·MCP 서버는 끄고, 빈 폴더에서 실행 (읽을 파일이 없게)
  const r = await run("gemini", ["-p", " ", "-o", "json", "--approval-mode", "plan", "-e", "none", "--allowed-mcp-server-names", "__none__"], prompt, TIMEOUT);
  const start = r.out.indexOf("{");
  let j: { response?: string; error?: { message?: string } } | null = null;
  try {
    j = JSON.parse(r.out.slice(start));
  } catch {
    j = null;
  }
  if (j?.response) return j.response;
  const m = j?.error?.message || (r.err || r.out).trim().slice(-300) || `종료 코드 ${r.code}`;
  if (/auth method|log ?in|credential|oauth/i.test(m)) throw new AiError("Gemini에 로그인되어 있지 않습니다. 터미널에서 gemini 를 실행해 'Login with Google'로 로그인해 주세요.", "login");
  if (limitRe.test(m)) throw new AiError(`Gemini 구독 사용 한도에 걸렸습니다: ${m.slice(0, 200)}`, "limit");
  throw new AiError(`Gemini 실행 실패: ${m.slice(0, 300)}`);
}

export function cliGenerate(provider: CliProvider, prompt: string): Promise<string> {
  if (provider === "claude") return withClaude(prompt);
  if (provider === "codex") return withCodex(prompt);
  return withGemini(prompt);
}

/** 답 글에서 JSON 한 덩어리를 꺼낸다 (```json 울타리나 앞뒤 설명이 붙어도) */
export function extractJson<T>(text: string): T {
  const s = text.replace(/```(?:json)?/gi, "");
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b <= a) throw new AiError("AI 답에서 결과(JSON)를 찾지 못했습니다. 다시 시도해 주세요.");
  try {
    return JSON.parse(s.slice(a, b + 1)) as T;
  } catch {
    throw new AiError("AI 답의 결과(JSON) 모양이 올바르지 않습니다. 다시 시도해 주세요.");
  }
}

export interface AiChoice {
  provider: Provider;
  apiKey?: string;
}

/** 화면에서 고른 방식(자동 포함)을 실제로 쓸 방식으로 정한다 */
export async function resolveProvider(choice: AiChoice): Promise<"gemini-api" | CliProvider> {
  const p = choice.provider || "auto";
  if (p === "gemini-api") {
    if (!choice.apiKey) throw new AiError("Gemini API 키를 넣어 주세요. (또는 AI를 'Claude·ChatGPT·Gemini 구독'으로 바꿔 주세요)", "login");
    return p;
  }
  if (p !== "auto") return p;
  const st = await aiStatus();
  if (st.best) return st.best;
  if (choice.apiKey) return "gemini-api";
  throw new AiError(
    "쓸 수 있는 AI가 없습니다. 이 컴퓨터에서 Claude·ChatGPT(Codex)·Gemini 중 하나에 로그인하거나, Gemini API 키를 넣어 주세요.",
    "login",
  );
}
