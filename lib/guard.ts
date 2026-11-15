// 이 컴퓨터의 쇼츠 화면에서 온 요청만 받는다.
// 다른 웹사이트가 몰래 이 서버를 불러 구독 AI·API 키를 쓰게 하거나(CSRF),
// 같은 와이파이의 다른 기기가 부르는 것을 막는다.
import { NextResponse, type NextRequest } from "next/server";

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

export function rejectForeign(req: NextRequest): NextResponse | null {
  const host = req.headers.get("host") || "";
  const origin = req.headers.get("origin");
  const type = req.headers.get("content-type") || "";
  const no = (msg: string) => NextResponse.json({ error: msg }, { status: 403 });
  if (!LOCAL.test(host)) return no("이 컴퓨터에서만 쓸 수 있습니다.");
  if (origin) {
    let o: URL;
    try {
      o = new URL(origin);
    } catch {
      return no("허용되지 않은 요청입니다.");
    }
    if (o.host.toLowerCase() !== host.toLowerCase()) return no("허용되지 않은 요청입니다.");
  }
  if (!/^application\/json\b/i.test(type)) return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 415 });
  return null;
}
