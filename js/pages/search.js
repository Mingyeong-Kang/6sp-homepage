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
    { id: 'm-1', name: '제육볶음', desc: '확정 ⑤⑥⑩', status: 'contains', statusDetail: '대두' },
    { id: 'm-2', name: '돈까스', desc: '확정 ①②⑤⑥⑩', status: 'contains', statusDetail: '우유' },
    { id: 'm-3', name: '묵은지순살찜닭', desc: '가능 ⑤⑥⑮', status: 'may', statusDetail: '대두' },
    { id: 'm-4', name: '배추김치', desc: '가능 ⑨', status: 'may', statusDetail: '새우' },
    { id: 'm-5', name: '쌀밥', desc: '정보 부족', status: 'unknown' },
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

  renderList(MOCK_MENUS);
})();
