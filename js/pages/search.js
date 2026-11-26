/*
 * 메뉴 검색·상세 화면 (Figma 05, 06)
 * 담당: 장은서
 * 사용: js/ui.js (UI), js/constants.js (SM)
 */
(function () {
  'use strict';

  const inputSlot = document.getElementById('search-input');
  const resultsSlot = document.getElementById('search-results');

  // mock 메뉴 목록 (채은님 lookup.js 연동 전까지 임시로 사용)
  // ⚠️ 알레르기 내용은 테스트용 가짜예요. 실제 성분 아님!
  const MOCK_MENUS = [
    {
      id: 'm-1', name: '제육볶음', desc: '확정 ⑤⑥⑩', status: 'contains', statusDetail: '대두',
      sourceLabel: '영양사 제공 (학식 기준)', allergens: [5, 6, 10], possible: [],
    },
    {
      id: 'm-2', name: '돈까스', desc: '확정 ①②⑤⑥⑩', status: 'contains', statusDetail: '우유',
      sourceLabel: '영양사 제공 (학식 기준)', allergens: [1, 2, 5, 6, 10], possible: [],
    },
    {
      id: 'm-3', name: '묵은지순살찜닭', desc: '가능 ⑤⑥⑮', status: 'may', statusDetail: '대두',
      sourceLabel: '표준 레시피 기준 추정', allergens: [], possible: [5, 6, 15],
    },
    {
      id: 'm-4', name: '배추김치', desc: '가능 ⑨', status: 'may', statusDetail: '새우',
      sourceLabel: '표준 레시피 기준 추정', allergens: [], possible: [9],
    },
    {
      id: 'm-5', name: '쌀밥', desc: '정보 부족', status: 'unknown',
      sourceLabel: '정보 없음', allergens: [], possible: [],
    },
  ];

  function renderList(menus) {
    resultsSlot.innerHTML = menus.length
      ? `<div class="search-results__list">${menus.map(UI.menuItem).join('')}</div>`
      : `<p class="search-results__empty">검색 결과가 없습니다.</p>`;
  }

  // 메뉴 이름 검색 필터링 (입력할 때마다 바로 반영)
  function filterMenus(query) {
    const q = query.trim();
    if (!q) return MOCK_MENUS;
    return MOCK_MENUS.filter((m) => m.name.includes(q));
  }

  inputSlot.addEventListener('input', (e) => {
    renderList(filterMenus(e.target.value));
  });

  // 상세 시트 본문: 출처, 확정/포함 가능 성분, 내 알레르기 판정 (mock lookup 기준)
  function buildDetailBody(menu) {
    const rows = [UI.infoRow('출처', menu.sourceLabel)];
    if (menu.allergens.length) {
      rows.push(UI.tagRow('확정 성분', menu.allergens.map((id) => UI.allergenTag(id, 'confirmed')).join('')));
    }
    if (menu.possible.length) {
      rows.push(UI.tagRow('포함 가능', menu.possible.map((id) => UI.allergenTag(id, 'may-other')).join('')));
    }
    const myAllergen = SM.ALLERGENS.find((a) => a.name === menu.statusDetail);
    if (myAllergen) {
      rows.push(UI.judgeRow({ allergenId: myAllergen.id, desc: '내 알레르기', status: menu.status }));
    }
    return rows.join('');
  }

  // 검색 결과 클릭 시 상세 시트 열기
  resultsSlot.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-menu-id]');
    if (!btn) return;
    const menu = MOCK_MENUS.find((m) => m.id === btn.dataset.menuId);
    if (!menu) return;
    UI.openSheet({
      title: menu.name,
      body: buildDetailBody(menu),
      actions: UI.button({ label: '닫기', variant: 'primary', attrs: { 'data-sheet-close': true } }),
      footnote: '영양사 검토 전 자료가 포함되어 있으며 알레르기 안전을 보장하지 않습니다. 드시기 전 식당에 꼭 확인하세요.',
    });
  });

  renderList(MOCK_MENUS);
})();
