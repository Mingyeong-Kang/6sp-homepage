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
  let dataDate = ''; // 영양사 자료 JSON이 만들어진 날 (YYYY-MM-DD)

  // 영양사 자료의 날짜는 연도 없는 "10/26" 형식 → 자료가 만들어진 해를 붙여 요일 계산
  function formatDate(md) {
    const [m, d] = md.split('/').map(Number);
    const year = Number(dataDate.slice(0, 4)) || new Date().getFullYear();
    const weekday = '일월화수목금토'[new Date(year, m - 1, d).getDay()];
    return `${m}/${d}(${weekday})`;
  }

  function getMyAllergies() {
    try {
      const ids = JSON.parse(localStorage.getItem('safemeal.allergenIds'));
      return Array.isArray(ids) ? ids : [];
    } catch (error) {
      return [];
    }
  }

  function buildMenu(index, entry) {
    const result = index.find(entry.name);
    const mine = getMyAllergies();
    const check = checkMenu(result, mine);
    return {
      id: entry.name,
      name: entry.name,
      entry: entry,
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

  // 내 알레르기 하나에 대한 판정 이유 문구 (checkMenu의 level/reason 기준)
  function judgeDesc(check) {
    if (check.level === 'danger') return '확정 성분 목록에 있음';
    if (check.level === 'caution') return '포함 가능 목록에 있음';
    if (check.level === 'unknown') {
      if (check.reason === 'low_confidence') return '비슷한 레시피로 추정한 결과라 확정할 수 없음';
      if (check.reason === 'none_estimated') return '자료에 표시된 성분이 없어 확인 필요';
      return '자료가 부족해 판정할 수 없음';
    }
    return '확인된 성분 목록에는 없음';
  }

  // 내가 고른 알레르기를 전부 나열해서 각각 판정 (걸린 것만 보여주면 나머지가 "문제없음"처럼 보임)
  function buildJudgeSection(result) {
    const mine = SM.ALLERGENS.filter((a) => getMyAllergies().includes(a.id));
    const body = mine.length
      ? mine.map((a) => {
          const check = checkMenu(result, [a.id]);
          return UI.judgeRow({ allergenId: a.id, desc: judgeDesc(check), status: LEVEL_TO_STATUS[check.level] });
        }).join('')
      : '<p class="search-detail__empty">내 알레르기를 설정하면 이 메뉴와 비교해 드려요.</p>';
    return `<section><h3 class="search-detail__heading">내 알레르기 판정</h3>${body}</section>`;
  }

  // 맨 위 경고 박스: 내 알레르기가 걸리거나 정보가 부족할 때만 (충돌 없음은 박스를 띄우지 않음 → 안전 표시 금지)
  function buildAlert(result) {
    if (!getMyAllergies().length) return '';
    const check = checkMenu(result, getMyAllergies());
    const names = check.hits.map((h) => h.name).join(', ');
    if (check.level === 'danger') {
      return UI.callout({
        variant: 'danger',
        title: `${names} 성분이 들어 있어요`,
        text: `확정 성분에 내 알레르기가 있어요. (출처: ${result.sourceLabel})`,
      });
    }
    if (check.level === 'caution') {
      return UI.callout({
        variant: 'warn',
        title: `${names} 성분이 들어 있을 수 있어요`,
        text: `재료를 확정하지 못해 '포함 가능'으로 표시합니다. 정확한 재료는 식당에 확인하세요. (출처: ${result.sourceLabel})`,
      });
    }
    if (check.level === 'unknown') {
      return UI.callout({
        variant: 'warn',
        title: '판정에 필요한 정보가 부족해요',
        text: '안전하다는 뜻이 아니에요. 드시기 전 식당에 꼭 확인하세요.',
      });
    }
    return '';
  }

  // 성분 태그: 내 알레르기와 겹치면 "· 내 알레르기" 표시와 강조 색
  function buildIngredientSection(result) {
    const mine = getMyAllergies();
    const rows = [];
    if (result.allergens.length) {
      const tags = result.allergens.map((a) => UI.allergenTag(a.no, 'confirmed', { mine: mine.includes(a.no) })).join('');
      rows.push(UI.tagRow('확정', tags));
    }
    if (result.possibleFromName.length) {
      const tags = result.possibleFromName
        .map((a) => (mine.includes(a.no) ? UI.allergenTag(a.no, 'may', { mine: true }) : UI.allergenTag(a.no, 'may-other')))
        .join('');
      rows.push(UI.tagRow('포함 가능', tags));
    }
    if (!rows.length) {
      rows.push('<p class="search-detail__empty">표시된 성분이 없어요. 안전하다는 뜻은 아니에요.</p>');
    }
    return `<section><h3 class="search-detail__heading">성분</h3>${rows.join('')}</section>`;
  }

  // 상세 시트 본문: 경고, 내 알레르기 판정, 성분, 출처·날짜
  function buildDetailBody(menu) {
    const result = menu.result;
    const dates = menu.entry.dates || [];
    const rows = [buildAlert(result), buildJudgeSection(result), buildIngredientSection(result)];
    rows.push(UI.infoRow('출처', result.sourceLabel));
    rows.push(UI.infoRow('제공된 날', dates.length ? dates.map(formatDate).join(', ') + ' ' + menu.entry.category : '날짜 정보 없음'));
    if (dataDate) rows.push(UI.infoRow('자료 정리일', dataDate));
    if (result.note) rows.push(UI.infoRow('영양사 참고', result.note));
    return rows.filter(Boolean).join('');
  }

  // 위쪽 칩: 식당, 제공된 날짜와 끼니
  function buildMeta(menu) {
    const dates = menu.entry.dates || [];
    const when = dates.length ? `${formatDate(dates[0])} ${menu.entry.category}` : menu.entry.category;
    return ['신공학관', when].filter(Boolean);
  }

  // 검색 결과 클릭 시 상세 시트 열기
  resultsSlot.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-menu-id]');
    if (!btn) return;
    const menu = currentMenus.find((m) => m.id === btn.dataset.menuId);
    if (!menu) return;
    UI.openSheet({
      meta: buildMeta(menu),
      title: menu.name,
      body: buildDetailBody(menu),
      actions: UI.button({ label: '닫기', variant: 'primary', attrs: { 'data-sheet-close': true } }),
      footnote: '‘확인된 충돌 없음’을 포함해 어떤 표시도 알레르기 안전을 보장하지 않습니다. 심한 알레르기가 있다면 드시기 전 식당에 확인하세요.',
    });
  });

  // 설정 화면에서 내 알레르기를 바꾸면 판정도 다시 계산
  document.addEventListener('sm:allergens-changed', () => {
    currentMenus = currentMenus.map((m) => buildMenu(index, m.entry));
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
    dataDate = String(dietitian.generated_at || '').slice(0, 10);
    currentMenus = dietitian.menus.map((m) => buildMenu(index, m));
    renderList(filterMenus(inputSlot.value));
  }).catch(() => {
    resultsSlot.innerHTML = UI.callout({
      variant: 'warn',
      title: '자료를 불러오지 못했어요',
      text: '파일을 더블클릭해서 연 경우 자료를 읽을 수 없어요. VS Code의 Live Server로 열어 주세요.',
    });
  });
})();
