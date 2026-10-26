# 1950 → 1960 웹 3D 프로토타입

## 실행

프로젝트 루트에서 `node experiments/serve-local.mjs`를 실행합니다.

- 실제 사이트: `http://127.0.0.1:8767/index.html#history-3d`
- 독립 확인 페이지: `http://127.0.0.1:8767/experiments/history-3d-1950-1960.html`

브라우저의 ES 모듈을 사용하므로 HTML 파일을 직접 열지 않고 로컬 서버로 접속합니다.
독립 확인 페이지는 모바일 폭에 맞춰 표시됩니다. 기존 전체 사이트는 원래의 데스크톱 최소 너비 설정을 유지합니다.

## 구현

- `js/history-3d.js`: Three.js 원통, 고정 직교 카메라, 금속 캡, UV 라벨, 스크롤 위치 연결
- `css/history-3d.css`: 연도별 배경, 세로 방향의 배경 연결, 반응형 레이아웃
- `img/history/1950packaging.png`, `1960packaging.png`: 사용자 ZIP에서 추출한 패키징 원본
- `img/history/history-bg-1950.png`, `history-bg-1960.png`: 기존 배경 원본
- `js/vendor/`: 로컬 Three.js 0.180.0 및 GSAP/ScrollTrigger 3.15.0

하나의 원통이 긴 축을 따라 회전하며 화면 아래로 이동합니다. 금속 캡과 원통 형태는 유지하고, 표면의 두 이미지만 캔버스 텍스처에서 혼합합니다. 3D 장면은 스크롤 또는 크기 변경 때만 렌더링합니다.

## 연도 추가

1. 새 배경과 패키징 PNG를 `img/history/`에 넣습니다. 패키징은 기존과 같은 가로 2:1 UV 이미지 비율을 권장합니다.
2. `index.html`과 독립 확인 페이지의 `.history-3d-stage` 안에 `data-year`, `data-packaging`을 가진 `.history-3d-era`를 순서대로 추가합니다.
3. `css/history-3d.css`에 새 연도의 `.history-3d-era[data-year="..."] .history-3d-era-background` 이미지를 지정합니다.

스크롤 길이, 회전 수, 패키징 쌍의 혼합은 연도 개수에 맞춰 자동으로 계산합니다. 이후 연도와 연결할 때는 현재 1970년 이후의 정적 장면과 중복되지 않게 해당 장면을 교체해야 합니다.
