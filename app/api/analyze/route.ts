import { NextRequest, NextResponse } from "next/server";
import { createJob, runJob } from "@/lib/jobs";
import { runAnalyze } from "@/lib/pipeline";
import { sanitizeApiKey } from "@/lib/format";
import type { Provider } from "@/lib/ai-cli";

export const runtime = "nodejs";
export const maxDuration = 600;

const PROVIDERS: Provider[] = ["auto", "gemini-api", "claude", "codex", "gemini"];

export async function POST(req: NextRequest) {
  const { url, apiKey, targetSec, provider } = await req.json();
  const key = (apiKey && sanitizeApiKey(apiKey)) || process.env.GEMINI_API_KEY || "";
  const p: Provider = PROVIDERS.includes(provider) ? provider : "auto";

  if (!url) return NextResponse.json({ error: "링크를 입력하세요." }, { status: 400 });
  if (p === "gemini-api" && !key) return NextResponse.json({ error: "Gemini API 키가 필요합니다." }, { status: 400 });

  const job = createJob("analyze");
  runJob(job, (progress) => runAnalyze(url, { provider: p, apiKey: key || undefined }, Number(targetSec) || 60, progress));

  return NextResponse.json({ jobId: job.id });
}
