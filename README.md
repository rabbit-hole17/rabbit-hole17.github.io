# rabbit-hole · 토끼굴

노드를 누르면 검증자료·출처·해석 한계·연결된 지식·수집 원문을 볼 수 있는 GitHub Pages용 정적 사이트입니다. 별도 서버나 npm 패키지 설치 없이 동작합니다.

## 구성

- `docs/`: 배포할 사이트 전체. HTML, CSS, JavaScript, JSON, 아이콘만 포함합니다.
- `docs/data/knowledge.json`: 확인된 지식 210개의 상세 데이터.
- `docs/data/graph.json`: 확인된 지식 210개 + 주제 11개 노드, 관계 2241개.
- `docs/data/sources.json`: 해당 지식에서 참조하는 검증 출처 191개.
- `docs/data/posts.json`: 해당 지식에서 참조하는 수집 게시글 44개의 제목·URL·연결. 원문 전문·로컬 경로는 포함하지 않습니다.
- `scripts/export-data.mjs`: 기존 사실확인 JSON과 `research/verified-supplement.json`의 확인된 추가 항목을 합쳐 공개 데이터로 변환합니다. 중복 ID는 오류로 중단합니다.
- `scripts/check-data.mjs`: ID·관계 근거·출처 참조를 검증합니다.

페이지와 공개 JSON에는 확인·문헌상 확인 항목만 포함합니다. 오류·근거 부족·보류 항목은 내보내지 않으며 기존 C/P 노드 주소는 확인된 노드로 이동합니다. 수집 원문 전체의 진위까지 확인했다는 의미는 아닙니다.

## 로컬 실행

Node.js가 있는 환경에서 저장소 루트에서 실행합니다.

```sh
node scripts/serve.mjs
```

브라우저: <http://127.0.0.1:4173/renew/>. `index.html`을 파일로 직접 열면 브라우저의 로컬 파일 fetch 제한에 걸릴 수 있으므로 HTTP 서버를 사용합니다. `/renew/` 경로는 GitHub 프로젝트 사이트 하위 경로에서도 정상 동작하는지 확인하는 로컬 별칭입니다.

## GitHub Actions 자동 배포

1. 이 폴더의 파일을 원하는 GitHub 저장소에 올립니다.
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 한 번 설정합니다.
3. 기본 브랜치에 푸시하면 `.github/workflows/pages.yml`이 검증 후 `docs/`를 배포합니다. 기본 브랜치 이름은 저장소 설정에서 자동으로 읽습니다.
4. 최초 설정 전에 실행되어 실패한 경우 **Actions → Validate and deploy Pages → Run workflow**에서 기본 브랜치를 선택해 다시 실행합니다.
5. 성공한 `deploy` 작업의 `github-pages` 환경 URL에서 사이트를 확인합니다.

모든 브랜치 push와 PR에서는 JavaScript 문법 및 JSON 무결성을 검사합니다. 확인되지 않은 항목·깨진 출처·누락된 관계가 있으면 배포를 중단합니다. PR과 기본 브랜치 이외에서는 배포하지 않습니다. 수동 실행도 기본 브랜치에서만 배포합니다. 배포 권한은 deploy 작업에만 부여하며 별도 PAT 시크릿은 필요하지 않습니다. 저장소/조직에서 Actions 또는 Pages를 제한하면 해당 설정을 먼저 허용해야 합니다.

CI는 커밋된 공개 JSON을 검증·배포합니다. 로컬 Obsidian 경로에는 접근하지 않으므로 원본 변경 후 아래 데이터 갱신 명령을 실행하고 생성된 JSON도 함께 커밋하세요. 현재는 워크플로 파일을 준비한 상태이며, 저장소 연결·GitHub에서의 최초 실행은 수행하지 않았습니다.

일반 저장소는 `https://<사용자>.github.io/<저장소>/`, `<사용자>.github.io` 저장소는 `https://<사용자>.github.io/` 형식입니다. 모든 리소스와 fetch는 상대 경로이므로 양쪽에서 동작합니다. 현재 작업에서는 원격 저장소 생성·업로드·공개 배포는 수행하지 않았습니다.

[GitHub 공식 배포 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 다른 페이지에서 JSON 가져오기

```js
// 이 사이트 내부에서 실행할 때
const response = await fetch('./data/knowledge.json');
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const { items } = await response.json();

// 다른 페이지에서는 배포 후 실제 주소를 사용합니다.
const graphResponse = await fetch(
  'https://<사용자>.github.io/<저장소>/data/graph.json'
);
if (!graphResponse.ok) throw new Error(`HTTP ${graphResponse.status}`);
const { nodes, edges } = await graphResponse.json();
```

실제 공개 URL은 저장소 이름이 정해지고 배포된 뒤 생깁니다. 다른 origin의 페이지에서 가져오는 경우 배포된 JSON 응답의 CORS 허용 여부도 확인하세요. 같은 사이트 안에서 가져오는 현재 구현에는 별도 CORS 설정이 필요하지 않습니다.

## 데이터 계약

`schemaVersion`은 `1.0.0`입니다. 필드 정의는 [data/README.md](docs/data/README.md)를 참고하세요. 주제 연결·같은 외부 출처·같은 수집 원문으로 관계를 만들며 인과관계나 비밀 조직의 실재를 추론해 연결하지 않습니다.

확인된 정보는 과거 발표·문헌의 해당 범위를 확인한 것입니다. 발표 시점과 검토일을 보존하며 현재 상용화·거래종결·취역 여부로 바꾸지 않습니다. 2026-09-17 계보·인물 추가 조사에서 사실 4개를 더하고 성경 계보 항목을 보완했습니다. 기존 오류·근거 부족 18개는 원본 검증 데이터에서도 삭제했습니다. 로컬 `추가조사.json`의 P08·P09만 조사 대상으로 유지하며 다른 14개는 사용자 요청으로 중단했습니다. 조사 이력과 미확인 연결은 공개하지 않습니다.

## 데이터 갱신

사실확인 폴더의 `검증항목.json`, `출처목록.json`, `추가조사.json`을 수정한 후 문서와 원문 인덱스를 재생성합니다:

```powershell
& 'D:\second_brain\40_정보\renew\사실확인\build_notes.ps1'
node scripts/export-data.mjs 'D:\second_brain\40_정보\renew\사실확인'
node scripts/check-data.mjs
```

갱신된 `docs/data/*.json`을 GitHub에 올리면 됩니다. 원본 컴퓨터 경로는 내보내기 명령의 입력일 뿐, 공개 JSON에 들어가지 않습니다.

## 검증

```sh
node scripts/check-data.mjs
```

브라우저 통합 검증은 Playwright와 Chromium이 설치된 개발 환경에서 `node scripts/browser-check.mjs`로 실행합니다. 로컬 서버가 먼저 실행되어 있어야 합니다. 별도 설치 위치는 `PLAYWRIGHT_MODULE`, 기존 Chrome 실행 파일은 `CHROME_PATH` 환경변수로 지정할 수 있습니다. 배포에는 Playwright가 필요하지 않습니다.

## 사용자 제공 인물 자료

우리법연구회 TXT의 117개 항목을 로컬에 구조화했습니다. 2010년 공개 명단을 전한 두 보도와 대조되는 60개만 F41–F100으로 공개합니다. 당시 명단 기재 사실이며 현재 회원 여부나 판결 평가의 확인이 아닙니다. 미확인 57개와 원문 전문은 배포하지 않습니다. 24개를 넘는 주제는 전체 지도에서 묶음으로 표시되며 주제를 선택하면 개별 노드가 펼쳐집니다.

## CIA · MKULTRA

F101–F106은 1977년 미국 상원 공식 청문회와 조사 부록을 근거로 승인, 비동의 약물 실험, 하위사업 규모, 기록 폐기, 자료 재발견, 청문회 개최를 정리합니다. 각 검증자료에 PDF 쪽수를 표시하고 실험 목적·성과·기록의 공백을 구별합니다.
