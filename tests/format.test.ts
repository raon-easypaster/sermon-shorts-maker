import { describe, expect, it } from "vitest";
import { describeApiKey, durLabel, mmss, parseTime, sanitizeApiKey } from "@/lib/format";
import { extractVideoId } from "@/lib/ytdlp";

describe("작은 도우미들", () => {
  it("유튜브 주소에서 영상 번호", () => {
    for (const u of [
      "https://www.youtube.com/watch?v=PkgR2-8HT68",
      "https://youtube.com/watch?feature=x&v=PkgR2-8HT68",
      "https://youtu.be/PkgR2-8HT68?si=abc",
      "https://www.youtube.com/shorts/PkgR2-8HT68",
      "https://www.youtube.com/embed/PkgR2-8HT68",
      "PkgR2-8HT68",
    ]) expect(extractVideoId(u)).toBe("PkgR2-8HT68");
    expect(extractVideoId("https://example.com")).toBeNull();
  });
  it("붙여 넣은 API 키의 보이지 않는 글자 지우기와 가린 확인 글", () => {
    expect(sanitizeApiKey("​ AIzaSyABCDEFGH12345 ﻿")).toBe("AIzaSyABCDEFGH12345");
    expect(describeApiKey("AIzaSyABCDEFGH12345")).toBe("19자, AIza...2345");
    expect(describeApiKey("abc")).toContain("너무 짧아요");
  });
  it("시간 글", () => {
    expect(parseTime("1:30")).toBe(90);
    expect(parseTime("95")).toBe(95);
    expect(parseTime("1:3:4")).toBeNull();
    expect(mmss(3725)).toBe("62:05");
    expect([durLabel(45), durLabel(60), durLabel(95)]).toEqual(["45초", "1분", "1분 35초"]);
  });
});
