// 구독 AI(Claude·ChatGPT·Gemini)와 요청 지키기
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { extractJson, resolveProvider } from "@/lib/ai-cli";
import { rejectForeign } from "@/lib/guard";

describe("구독 AI", () => {
  it("답에서 JSON 꺼내기 (울타리·앞뒤 설명이 붙어도)", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('결과입니다: {"a":{"b":[1,2]}} 끝')).toEqual({ a: { b: [1, 2] } });
    expect(() => extractJson("JSON 없음")).toThrow(/찾지 못했습니다/);
  });
  it("직접 고른 AI는 그대로, API 키 방식은 키가 있어야", async () => {
    expect(await resolveProvider({ provider: "claude" })).toBe("claude");
    expect(await resolveProvider({ provider: "gemini" })).toBe("gemini");
    expect(await resolveProvider({ provider: "gemini-api", apiKey: "k" })).toBe("gemini-api");
    await expect(resolveProvider({ provider: "gemini-api" })).rejects.toThrow(/API 키/);
  });
});

const req = (headers: Record<string, string>) => new NextRequest("http://127.0.0.1:3939/api/analyze", { method: "POST", headers });
describe("이 컴퓨터의 화면에서 온 요청만", () => {
  it("내 화면은 통과", () => {
    expect(rejectForeign(req({ host: "127.0.0.1:3939", origin: "http://127.0.0.1:3939", "content-type": "application/json" }))).toBeNull();
    expect(rejectForeign(req({ host: "localhost:3939", origin: "http://localhost:3939", "content-type": "application/json; charset=utf-8" }))).toBeNull();
  });
  it("다른 사이트·Origin 없음·다른 주소·JSON 아님은 거절", () => {
    expect(rejectForeign(req({ host: "127.0.0.1:3939", origin: "https://evil.example", "content-type": "application/json" }))?.status).toBe(403);
    expect(rejectForeign(req({ host: "127.0.0.1:3939", "content-type": "application/json" }))?.status).toBe(403);
    expect(rejectForeign(req({ host: "192.168.0.5:3939", origin: "http://192.168.0.5:3939", "content-type": "application/json" }))?.status).toBe(403);
    expect(rejectForeign(req({ host: "127.0.0.1:3939", origin: "http://127.0.0.1:3939", "content-type": "text/plain" }))?.status).toBe(415);
  });
});

import { agyArgs } from "@/lib/ai-cli";
describe("Gemini 구독(Antigravity) 실행 방식", () => {
  it("읽기 전용(plan)·샌드박스로 돌리고, plan 을 꺼 버리는 --disable-slash-commands 는 넣지 않는다", () => {
    const { args, file } = agyArgs("[안내] 자막...", false);
    expect(args).toEqual(expect.arrayContaining(["--mode", "plan", "--sandbox"]));
    expect(args).not.toContain("--disable-slash-commands");
    expect(args[1]).toBe("[안내] 자막...");   // 맥: 글을 바로 실어 보냄 (파일 읽기 불필요)
    expect(file).toBeUndefined();
  });
  it("윈도우에서는 짧은 글도 언제나 파일로 (cmd.exe 명령 주입 막기)", () => {
    for (const t of ["가".repeat(30_000), "짧은 글", '100% "따옴표" & 줄\n바꿈']) {
      const a = agyArgs(t, true);
      expect(a.file).toBe(t);
      expect(a.args.join(" ")).not.toContain(t);
      expect(a.args[1]).toContain("request.txt");
    }
  });
});
