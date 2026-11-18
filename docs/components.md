# SafeMeal 공통 컴포넌트 가이드

> 미리보기: `components.html`을 브라우저로 열면 모든 컴포넌트를 볼 수 있어요. (창을 768px 아래로 줄이면 모바일 모양)
> 원본 디자인: Figma `Ewha-SafeMeal-UI` › "SafeMeal 화면 (결정안 기준)"

## 폴더 구조

```
6sp-homepage/
├── index.html            식단 (홈)            ← 이수빈 / 설정 패널: 박서진
├── search.html           메뉴 검색·상세       ← 장은서
├── guide.html            자료 안내            ← 이채은
├── components.html       공통 컴포넌트 미리보기 ← 강민경
├── css/
│   ├── tokens.css        색·글꼴·모서리 변수 (공통, 수정 시 강민경에게 알려주기)
│   ├── base.css          reset, .container, .page, 글자 유틸
│   ├── components.css    공통 컴포넌트 스타일
│   └── pages/            페이지 전용 CSS (menu.css, search.css …) ← 각자
├── js/
│   ├── icons.js          아이콘 (Lucide)
│   ├── constants.js      알레르기 19종, 판정 상태, 식당, 페이지 목록
│   ├── ui.js             공통 컴포넌트 함수 (UI.xxx)
│   ├── data.js           JSON 읽기 + 메뉴·재료·알레르기 연결 (데이터 담당)
│   └── pages/            페이지 전용 JS (menu.js, settings.js, search.js …) ← 각자
├── data/                 meals.json, recipes.json, allergen-map.json
└── docs/                 문서
```

**규칙**
- 공통 파일(`css/tokens.css`, `css/components.css`, `js/ui.js`, `js/constants.js`)은 담당자(강민경)만 고쳐요. 필요한 게 있으면 이슈나 카톡으로 요청해 주세요. 여러 명이 같은 파일을 고치면 merge 충돌이 나요.
- 각자 작업은 `css/pages/`, `js/pages/`, 자기 html 파일에서 해요.
- 색은 hex를 직접 쓰지 말고 `var(--color-brand)`처럼 토큰을 써 주세요.
- 페이지에서 JSON을 `fetch`하려면 VS Code **Live Server**로 열어야 해요 (파일 더블클릭으로는 막혀요).

## 페이지 기본 틀

새 페이지는 `index.html`을 복사해서 시작하면 돼요. 핵심은 이 세 줄이에요.

```html
<script src="js/icons.js"></script>
<script src="js/constants.js"></script>
<script src="js/ui.js"></script>
<script>UI.mountLayout({ active: 'menu' });</script>  <!-- 'menu' | 'search' | 'guide' -->
```

`mountLayout`가 헤더, 푸터, 모바일 하단 탭바를 자동으로 붙여요.

## 컴포넌트 목록

모든 함수는 HTML 문자열을 돌려줘요 → `element.innerHTML = UI.xxx(...)`

| 컴포넌트 | 함수 | 쓰는 곳 |
| --- | --- | --- |
| 헤더/푸터/탭바 | `UI.mountLayout({ active })` | 모든 페이지 |
| 헤더 내 알레르기 칩 | `UI.setHeaderAllergens([5, 9])` | 설정 저장 후 (서진) |
| 세그먼트 | `UI.segmented({ name, options, value })` | 식당 선택, 모바일 중식/석식 |
| 날짜 선택 | `UI.dateStrip({ days, selected })` | 식단 |
| 판정 배지 | `UI.statusBadge('may', { detail: '대두' })` | 어디서나 |
| 범례 | `UI.statusLegend()` | 식단 상단 |
| 성분 태그 | `UI.allergenTag(10, 'confirmed' \| 'may' \| 'may-other')` | 상세 |
| 칩 | `UI.chip('진선미관')` | 상세 위쪽, 헤더 |
| 메뉴 한 줄 | `UI.menuItem({ id, name, desc, status, statusDetail })` | 식단, 검색 결과 |
| 끼니 카드 | `UI.mealCard({ title, items, tabbed })` | 식단 |
| 안내 박스 | `UI.callout({ variant, title, text, action })` | 출처, 경고, 설정 유도 |
| 버튼 | `UI.button({ label, variant, icon, size, block })` | 어디서나 |
| 아이콘 버튼 | `UI.iconButton({ icon, label })` | 닫기 등 |
| 알레르기 체크 | `UI.checkGrid([5, 9])` | 설정 |
| 상세 행 | `UI.judgeRow`, `UI.infoRow`, `UI.tagRow` | 상세 |
| 모달/바텀시트/패널 | `UI.openSheet({ ... , variant: 'modal' \| 'panel' })` | 상세(은서), 설정(서진) |

### 판정 상태 key

데이터(JSON)와 코드에서는 영문 key를 써 주세요.

| key | 화면 표시 | 뜻 |
| --- | --- | --- |
| `contains` | 포함 | 확정 목록에 내 알레르기 성분이 있음 |
| `may` | 포함 가능 | 포함 가능 목록에 있음 (가공품 등) |
| `unknown` | 정보 부족 | 판정할 정보가 부족함 |
| `clear` | 확인된 충돌 없음 | 확인된 충돌이 없음 (**안전 보장 아님**) |

### 알레르기 id

`SM.ALLERGENS`의 id(1~19)로 주고받아요. 화면에 쓸 이름은 `SM.allergenLabel(5)` → `⑤ 대두`.
Figma 기준 1번 이름은 **난류**예요. (역할표에는 "알류(가금류)"로 되어 있으니 서진·채은 님이 같은 이름을 쓰는지 꼭 맞춰 주세요.)

### 이벤트

| 이벤트 | 언제 | detail |
| --- | --- | --- |
| `sm:segment` | 세그먼트 선택 바뀜 | `{ name, value }` |
| `sm:date` | 날짜 클릭 | `{ date }` |
| `sm:week` | 이전/다음 주 화살표 | `{ dir: -1 \| 1 }` |
| `sm:open-settings` | 헤더 '설정' 버튼 / `data-open-settings` 버튼 | `{}` |

```js
document.addEventListener('sm:date', (e) => {
  renderMeals(e.detail.date);
});

// 메뉴 클릭 → 상세 열기
document.addEventListener('click', (e) => {
  const item = e.target.closest('[data-menu-id]');
  if (item) openDetail(item.dataset.menuId);
});
```

### 시트 예시 (메뉴 상세)

```js
UI.openSheet({
  meta: ['진선미관', '11월 4일 (수) 중식'],
  title: '꿔바로우',
  body: UI.callout({ variant: 'warn', title: '대두가 들어 있을 수 있어요', text: '…' })
      + UI.judgeRow({ allergenId: 5, desc: '포함 가능 목록에 있음', status: 'may' }),
  actions: UI.button({ label: '닫기', variant: 'primary', attrs: { 'data-sheet-close': true } }),
  footnote: '‘확인된 충돌 없음’을 포함해 어떤 표시도 알레르기 안전을 보장하지 않습니다.',
});
```

데스크톱은 가운데 모달, 모바일은 아래에서 올라오는 바텀시트로 자동으로 바뀌어요. `variant: 'panel'`은 오른쪽 설정 패널이에요.

## 주의

- 메뉴 이름처럼 **외부 데이터**를 직접 HTML에 넣을 때는 `UI.esc(text)`를 거쳐 주세요. (`UI.xxx` 함수들은 안에서 알아서 처리해요.)
- 아이콘은 [Lucide](https://lucide.dev) (ISC 라이선스)예요. 새 아이콘이 필요하면 `js/icons.js`에 추가해요.
