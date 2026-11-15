// 화면 배치 — 두 실제 영상에서 픽셀로 잰 값. 눈대중으로 바꾸면 안 된다.
import { describe, expect, it } from "vitest";
import * as L from "@/lib/layout";
import { buildAss } from "@/lib/ass";
import { TITLE_FONT_NAME, SUB_FONT_NAME } from "@/lib/binaries";

describe("배치와 자막 파일", () => {
  it("1080×1920, 제목·영상·자막이 정확히 25/50/25", () => {
    expect([L.CANVAS_W, L.CANVAS_H]).toEqual([1080, 1920]);
    expect([L.TITLE_BAND, L.VIDEO_BAND, L.SUB_BAND]).toEqual([
      { top: 0, height: 480 },
      { top: 480, height: 960 },
      { top: 1440, height: 480 },
    ]);
  });
  it("템플릿은 dark·light, 색만 다르다", () => {
    expect(Object.keys(L.TEMPLATES).sort()).toEqual(["dark", "light"]);
  });
  it("배치 값 전체가 그대로다", () => {
    expect({
      TITLE: L.TITLE,
      TITLE_FONT_SIZE: L.TITLE_FONT_SIZE,
      SUB_FONT_SIZE: L.SUB_FONT_SIZE,
      TEMPLATES: L.TEMPLATES,
      titles: ["small", "medium", "large", "xlarge"].map((s) => L.titlePlacement(s as never)),
    }).toMatchSnapshot();
  });
  it("글꼴 이름은 굵기마다 다르다 (틀리면 한글이 □로 나옴)", () => {
    expect(TITLE_FONT_NAME).toBe("Pretendard ExtraBold");
    expect(SUB_FONT_NAME).toBe("Pretendard");
  });
  it("자막 파일: 자동 줄바꿈(WrapStyle 0), 화면 크기, 제목·자막 모두 한 파일에", () => {
    const ass = buildAss({
      template: "dark",
      titleLine1: "하나님 없이 가느니",
      titleLine2: "차라리 가지 않겠습니다",
      clipDurationSec: 40,
      cues: [{ start: 0.5, end: 2, text: "목적지보다 중요한 것은" }],
      subtitles: { enabled: true, size: "large", position: "band" },
      churchName: "예제교회",
    });
    expect(ass).toContain("WrapStyle: 0");
    expect(ass).toContain("PlayResX: 1080");
    expect(ass).toContain("PlayResY: 1920");
    expect(ass).toMatchSnapshot();
  });
  it("자막 끄기", () => {
    const ass = buildAss({
      template: "light", titleLine1: "a", titleLine2: "b", clipDurationSec: 30,
      cues: [{ start: 0, end: 1, text: "보이면 안 됨" }],
      subtitles: { enabled: false, size: "medium", position: "band" },
    });
    expect(ass).not.toContain("보이면 안 됨");
  });
});
