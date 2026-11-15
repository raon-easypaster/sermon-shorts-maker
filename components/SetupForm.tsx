"use client";

import { useEffect, useState } from "react";
import { loadSetting, saveSetting } from "@/lib/settings";
import type { TemplateId } from "@/lib/types";
import { TEMPLATES } from "@/lib/layout";
import { sanitizeApiKey, describeApiKey } from "@/lib/format";
import { getAiStatus, type AiStatusView } from "@/lib/client";

export interface SetupValues {
  apiKey: string;
  provider: string; // auto | claude | codex | gemini | gemini-api
  mode: "sermon" | "praise";
  url: string;
  targetSec: number;
  template: TemplateId;
  churchName: string;
  churchLogo: string; // data URL, "" if none
}

// Generous enough for a logo, small enough to keep in localStorage/JSON body.
const MAX_LOGO_BYTES = 1_500_000;

const AI_OPTIONS = [
  { id: "auto", label: "자동" },
  { id: "claude", label: "Claude 구독" },
  { id: "codex", label: "ChatGPT 구독" },
  { id: "gemini", label: "Gemini 구독" },
  { id: "gemini-api", label: "Gemini API 키" },
];
const AI_NAME = { claude: "Claude", codex: "ChatGPT(Codex)", gemini: "Gemini" } as const;
const IS_WIN = typeof navigator !== "undefined" && /Win/i.test(navigator.platform || navigator.userAgent);
const INSTALL = {
  claude: IS_WIN ? "irm https://claude.ai/install.ps1 | iex" : "curl -fsSL https://claude.ai/install.sh | bash",
  codex: "npm install -g @openai/codex",
  gemini: "Antigravity 앱 설치: https://antigravity.google (설치하면 agy 명령이 함께 생김)",
} as const;
const LOGIN = { claude: "claude", codex: "codex login", gemini: "agy" } as const;

const TARGETS = [
  { sec: 30, label: "30초" },
  { sec: 60, label: "1분" },
  { sec: 120, label: "2분" },
];

export default function SetupForm({
  onSubmit,
  busy,
}: {
  onSubmit: (v: SetupValues) => void;
  busy: boolean;
}) {
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState(false);
  const [url, setUrl] = useState("");
  const [targetSec, setTargetSec] = useState(60);
  const [template, setTemplate] = useState<TemplateId>("dark");
  const [churchName, setChurchName] = useState("");
  const [churchLogo, setChurchLogo] = useState("");
  const [logoError, setLogoError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState("auto");
  const [mode, setMode] = useState<"sermon" | "praise">("sermon");
  const [ai, setAi] = useState<AiStatusView | null>(null);
  const [checking, setChecking] = useState(false);
  const recheck = async () => {
    setChecking(true);
    setAi(await getAiStatus(true));
    setChecking(false);
  };
  useEffect(() => {
    void getAiStatus().then(setAi);
    void loadSetting("ai_provider").then((p) => p && setProvider(p));
    void loadSetting("shorts_mode").then((m) => (m === "praise" || m === "sermon") && setMode(m));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const k = await loadSetting("gemini_api_key");
      if (cancelled) return;
      if (k) {
        setApiKey(k);
        setSavedKey(true);
      }
      const c = await loadSetting("church_name");
      if (!cancelled && c) setChurchName(c);
      const l = await loadSetting("church_logo");
      if (!cancelled && l) setChurchLogo(l);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogoFile(file: File | null) {
    setLogoError("");
    if (!file) {
      setChurchLogo("");
      void saveSetting("church_logo", "");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setLogoError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("로고 파일이 너무 커요 (1.5MB 이하로 올려주세요).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setChurchLogo(dataUrl);
      void saveSetting("church_logo", dataUrl);
    };
    reader.onerror = () => setLogoError("로고 파일을 읽지 못했습니다.");
    reader.readAsDataURL(file);
  }

  function submit() {
    if (!url.trim()) return;
    const cleanKey = sanitizeApiKey(apiKey);
    void saveSetting("gemini_api_key", cleanKey);
    void saveSetting("ai_provider", provider);
    void saveSetting("shorts_mode", mode);
    void saveSetting("church_name", churchName.trim());
    onSubmit({
      apiKey: cleanKey,
      provider,
      mode,
      url: url.trim(),
      targetSec,
      template,
      churchName: churchName.trim(),
      churchLogo,
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
          {mode === "praise" ? "예배 영상의 찬양을" : "설교 전체 영상을"}
          <br />
          <span className="text-accent">쇼츠 영상</span>으로
        </h1>
        <p className="mt-4 text-muted">
          {mode === "praise" ? (
            <>예배(찬양) 유튜브 링크를 넣으면 AI가 부른 곡들을 찾아<br className="hidden sm:block" /> 곡마다 후렴 쇼츠를 만들어 드립니다.</>
          ) : (
            <>설교(예배) 유튜브 링크를 넣으면 AI가 하이라이트를 찾아<br className="hidden sm:block" /> 쇼츠를 만들어 드립니다 (자막 on/off 가능).</>
          )}
        </p>
        <div className="mx-auto mt-6 inline-grid grid-cols-2 gap-1 rounded-2xl border border-line bg-panel p-1">
          {([["sermon", "🎤 설교 쇼츠"], ["praise", "🎵 찬양 쇼츠"]] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMode(k)}
              className={`rounded-xl px-5 py-2 font-bold transition ${mode === k ? "bg-accent text-black" : "text-muted hover:text-white"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-6 shadow-xl sm:p-8">
        {/* AI */}
        <Field n={1} label="AI 선택">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AI_OPTIONS.map((o) => {
              const st = o.id === "auto" || o.id === "gemini-api" ? null : ai?.[o.id as "claude" | "codex" | "gemini"];
              const note =
                o.id === "auto"
                  ? ai?.best ? `지금: ${AI_NAME[ai.best]}` : ai ? "로그인된 구독 없음 → API 키" : ""
                  : o.id === "gemini-api"
                    ? "무료·유료 키"
                    : !ai ? "" : st?.loggedIn ? "✓ 로그인됨" : st?.installed ? "로그인 필요" : "설치 필요";
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setProvider(o.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    provider === o.id ? "border-accent bg-accent/15" : "border-line bg-panel2 hover:border-accent/50"
                  }`}
                >
                  <div className="font-bold">{o.label}</div>
                  <div className={`text-xs ${st && !st.loggedIn ? "text-amber-400" : "text-muted"}`}>{note}</div>
                </button>
              );
            })}
          </div>
          {(() => {
            const id = provider as "claude" | "codex" | "gemini";
            const st = ai?.[id];
            if (!["claude", "codex", "gemini"].includes(provider) || !ai || st?.loggedIn) return null;
            return (
              <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <p className="font-bold">{AI_NAME[id]}을(를) 쓰려면 이 컴퓨터에서 한 번 로그인해 주세요.</p>
                <p className="mt-1 text-muted">{IS_WIN ? "PowerShell(시작 → PowerShell)" : "터미널(응용 프로그램 → 유틸리티 → 터미널)"}을 열고 아래를 입력한 뒤, 안내에 따라 유료 구독 계정으로 로그인합니다.</p>
                {!st?.installed && <code className="mt-2 block rounded bg-black/40 px-2 py-1 font-mono">{INSTALL[id]}</code>}
                <code className="mt-2 block rounded bg-black/40 px-2 py-1 font-mono">{LOGIN[id]}</code>
                {id === "gemini" && <p className="mt-1 text-xs text-muted">Gemini 구독은 구글의 Antigravity CLI(agy)로 씁니다(예전 Gemini CLI 개인 로그인은 구글이 끝냈습니다). agy 를 실행해 Google AI Pro·Ultra 구독 계정으로 로그인하세요.</p>}
                <button type="button" onClick={recheck} className="mt-2 text-accent underline">{checking ? "확인 중..." : "로그인했어요 — 다시 확인"}</button>
              </div>
            );
          })()}
          <p className="mt-2 text-xs text-muted">
            구독 AI는 이 컴퓨터에 로그인된 Claude·ChatGPT·Gemini 유료 구독 사용량으로 돌아가며 API 요금이 따로 들지 않습니다. 자막 글만 AI로 보내고 영상은 보내지 않습니다.
          </p>
        </Field>

        {/* API key */}
        <Field n={2} label={provider === "gemini-api" ? "Gemini API 키" : "Gemini API 키 (선택)"} hint={savedKey && apiKey ? "✓ 저장됨" : undefined}>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setSavedKey(false);
              }}
              placeholder="AIza... 또는 AQ..."
              className="input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
            >
              {showKey ? "숨기기" : "보기"}
            </button>
          </div>
          {apiKey && (
            <p className="mt-2 text-xs text-muted">
              입력된 키: <span className="font-mono">{describeApiKey(apiKey)}</span>{" "}
              — 복사가 제대로 됐는지 확인용이며 실제 키 값은 여기에 표시되지 않습니다.
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            {provider !== "gemini-api" && "구독 AI를 쓰면 없어도 됩니다. 유튜브 자막이 없는 영상을 받아 적을 때만 쓰입니다. "}
            이 브라우저에만 저장됩니다. 키가 없으면{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              여기서 무료 발급
            </a>
            받으세요.
          </p>
        </Field>

        {/* URL */}
        <Field n={3} label={mode === "praise" ? "예배·찬양 유튜브 링크" : "설교 유튜브 링크"}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="input"
          />
          <p className="mt-2 text-xs text-muted">
            {mode === "praise"
              ? "예배 전체 영상도 괜찮아요. 찬양 부분을 자동으로 찾습니다. 유튜브 자동 자막에 가사가 잡혀야 찾을 수 있어요(못 찾으면 다음 화면에서 시간을 직접 넣으면 됩니다)."
              : "찬양·광고가 포함된 예배 전체 영상도 괜찮아요. 설교 부분을 자동으로 찾습니다."}
          </p>
        </Field>

        {/* target length */}
        <Field n={4} label="쇼츠 길이">
          <div className="grid grid-cols-3 gap-2">
            {TARGETS.map((t) => (
              <button
                key={t.sec}
                onClick={() => setTargetSec(t.sec)}
                className={`rounded-xl border py-3 font-bold transition ${
                  targetSec === t.sec
                    ? "border-accent bg-accent text-black"
                    : "border-line bg-panel2 text-muted hover:border-accent/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        {/* template */}
        <Field n={5} label="템플릿 (스타일)">
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
              <TemplateSwatch
                key={id}
                id={id}
                active={template === id}
                onClick={() => setTemplate(id)}
              />
            ))}
          </div>
        </Field>

        {/* church name + logo watermark */}
        <Field n={6} label="교회명 · 로고 (선택)">
          <input
            value={churchName}
            onChange={(e) => setChurchName(e.target.value)}
            placeholder="예) 사랑교회"
            className="input"
          />
          <p className="mt-2 text-xs text-muted">
            입력하면 영상 상단에 작은 워터마크로 함께 들어갑니다.
          </p>
          <div className="mt-3 flex items-center gap-3">
            {churchLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={churchLogo}
                alt="교회 로고 미리보기"
                className="h-10 w-10 rounded object-contain bg-panel2"
              />
            )}
            <label className="cursor-pointer rounded-lg border border-line bg-panel2 px-3 py-2 text-xs font-bold text-muted hover:border-accent/50">
              로고 이미지 선택
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {churchLogo && (
              <button
                type="button"
                onClick={() => handleLogoFile(null)}
                className="text-xs font-bold text-muted underline hover:text-white"
              >
                제거
              </button>
            )}
          </div>
          {logoError && <p className="mt-2 text-xs text-red-400">{logoError}</p>}
        </Field>

        <button
          onClick={submit}
          disabled={busy || !url.trim()}
          className="mt-2 w-full rounded-xl bg-accent py-4 text-lg font-extrabold text-black transition hover:bg-accent2 disabled:opacity-40"
        >
          {busy ? "분석 중..." : "✦ 하이라이트 찾아 쇼츠 만들기"}
        </button>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
          본인이 권리를 가진 설교 영상(예: 소속 교회가 업로드한 영상)에만 사용하세요.
        </p>
      </div>
    </div>
  );
}

function Field({
  n,
  label,
  hint,
  children,
}: {
  n: number;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
          {n}
        </span>
        <span className="font-bold">{label}</span>
        {hint && <span className="text-xs font-medium text-emerald-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function TemplateSwatch({
  id,
  active,
  onClick,
}: {
  id: TemplateId;
  active: boolean;
  onClick: () => void;
}) {
  const t = TEMPLATES[id];
  return (
    <button
      onClick={onClick}
      className={`overflow-hidden rounded-xl border-2 transition ${
        active ? "border-accent" : "border-line hover:border-accent/40"
      }`}
    >
      <div className="aspect-[9/16] w-full p-3 text-center" style={{ background: t.bg }}>
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="text-[11px] font-extrabold leading-tight" style={{ color: t.titleLine1 }}>
              내 열심보다
            </div>
            <div className="text-[13px] font-extrabold leading-tight" style={{ color: t.titleLine2 }}>
              하나님의 이끄심
            </div>
          </div>
          <div className="mx-auto h-8 w-full rounded bg-black/20" />
          <div className="text-[9px] font-medium" style={{ color: t.subtitle }}>
            하나님이 나를 이끄십니다
          </div>
        </div>
      </div>
      <div className="bg-panel2 py-1.5 text-xs font-bold">{t.label}</div>
    </button>
  );
}
