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
