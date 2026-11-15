// 찬양 쇼츠 — AI에게 보내는 요청 글과 제목 만들기 방식이 설교와 섞이지 않는지.
import { describe, expect, it } from "vitest";
import { praisePrompt } from "@/lib/gemini";

const cues = [
  { start: 217, end: 220, text: "주님 [음악]" },
  { start: 220, end: 224, text: "나의 마음은" },
  { start: 224, end: 228, text: "&gt;&gt; 선한 [노래] 것 하나" },
];

describe("찬양 쇼츠", () => {
  it("AI에는 [노래] 표시를 그대로 보내(찬양 찾는 단서), 번호·시각을 붙인다", () => {
    const p = praisePrompt(cues, 60);
    expect(p).toContain("[0] (3:37) 주님 [음악]");
    expect(p).toContain("[2] (3:44) &gt;&gt; 선한 [노래] 것 하나");
    expect(p).toContain("설교·기도·광고");
    expect(p).toContain("최대 6곡");
    expect(p).toContain("약 60초");
  });
});
