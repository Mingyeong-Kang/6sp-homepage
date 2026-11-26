/*
 * 메뉴 검색·상세 화면 (Figma 05, 06)
 * 담당: 장은서
 * 사용: js/ui.js (UI), js/constants.js (SM), js/lookup.js (createAllergenIndex, checkMenu)
 */
(function () {
  'use strict';

  const inputSlot = document.getElementById('search-input');
  const noticeSlot = document.getElementById('search-notice');
  const resultsSlot = document.getElementById('search-results');

  // checkMenu()의 판정(danger/caution/unknown/ok) → 화면 배지 상태(contains/may/unknown/clear)
  const LEVEL_TO_STATUS = { danger: 'contains', caution: 'may', unknown: 'unknown', ok: 'clear' };

  let currentMenus = [];

  function getMyAllergies() {
    try {
      const ids = JSON.parse(localStorage.getItem('safemeal.allergenIds'));
      return Array.isArray(ids) ? ids : [];
    } catch (error) {
      return [];
    }
  }

  function buildMenu(index, name) {
    const result = index.find(name);
    const mine = getMyAllergies();
    const check = checkMenu(result, mine);
    return {
      id: name,
      name: name,
      result: result,
      // 알레르기를 설정하기 전에는 판정 배지를 숨김 (비교 대상이 없어서 "충돌 없음"이 안전처럼 보이는 것을 막음)
      status: mine.length ? LEVEL_TO_STATUS[check.level] : undefined,
      statusDetail: check.hits[0] ? check.hits[0].name : undefined,
    };
  }

  // 알레르기를 아직 설정하지 않았으면 설정 유도 안내 (이수빈님 식단 화면과 같은 문구)
  function renderNotice() {
    noticeSlot.innerHTML = getMyAllergies().length
      ? ''
      : UI.callout({
          variant: 'brand',
          title: '내 알레르기를 설정하면 메뉴마다 포함 여부를 알려드려요',
          text: '식약처 표시 대상 19종 중에서 고르면 됩니다. 로그인 없이 이 기기 브라우저에만 저장됩니다.',
          action: UI.button({ label: '알레르기 설정하기', variant: 'primary', icon: 'sliders', attrs: { 'data-open-settings': true } }),
        });
  }

  function renderEmpty() {
    const q = inputSlot.value.trim();
    return UI.callout({
      variant: 'info',
      title: q ? `‘${q}’ 검색 결과가 없어요` : '검색할 수 있는 메뉴가 없어요',
      text: '영양사 성분표에 없는 메뉴일 수 있어요. 자료에 없다고 해서 알레르기 성분이 없다는 뜻은 아니니, 드시기 전 식당에 꼭 확인하세요.',
    });
  }

  function renderList(menus) {
    resultsSlot.innerHTML = menus.length
      ? `<div class="search-results__list">${menus.map((m) => UI.menuItem(m)).join('')}</div>`
      : renderEmpty();
  }

  // 메뉴 이름 검색 필터링 (입력할 때마다 바로 반영)
  function filterMenus(query) {
    const q = query.trim();
    if (!q) return currentMenus;
    return currentMenus.filter((m) => m.name.includes(q));
  }

  inputSlot.addEventListener('input', (e) => {
    renderList(filterMenus(e.target.value));
  });

  // 상세 시트 본문: 출처, 확정/포함 가능 성분, 내 알레르기 판정
  function buildDetailBody(menu) {
    const result = menu.result;
    const rows = [UI.infoRow('출처', result.sourceLabel)];
    if (result.allergens.length) {
      rows.push(UI.tagRow('확정 성분', result.allergens.map((a) => UI.allergenTag(a.no, 'confirmed')).join('')));
    }
    if (result.possibleFromName.length) {
      rows.push(UI.tagRow('포함 가능', result.possibleFromName.map((a) => UI.allergenTag(a.no, 'may-other')).join('')));
    }
    const check = checkMenu(result, getMyAllergies());
    check.hits.forEach((hit) => {
      rows.push(UI.judgeRow({ allergenId: hit.no, desc: '내 알레르기', status: menu.status }));
    });
    if (result.note) rows.push(UI.infoRow('참고', result.note));
    return rows.join('');
  }

  // 검색 결과 클릭 시 상세 시트 열기
  resultsSlot.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-menu-id]');
    if (!btn) return;
    const menu = currentMenus.find((m) => m.id === btn.dataset.menuId);
    if (!menu) return;
    UI.openSheet({
      title: menu.name,
      body: buildDetailBody(menu),
      actions: UI.button({ label: '닫기', variant: 'primary', attrs: { 'data-sheet-close': true } }),
      footnote: '영양사 검토 전 자료가 포함되어 있으며 알레르기 안전을 보장하지 않습니다. 드시기 전 식당에 꼭 확인하세요.',
    });
  });

  // 설정 화면에서 내 알레르기를 바꾸면 판정도 다시 계산
  document.addEventListener('sm:allergens-changed', () => {
    currentMenus = currentMenus.map((m) => buildMenu(index, m.name));
    renderNotice();
    renderList(filterMenus(inputSlot.value));
  });

  renderNotice();

  let index = null;

  Promise.all([
    fetch('data/dietitian-allergens.json').then((r) => r.json()),
    fetch('data/recipe-allergens.min.json').then((r) => r.json()),
    fetch('data/allergen_rules.json').then((r) => r.json()),
  ]).then(([dietitian, recipes, rules]) => {
    index = createAllergenIndex(dietitian, recipes, rules);
    // 검색 대상: 영양사 성분표의 학식 메뉴 전체 (weekly-menu.json이 올라오면 이번 주 메뉴로 교체 검토)
    currentMenus = dietitian.menus.map((m) => buildMenu(index, m.name));
    renderList(filterMenus(inputSlot.value));
  }).catch(() => {
    resultsSlot.innerHTML = UI.callout({
      variant: 'warn',
      title: '자료를 불러오지 못했어요',
      text: '파일을 더블클릭해서 연 경우 자료를 읽을 수 없어요. VS Code의 Live Server로 열어 주세요.',
    });
  });
})();
