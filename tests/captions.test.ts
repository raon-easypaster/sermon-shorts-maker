// 자막 읽기 — 유튜브 자동 자막(단어마다 시각이 붙은 '굴러가는' 형식)을 자막 줄로 바꾸는 부분.
import { describe, expect, it } from "vitest";
import { cleanCaption, cuesInRange, parsePlainVtt, parseVttWords, wordsToCues } from "@/lib/captions";

// 실제 유튜브 자동 자막과 같은 모양의 예시 (설교 내용은 지어낸 것)
const ROLLING = `WEBVTT
Kind: captions
Language: ko

00:00:01.000 --> 00:00:03.000 align:start position:0%
 
오늘<00:00:01.400><c> 우리가</c><00:00:01.800><c> 함께</c><00:00:02.200><c> 볼</c><00:00:02.600><c> 말씀은</c>

00:00:03.000 --> 00:00:03.010 align:start position:0%
오늘 우리가 함께 볼 말씀은
 

00:00:03.010 --> 00:00:06.000 align:start position:0%
오늘 우리가 함께 볼 말씀은
요한복음<00:00:03.500><c> 15장</c><00:00:04.000><c> 말씀입니다</c>

00:00:08.000 --> 00:00:10.000 align:start position:0%
 
&gt;&gt;<00:00:08.300><c> 아멘</c><00:00:08.700><c> [음악]</c>
`;

describe("자막 읽기", () => {
  it("단어마다 시각을 뽑고, 겹쳐 나오는 줄은 한 번만 센다", () => {
    const w = parseVttWords(ROLLING);
    expect(w.map((x) => x.w)).toEqual(["오늘", "우리가", "함께", "볼", "말씀은", "요한복음", "15장", "말씀입니다", "&gt;&gt;", "아멘", "[음악]"]);
    expect(w[0].t).toBe(1);
    expect(w[6].t).toBe(3.5);
  });
  it("단어를 자막 줄로 묶는다 (1초 넘게 쉬거나 7단어가 되면 끊음)", () => {
    expect(wordsToCues(parseVttWords(ROLLING))).toMatchSnapshot();
  });
  it("단어 시각이 없는 자막도 읽는다", () => {
    const plain = "WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.500\n<b>안녕하세요</b>\n\n2\n00:00:03,000 --> 00:00:04,000\n반갑습니다\n";
    expect(parsePlainVtt(plain)).toEqual([
      { start: 1, end: 2.5, text: "안녕하세요" },
      { start: 3, end: 4, text: "반갑습니다" },
    ]);
  });
  it("영상에 넣는 자막에서는 >> 표시와 [음악] 같은 소리 표시를 지운다", () => {
    expect(cleanCaption("&gt;&gt; 아멘. &gt;&gt; 용서해 주세요.")).toBe("아멘. 용서해 주세요.");
    expect(cleanCaption("주님 [음악] 나의 마음은 [노래]")).toBe("주님 나의 마음은");
    expect(cleanCaption("[박수]")).toBe("");
    expect(cleanCaption("A &amp; B")).toBe("A & B");
  });
  it("구간 안 자막만 고르고, 다듬어서 빈 자막은 뺀다", () => {
    const cues = [
      { start: 0, end: 2, text: "앞" },
      { start: 2, end: 4, text: "&gt;&gt; 가운데" },
      { start: 4, end: 6, text: "[음악]" },
      { start: 6, end: 8, text: "뒤" },
    ];
    expect(cuesInRange(cues, 2.5, 6.5)).toEqual([
      { start: 2, end: 4, text: "가운데" },
      { start: 6, end: 8, text: "뒤" },
    ]);
  });
});
