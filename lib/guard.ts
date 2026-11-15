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
  // 서버는 127.0.0.1 에서만 열리므로(package.json -H 127.0.0.1, 데스크톱 앱도 같음) 다른 기기는 닿지 못한다.
  // 여기서는 다른 웹사이트가 브라우저를 시켜 보내는 요청(CSRF)과 DNS 재바인딩을 막는다.
  // 브라우저의 POST 는 언제나 Origin 을 붙이므로 없으면 받지 않는다.
  if (!origin) return no("허용되지 않은 요청입니다.");
  {
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
