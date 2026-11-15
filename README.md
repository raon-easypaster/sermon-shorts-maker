# 설교 쇼츠 메이커

> 이 저장소는 [Rojaewon/sermon-shorts-maker](https://github.com/Rojaewon/sermon-shorts-maker)를 참고해서 만들었습니다. 맥·윈도우에서 설치 파일 없이 웹앱으로 바로 실행할 수 있도록 `web/` 실행 스크립트를 추가했습니다.

설교 유튜브 링크를 넣으면 AI가 하이라이트 구간을 찾아 1080×1920 쇼츠 영상으로 만들어 주는 데스크톱 앱입니다.

## 🌐 웹으로 사용하기 (맥·윈도우 공통)

Windows 전용 설치 파일 대신, **웹앱으로 실행**하면 맥·윈도우 어디서든 브라우저로 사용할 수 있습니다.
처음 한 번만 [Node.js](https://nodejs.org)를 설치하면 됩니다 (LTS 버전 권장).

1. 이 저장소를 내려받습니다 (`Code` → `Download ZIP` 또는 `git clone`).
2. `web` 폴더 안의 실행 파일을 더블클릭합니다.
   - 맥: `web/start-mac.command`
   - 윈도우: `web/start-windows.bat`
3. 처음 실행할 때는 필요한 프로그램을 자동으로 설치·준비하느라 몇 분 걸릴 수 있습니다. 이후에는 몇 초 안에 시작됩니다.
4. 브라우저 창이 자동으로 열리며 `http://localhost:3939` 에서 사용할 수 있습니다.

Gemini API 키는 화면에서 입력하며 **브라우저에만 저장**됩니다. 무료로 발급받으려면 [Google AI Studio](https://aistudio.google.com/apikey)를 이용하세요.
`ffmpeg`와 `yt-dlp`는 첫 실행 때 자동으로 받아옵니다. 별도 설치가 필요 없습니다.

> macOS에서 "확인되지 않은 개발자" 경고가 뜨면 `start-mac.command`를 마우스 우클릭 → 열기를 선택하세요.

## 📥 데스크톱 앱 (Windows 전용 설치 파일)

**[설치 파일 받기 (Windows)](https://github.com/raon-easypaster/sermon-shorts-maker/releases/latest)**

설치법·사용법은 [최신 릴리스 안내](https://github.com/raon-easypaster/sermon-shorts-maker/releases/latest)를 참고하세요.
AI는 **Claude · ChatGPT · Gemini 유료 구독**(이 컴퓨터에 로그인해 두면 API 요금 없이) 또는 **Gemini API 키** 중 고를 수 있고, 영상 처리는 모두 본인 컴퓨터에서 이루어집니다. AI에는 자막 글만 보냅니다.

- **설교 쇼츠 / 찬양 쇼츠** — 화면 맨 위에서 고릅니다. 찬양 쇼츠는 예배 영상에서 부른 곡들을 찾아 곡마다 후렴 구간을 쇼츠로 만들고, 제목에 곡명을 넣습니다.

- **AI 하이라이트 분석** — 설교 전체 구조(중심 메시지·대지)를 먼저 파악한 뒤, 그 맥락 안에서 하이라이트 5~6개를 고릅니다.
- **말 중간에 끊기지 않음** — 자막 큐 경계 + 실제 침묵 구간을 근거로 시작·끝을 보정합니다.
- **자막** — 켜기/끄기, 크기 4단계, 위치 4종, 오타 직접 수정.
- **템플릿** — 다크 / 라이트.
- **화면 맞춤** — 구간별로 인물 중심(크롭) 또는 전체 화면(레터박스) 선택. PPT가 나오는 구간은 잘리지 않게.

## 개발

```bash
npm install
npm run dev      # http://127.0.0.1:3939 (이 컴퓨터에서만 열림)
npm test         # 기존 기능 점검(하네스) — 고칠 때마다
npm run verify   # 타입 검사 + 하네스 + next build — 배포 전 필수
npm run smoke    # 켜져 있는 서버로 쇼츠 한 편을 실제로 만들어 확인 (--ai claude 로 AI까지)
npm run dist     # verify 를 통과해야만 설치 파일을 만듦 -> dist/
```

윈도우 설치 파일은 `v0.3.0` 같은 태그를 올리면 GitHub Actions(윈도우 빌드 서버)가 하네스 시험을 거쳐 만들고 릴리스에 올립니다(`.github/workflows/windows.yml`).

`ffmpeg`와 `yt-dlp`는 첫 실행 때 자동으로 받아옵니다. 별도 설치가 필요 없습니다.

Gemini API 키는 화면에서 입력하며 **브라우저에만 저장**됩니다. 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 무료로 발급받을 수 있습니다.

## 필요 환경

브라우저에서는 영상을 내려받거나 편집할 수 없어 **Node 서버가 필요**합니다. 서버리스(Vercel 등)에는 배포할 수 없고, 디스크가 있는 상시 구동 서버가 필요합니다.

## 참고

유튜브 영상 다운로드는 약관상 회색지대입니다. 이 앱은 **본인이 권리를 가진 설교 영상**(예: 본인 교회가 업로드한 영상)에 사용하는 것을 전제로 합니다.
