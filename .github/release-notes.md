## 설교·찬양 쇼츠 메이커 (윈도우)

### 새로 바뀐 것
- **찬양 쇼츠**: 화면 맨 위에서 '🎵 찬양 쇼츠'를 고르고 예배 영상 링크를 넣으면, AI가 부른 곡들을 찾아 곡마다 후렴 구간으로 쇼츠를 만듭니다. 제목 둘째 줄에 곡 제목이 들어갑니다. 가사 자막은 유튜브 자동 자막이라 처음엔 꺼 둡니다.
- **유료 AI 구독으로 분석**: Claude · ChatGPT · Gemini 유료 구독을 이 컴퓨터에 로그인해 두면 API 키 없이 그 구독으로 분석합니다. (Gemini API 키 방식도 그대로 됩니다)
- 영상 자막에 `>>` 나 `[음악]` 표시가 찍히던 문제를 고쳤습니다.
- 이 컴퓨터에서만 열리도록 보안을 보강했습니다.

### 설치
1. 아래 `SermonShortsMaker-Setup-*.exe`를 받아 실행합니다. (서명이 없어 "Windows의 PC 보호" 창이 뜨면 **추가 정보 → 실행**)
2. 구독 AI를 쓰려면 터미널(PowerShell)에서 한 번 로그인합니다.
   - Claude: `irm https://claude.ai/install.ps1 | iex` 설치 후 `claude` 실행해 로그인
   - ChatGPT: `npm install -g @openai/codex` 후 `codex login`
   - Gemini: `npm install -g @google/gemini-cli` 후 `gemini` 실행 → Login with Google
   (npm 은 [Node.js](https://nodejs.org) LTS 를 설치하면 함께 생깁니다)

`SHA256SUMS.txt` 는 받은 파일 확인값입니다.

본인 교회가 올린, 권리를 가진 영상에만 사용하세요.
