import { NextRequest, NextResponse } from "next/server";
import { aiStatus } from "@/lib/ai-cli";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 이 컴퓨터에 설치·로그인된 AI 구독(Claude·ChatGPT·Gemini) 상태
export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get("force") === "1";
  return NextResponse.json(await aiStatus(force));
}
