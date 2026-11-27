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
  const summarySlot = document.getElementById('search-summary');
  const chipsSlot = document.getElementById('search-chips');
  const guideSlot = document.getElementById('search-guide');

  // checkMenu()의 판정(danger/caution/unknown/ok) → 화면 배지 상태(contains/may/unknown/clear)
  const LEVEL_TO_STATUS = { danger: 'contains', caution: 'may', unknown: 'unknown', ok: 'clear' };

  let currentMenus = [];
  let cafeteria = 'all'; // 식당 칩: 'all' 또는 SM.CAFETERIAS의 id
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

  // 결과 한 줄 설명: 식당 · 제공된 날, 확정/가능 성분 번호
  function buildDesc(entry, result) {
    const dates = entry.dates || [];
    const where = dates.length
      ? `신공학관 · ${formatDate(dates[0])} ${entry.category}`
      : `신공학관 ${entry.category} · 날짜 정보 없음`;
    const nums = (list) => list.map((a) => SM.circled(a.no)).join('');
    const parts = [];
    if (result.allergens.length) parts.push(`확정 ${nums(result.allergens)}`);
    if (result.possibleFromName.length) parts.push(`가능 ${nums(result.possibleFromName)}`);
    if (!parts.length) parts.push('표시된 성분 없음');
    return [where, ...parts].join(' · ');
  }

  function buildMenu(index, entry) {
    const result = index.find(entry.name);
    const mine = getMyAllergies();
    const check = checkMenu(result, mine);
    return {
      id: entry.name,
      name: entry.name,
      key: normalizeMenuName(entry.name),
      cafeteria: 'engineering', // 지금은 신공학관 영양사 성분표만 있음. 다른 식당 자료가 생기면 여기서 구분
      desc: buildDesc(entry, result),
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
    const chosen = SM.CAFETERIAS.find((c) => c.id === cafeteria);
    // 선택한 식당의 자료가 아직 하나도 없으면 "검색 결과 없음"이 아니라 "준비 중" 안내 (식단 화면과 같은 문구)
    if (chosen && !currentMenus.some((m) => m.cafeteria === cafeteria)) {
      return UI.callout({
        variant: 'info',
        title: `${chosen.name} 자료는 준비 중입니다`,
        text: `지금은 신공학관 자료만 검색할 수 있어요. ${chosen.name}은 영양사님 자료를 받으면 추가할 예정이에요.`,
      });
    }
    return UI.callout({
      variant: 'info',
      title: q ? `‘${q}’ 검색 결과가 없어요` : '검색할 수 있는 메뉴가 없어요',
      text: '영양사 성분표에 없는 메뉴일 수 있어요. 자료에 없다고 해서 알레르기 성분이 없다는 뜻은 아니니, 드시기 전 식당에 꼭 확인하세요.',
    });
  }

  // 검색어 요약 줄: 결과 개수와 판정 기준(내 알레르기)
  function renderSummary(count) {
    const q = inputSlot.value.trim();
    const mine = SM.ALLERGENS.filter((a) => getMyAllergies().includes(a.id));
    const basis = mine.length ? ` · 판정 기준: ${mine.map((a) => SM.allergenLabel(a.id)).join(', ')}` : '';
    summarySlot.textContent = (q ? `‘${q}’${josaWaGwa(q)} 비슷한 메뉴 ${count}개` : `전체 메뉴 ${count}개`) + basis;
  }

  // 식당 칩: 검색어에 맞는 메뉴의 식당별 개수를 같이 보여 줌
  function renderChips(matched) {
    const options = [{ id: 'all', name: '전체' }, ...SM.CAFETERIAS];
    // innerHTML로 다시 그리면 키보드 포커스가 사라지므로, 그리기 전에 포커스 있던 칩을 기억했다가 돌려 줌
    const focused = chipsSlot.contains(document.activeElement) ? document.activeElement.dataset.cafeteria : null;
    chipsSlot.innerHTML = options.map((c) => {
      const count = c.id === 'all' ? matched.length : matched.filter((m) => m.cafeteria === c.id).length;
      return `<button type="button" class="search-chip" data-cafeteria="${UI.esc(c.id)}" aria-pressed="${c.id === cafeteria}">${UI.esc(c.name)} <span class="search-chip__count">${count}</span></button>`;
    }).join('');
    if (focused) chipsSlot.querySelector(`[data-cafeteria="${focused}"]`)?.focus();
  }

  // 검색어 → 식당 칩 → 목록 순서로 한 번에 다시 그리기
  function refresh() {
    const matched = filterMenus(inputSlot.value);
    renderChips(matched);
    renderList(cafeteria === 'all' ? matched : matched.filter((m) => m.cafeteria === cafeteria));
  }

  function renderList(menus) {
    renderSummary(menus.length);
    resultsSlot.innerHTML = menus.length
      ? `<div class="search-results__list">${menus.map((m) => UI.menuItem(m)).join('')}</div>`
      : renderEmpty();
  }

  // 메뉴 이름 안에서 검색어와 가장 비슷한 부분까지의 글자 차이 수 (글자 바뀜·빠짐·끼어듦을 1로 셈)
  // 예: "제욱볶음"은 "제육볶음" 안에서 1 차이
  function editDistanceInside(q, text) {
    let col = Array.from({ length: q.length + 1 }, (_, i) => i);
    let best = col[q.length];
    for (const ch of text) {
      const next = [0];
      for (let i = 1; i <= q.length; i++) {
        next[i] = Math.min(col[i] + 1, next[i - 1] + 1, col[i - 1] + (q[i - 1] === ch ? 0 : 1));
      }
      col = next;
      best = Math.min(best, col[q.length]);
    }
    return best;
  }

  // 메뉴 이름 검색 (입력할 때마다 바로 반영)
  // 띄어쓰기·기호·표기 차이(돈가스/돈까스)는 무시하고, 못 찾으면 글자가 조금 다른 메뉴(오타)를 보여 줌
  function filterMenus(query) {
    const q = normalizeMenuName(query);
    if (!q) return currentMenus;
    const rank = (m) => (m.key === q ? 0 : m.key.startsWith(q) ? 1 : 2);
    const hits = currentMenus.filter((m) => m.key.includes(q)).sort((a, b) => rank(a) - rank(b));
    if (hits.length || q.length < 3) return hits;
    const maxEdit = q.length >= 6 ? 2 : 1;
    return currentMenus
      .map((m) => ({ m, dist: editDistanceInside(q, m.key) }))
      .filter((x) => x.dist <= maxEdit)
      .sort((a, b) => a.dist - b.dist)
      .map((x) => x.m);
  }

  // 받침 유무에 따라 "와/과" 선택
  function josaWaGwa(word) {
    const last = word.charCodeAt(word.length - 1);
    const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
    return hasBatchim ? '과' : '와';
  }

  inputSlot.addEventListener('input', refresh);

  chipsSlot.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cafeteria]');
    if (!chip) return;
    cafeteria = chip.dataset.cafeteria;
    refresh();
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
    refresh();
  });

  renderNotice();

  inputSlot.parentElement.insertAdjacentHTML('afterbegin', `<span class="search-box__icon" aria-hidden="true">${UI.icon('search', 18)}</span>`);
  guideSlot.innerHTML = UI.callout({
    variant: 'info',
    title: '검색은 이름이 비슷한 메뉴를 찾는 기능입니다',
    text: '알레르기 판정은 검색과 별개로, 메뉴에 연결된 성분 번호가 정확히 일치하는지로만 정합니다.',
  });

  let index = null;

  // 404 같은 서버 오류도 실패로 처리 (r.ok 확인 없이 json()을 부르면 오류 원인이 가려짐)
  const getJson = (url) => fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} (${r.status})`);
    return r.json();
  });

  Promise.all([
    getJson('data/dietitian-allergens.json'),
    getJson('data/recipe-allergens.min.json'),
    getJson('data/allergen_rules.json'),
  ]).then(([dietitian, recipes, rules]) => {
    index = createAllergenIndex(dietitian, recipes, rules);
    // 검색 대상: 영양사 성분표의 학식 메뉴 전체 (weekly-menu.json이 올라오면 이번 주 메뉴로 교체 검토)
    dataDate = String(dietitian.generated_at || '').slice(0, 10);
    currentMenus = dietitian.menus.map((m) => buildMenu(index, m));
    refresh();
  }).catch(() => {
    resultsSlot.innerHTML = UI.callout({
      variant: 'warn',
      title: '자료를 불러오지 못했어요',
      text: '잠시 후 다시 시도해 주세요. (로컬에서는 파일을 더블클릭하지 말고 Live Server로 열어 주세요)',
    });
  });
})();
