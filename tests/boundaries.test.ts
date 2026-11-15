// 말 중간에서 자르지 않기 — 자막 경계, 쉬는 틈(무음)에 맞추기, 30초~2분 길이.
import { describe, expect, it } from "vitest";
import { correctBoundary, cueRangeToSeconds, MAX_SEC, MIN_SEC } from "@/lib/boundaries";

const cues = Array.from({ length: 60 }, (_, i) => ({ start: i * 5, end: i * 5 + 4.5, text: `줄${i}` }));

describe("구간 경계", () => {
  it("길이는 30초~2분", () => {
    expect([MIN_SEC, MAX_SEC]).toEqual([30, 120]);
  });
  it("AI가 준 자막 번호가 틀리면 억지로 맞추지 않고 버린다", () => {
    expect(cueRangeToSeconds(cues, 2, 9)).toEqual({ rawStart: 10, rawEnd: 49.5 });
    expect(cueRangeToSeconds(cues, -1, 3)).toBeNull();
    expect(cueRangeToSeconds(cues, 3, 60)).toBeNull();
    expect(cueRangeToSeconds(cues, 9, 2)).toBeNull();
    expect(cueRangeToSeconds(cues, 1.5, 3)).toBeNull();
  });
  it("가까운 쉬는 틈(2초 안)에 맞추고 앞뒤로 조금 여유를 둔다", () => {
    const r = correctBoundary(10, 49.5, cues, [{ start: 9, end: 10.8 }, { start: 50.2, end: 51 }]);
    expect(r).toEqual({ startSec: 10.5, endSec: 50.7 });
  });
  it("쉬는 틈이 멀면 자막 경계 그대로", () => {
    expect(correctBoundary(10, 49.5, cues, [{ start: 30, end: 31 }])).toEqual({ startSec: 9.7, endSec: 50 });
  });
  it("너무 짧으면 30초까지 늘리고, 너무 길면 2분 안의 자막 경계에서 자른다", () => {
    const short = correctBoundary(10, 20, cues, []);
    expect(short.endSec - short.startSec).toBeGreaterThanOrEqual(30);
    const long = correctBoundary(0, 200, cues, []);
    expect(long.endSec - long.startSec).toBeLessThanOrEqual(120);
    expect(cues.some((c) => c.end === long.endSec)).toBe(true);
  });
});
