/**
 * SafeMeal 공통 UI 컴포넌트
 * ---------------------------------------------------------------
 * 불러오는 순서 (모든 페이지 공통, </body> 바로 위):
 *   <script src="js/icons.js"></script>
 *   <script src="js/constants.js"></script>
 *   <script src="js/ui.js"></script>
 *   <script src="js/(내 페이지).js"></script>
 *
 * 규칙
 *  - UI.xxx() 함수는 "HTML 문자열"을 돌려줘요. → el.innerHTML = UI.xxx(...)
 *  - 사용자가 누르는 동작은 아래 이벤트로 알려줘요. 페이지 JS에서 addEventListener로 받으세요.
 *      'sm:segment'       세그먼트 선택 바뀜   detail: { name, value }
 *      'sm:date'          날짜 선택 바뀜       detail: { date }
 *      'sm:week'          이전/다음 주 화살표  detail: { dir: -1 | 1 }
 *      'sm:open-settings' 헤더 '설정' 버튼     detail: {}
 *  - 메뉴 클릭은 data-menu-id 속성으로 찾으면 돼요. (components.html 예시 참고)
 */
(function () {
  const SM = window.SM;
  const ICONS = window.SM_ICONS || {};

  /* ---------------- 도우미 ---------------- */

  /** 텍스트를 HTML에 넣기 전에 꼭 거치기 (메뉴 이름 등 외부 데이터) */
  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** {a:1, b:'x'} → ' a="1" b="x"' */
  function attrs(obj = {}) {
    return Object.entries(obj)
      .filter(([, v]) => v !== undefined && v !== null && v !== false)
      .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
      .join('');
  }

  function emit(target, name, detail) {
    target.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }

  /* ---------------- 기본 요소 ---------------- */

  /** 아이콘 SVG. UI.icon('search', 16) */
  function icon(name, size = 16, className = '') {
    const body = ICONS[name];
    if (!body) {
      console.warn(`[UI.icon] 없는 아이콘: ${name}`);
      return '';
    }
    return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  /**
   * 버튼
   * UI.button({ label: '저장하기', variant: 'primary' | 'secondary' | 'danger',
   *             icon: 'trash', size: 'md' | 'lg', block: false, href, attrs: { id: 'save' } })
   */
  function button({ label, variant = 'secondary', icon: iconName, size = 'md', block = false, href, attrs: extra = {} } = {}) {
    const cls = ['btn', `btn--${variant}`, size === 'lg' && 'btn--lg', block && 'btn--block'].filter(Boolean).join(' ');
    const inner = `${iconName ? icon(iconName, 16) : ''}<span>${esc(label)}</span>`;
    if (href) return `<a class="${cls}" href="${esc(href)}"${attrs(extra)}>${inner}</a>`;
    return `<button type="button" class="${cls}"${attrs(extra)}>${inner}</button>`;
  }

  /** 아이콘만 있는 버튼 (닫기 등). label은 스크린리더용 */
  function iconButton({ icon: iconName, label, attrs: extra = {} }) {
    return `<button type="button" class="icon-btn" aria-label="${esc(label)}"${attrs(extra)}>${icon(iconName, 18)}</button>`;
  }

  /** 중립 칩. UI.chip('진선미관') */
  function chip(text) {
    return `<span class="chip">${esc(text)}</span>`;
  }

  /* ---------------- 판정 표시 ---------------- */

  /**
   * 판정 배지
   * UI.statusBadge('may')                        → "⚠ 포함 가능"
   * UI.statusBadge('may', { detail: '대두' })    → "⚠ 포함 가능 · 대두"
   * UI.statusBadge('contains', { count: 2 })     → "⊗ 포함 2"
   */
  function statusBadge(status, { detail, count } = {}) {
    const s = SM.STATUS[status];
    if (!s) return '';
    let text = s.label;
    if (detail) text += ` · ${detail}`;
    if (count !== undefined) text += ` ${count}`;
    return `<span class="status-badge status-badge--${status}">${icon(s.icon, 14)}<span>${esc(text)}</span></span>`;
  }

  /** 상태 4가지 범례 (식단 화면 상단) */
  function statusLegend() {
    return `<div class="status-legend" aria-label="표시 상태">${SM.STATUS_ORDER.map((k) => statusBadge(k)).join('')}</div>`;
  }

  /**
   * 성분 태그
   * UI.allergenTag(10, 'confirmed')   → 빨간 "⑩ 돼지고기"
   * UI.allergenTag(5, 'may', { mine: true }) → "⑤ 대두 · 내 알레르기"
   * UI.allergenTag(6, 'may-other')    → 점선 "⑥ 밀"
   */
  function allergenTag(id, type = 'confirmed', { mine = false } = {}) {
    const text = SM.allergenLabel(id) + (mine ? ' · 내 알레르기' : '');
    return `<span class="allergen-tag allergen-tag--${type}">${esc(text)}</span>`;
  }

  /* ---------------- 선택 컨트롤 ---------------- */

  /**
   * 세그먼트 (식당 / 중식·석식)
   * UI.segmented({ name: 'cafeteria', value: 'jinsunmi',
   *                options: [{ value: 'jinsunmi', label: '진선미관' }, ...] })
   * 선택이 바뀌면 'sm:segment' 이벤트 { name, value }
   */
  function segmented({ name, options, value, label }) {
    const items = options
      .map((o) => {
        const on = o.value === value;
        return `<button type="button" class="segmented__option" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-value="${esc(o.value)}">${esc(o.label)}</button>`;
      })
      .join('');
    return `<div class="segmented" role="radiogroup" data-segmented="${esc(name)}"${label ? ` aria-label="${esc(label)}"` : ''}>${items}</div>`;
  }

  /**
   * 주간 날짜 선택
   * UI.dateStrip({
   *   selected: '2026-11-04',
   *   days: [{ date: '2026-11-02', dow: '월', day: 2, hasData: true }, ...],
   *   canPrev: true, canNext: true,
   * })
   * 날짜 클릭 → 'sm:date' { date }, 화살표 → 'sm:week' { dir }
   */
  function dateStrip({ days, selected, canPrev = true, canNext = true }) {
    const dayBtns = days
      .map((d) => {
        const on = d.date === selected;
        const bottom = d.hasData
          ? '<span class="date-strip__dot" aria-hidden="true"></span>'
          : '<span class="date-strip__empty">자료 없음</span>';
        const sr = `${d.dow}요일 ${d.day}일${d.hasData ? '' : ', 자료 없음'}`;
        return `<button type="button" class="date-strip__day" aria-pressed="${on}" aria-label="${esc(sr)}" data-date="${esc(d.date)}">
          <span class="date-strip__dow">${esc(d.dow)}</span>
          <span class="date-strip__num">${esc(d.day)}</span>${bottom}
        </button>`;
      })
      .join('');
    return `<div class="date-strip">
      <button type="button" class="date-strip__nav" data-week="-1" aria-label="이전 주"${canPrev ? '' : ' disabled'}>${icon('chevron-left', 18)}</button>
      ${dayBtns}
      <button type="button" class="date-strip__nav" data-week="1" aria-label="다음 주"${canNext ? '' : ' disabled'}>${icon('chevron-right', 18)}</button>
    </div>`;
  }

  /**
   * 알레르기 선택 타일 (설정 화면)
   * UI.checkTile({ id: 5, checked: true }) → <label> 안에 진짜 checkbox (name="allergen", value="5")
   * UI.checkGrid([5, 9]) → 19종 전체를 2열로
   */
  function checkTile({ id, checked = false, name = 'allergen' }) {
    return `<label class="check-tile">
      <input type="checkbox" name="${esc(name)}" value="${esc(id)}"${checked ? ' checked' : ''}>
      <span class="check-tile__box" aria-hidden="true">${icon('check', 14)}</span>
      <span>${esc(SM.allergenLabel(id))}</span>
    </label>`;
  }

  function checkGrid(selectedIds = [], name = 'allergen') {
    const set = new Set(selectedIds.map(Number));
    return `<div class="check-grid">${SM.ALLERGENS.map((a) => checkTile({ id: a.id, checked: set.has(a.id), name })).join('')}</div>`;
  }

  /* ---------------- 식단 ---------------- */

  /**
   * 메뉴 한 줄
   * UI.menuItem({ id: 'm-123', name: '꿔바로우', desc: '확정 ⑩ · 가능 ⑤⑥',
   *               status: 'may', statusDetail: '대두' })
   */
  function menuItem({ id, name, desc, status, statusDetail }) {
    return `<button type="button" class="menu-item" data-menu-id="${esc(id)}">
      <span class="menu-item__text">
        <span class="menu-item__name">${esc(name)}</span>
        ${desc ? `<span class="menu-item__desc">${esc(desc)}</span>` : ''}
      </span>
      ${status ? statusBadge(status, { detail: statusDetail }) : ''}
      ${icon('chevron-right', 16, 'menu-item__chevron')}
    </button>`;
  }

  /**
   * 끼니 카드 (중식/석식)
   * UI.mealCard({ title: '중식', items: [menuItem 옵션들...], tabbed: false })
   * - 상단 요약 배지(포함 1, 포함 가능 3 …)는 items의 status를 세서 자동으로 만들어요.
   * - tabbed: true 이면 모바일에서 제목을 숨겨요 (중식/석식 세그먼트로 고를 때)
   */
  function mealCard({ title, items = [], tabbed = false, emptyText = '이 끼니는 자료가 없습니다.' }) {
    const counts = {};
    items.forEach((it) => { if (it.status) counts[it.status] = (counts[it.status] || 0) + 1; });
    const summary = SM.STATUS_ORDER.filter((k) => counts[k]).map((k) => statusBadge(k, { count: counts[k] })).join('');
    const list = items.length
      ? `<div class="meal-card__list">${items.map(menuItem).join('')}</div>`
      : `<p class="meal-card__empty">${esc(emptyText)}</p>`;
    return `<section class="meal-card${tabbed ? ' meal-card--tabbed' : ''}" aria-label="${esc(title)}">
      <div class="meal-card__head">
        <h2 class="meal-card__title">${esc(title)}</h2>
        ${summary ? `<div class="meal-card__summary">${summary}</div>` : ''}
      </div>
      ${list}
    </section>`;
  }

  /* ---------------- 안내 박스 ---------------- */

  const CALLOUT_ICON = { info: 'info', warn: 'status-may', danger: 'status-contains', brand: 'sliders', note: 'lock' };

  /**
   * 안내 박스
   * UI.callout({ variant: 'info' | 'warn' | 'danger' | 'brand' | 'note',
   *              title: '출처 · …', text: '…', icon: 'info', action: UI.button({...}) })
   * - text/title 안에 <b>를 쓰고 싶으면 html: true (직접 쓴 문장일 때만!)
   */
  function callout({ variant = 'info', title, text, icon: iconName, action, html = false }) {
    const t = (s) => (html ? s : esc(s));
    const size = variant === 'note' ? 16 : 22;
    return `<div class="callout callout--${variant}"${variant === 'danger' || variant === 'warn' ? ' role="alert"' : ''}>
      ${icon(iconName || CALLOUT_ICON[variant], size, 'callout__icon')}
      <div class="callout__body">
        ${title ? `<p class="callout__title">${t(title)}</p>` : ''}
        ${text ? `<p class="callout__text">${t(text)}</p>` : ''}
      </div>
      ${action ? `<div class="callout__action">${action}</div>` : ''}
    </div>`;
  }

  /* ---------------- 상세 화면용 행 ---------------- */

  /** "⑤ 대두 | 포함 가능 목록에 있음 | [포함 가능]" */
  function judgeRow({ allergenId, desc, status }) {
    return `<div class="judge-row">
      <span class="judge-row__name">${esc(SM.allergenLabel(allergenId))}</span>
      <span class="judge-row__desc">${esc(desc)}</span>
      ${statusBadge(status)}
    </div>`;
  }

  /** "출처 | 진선미관 조리계획서 …" */
  function infoRow(label, value) {
    return `<div class="info-row"><span class="info-row__label">${esc(label)}</span><span>${esc(value)}</span></div>`;
  }

  /** "확정 | [⑩ 돼지고기]" — tagsHtml은 UI.allergenTag(...)를 이어 붙인 문자열 */
  function tagRow(label, tagsHtml) {
    return `<div class="tag-row"><span class="tag-row__label">${esc(label)}</span><div class="tag-row__tags">${tagsHtml}</div></div>`;
  }

  /* ---------------- 모달 / 바텀시트 / 패널 ---------------- */

  /**
   * 시트 열기: 데스크톱은 가운데 모달, 모바일(≤768px)은 바텀시트로 자동 전환
   * const sheet = UI.openSheet({
   *   meta: ['진선미관', '11월 4일 (수) 중식'],   // 위쪽 칩
   *   title: '꿔바로우',
   *   body: '...HTML...',
   *   actions: UI.button({ label: '닫기', variant: 'primary', attrs: { 'data-sheet-close': true } }),
   *   footnote: '‘확인된 충돌 없음’을 포함해 …',
   *   variant: 'modal' | 'panel',   // panel = 오른쪽에서 나오는 설정 패널
   *   onClose: () => {},
   * });
   * sheet.close();
   * - data-sheet-close 속성이 있는 요소를 누르거나, 바깥 클릭, Esc로 닫혀요.
   */
  function openSheet({ meta = [], title, body = '', actions = '', footnote, variant = 'modal', onClose } = {}) {
    const prevFocus = document.activeElement;
    const titleId = `sheet-title-${Date.now()}`;
    const overlay = document.createElement('div');
    overlay.className = `sheet-overlay${variant === 'panel' ? ' sheet-overlay--panel' : ''}`;
    overlay.innerHTML = `
      <div class="sheet${variant === 'panel' ? ' sheet--panel' : ''}" role="dialog" aria-modal="true"${title ? ` aria-labelledby="${titleId}"` : ''}>
        <span class="sheet__handle" aria-hidden="true"></span>
        <span class="sheet__close">${iconButton({ icon: 'close', label: '닫기', attrs: { 'data-sheet-close': true } })}</span>
        ${meta.length ? `<div class="sheet__meta">${meta.map(chip).join('')}</div>` : ''}
        ${title ? `<h2 class="sheet__title" id="${titleId}">${esc(title)}</h2>` : ''}
        <div class="sheet__body">
          ${body}
          ${actions ? `<div class="sheet__actions">${actions}</div>` : ''}
          ${footnote ? `<p class="sheet__footnote">${esc(footnote)}</p>` : ''}
        </div>
      </div>`;

    const dialog = overlay.querySelector('.sheet');

    function close() {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      if (!document.querySelector('.sheet-overlay')) document.body.classList.remove('is-sheet-open');
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (onClose) onClose();
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        // 포커스가 시트 밖으로 나가지 않게
        const f = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const visible = [...f].filter((el) => el.offsetParent !== null && !el.disabled);
        if (!visible.length) return;
        const first = visible[0];
        const last = visible[visible.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-sheet-close]')) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    document.body.classList.add('is-sheet-open');

    const firstFocus = [...dialog.querySelectorAll('button, [href], input')].find((el) => el.offsetParent !== null);
    (firstFocus || dialog).focus();

    return { el: dialog, close };
  }

  /* ---------------- 헤더 / 푸터 / 탭바 ---------------- */

  function header(active) {
    const nav = SM.PAGES.map(
      (p) => `<a class="site-nav__link" href="${p.href}"${p.key === active ? ' aria-current="page"' : ''}>${esc(p.label)}</a>`
    ).join('');
    return `<header class="site-header">
      <div class="container site-header__inner">
        <a class="brand" href="index.html">
          <span class="brand__mark">${icon('soup', 20)}</span>
          <span>Ewha SafeMeal</span>
        </a>
        <nav class="site-nav" aria-label="주요 메뉴">${nav}</nav>
        <div class="site-header__right">
          <div class="my-allergens" hidden>
            <span class="my-allergens__label">내 알레르기</span>
            <div class="my-allergens__list" data-my-allergens></div>
          </div>
          ${button({ label: '설정', icon: 'sliders', attrs: { 'data-open-settings': true } })}
          <button type="button" class="settings-compact" data-open-settings aria-label="내 알레르기 설정">
            ${icon('sliders', 16)}<span data-my-allergens-compact>설정</span>
          </button>
        </div>
      </div>
    </header>`;
  }

  function footer() {
    return `<footer class="site-footer">
      <div class="container site-footer__inner">
        <p>영양사 검토 전 자료가 포함되어 있으며 알레르기 안전을 보장하지 않습니다. 드시기 전 식당에 꼭 확인하세요.</p>
        <p>Ewha SafeMeal · 팀 6sp</p>
      </div>
    </footer>`;
  }

  function tabbar(active) {
    const items = SM.PAGES.map(
      (p) => `<a class="tabbar__item" href="${p.href}"${p.key === active ? ' aria-current="page"' : ''}>${icon(p.icon, 22)}<span>${esc(p.mobileLabel)}</span></a>`
    ).join('');
    return `<nav class="tabbar" aria-label="하단 메뉴">${items}</nav>`;
  }

  /**
   * 헤더·푸터·모바일 탭바를 한 번에 붙이기 (모든 페이지 맨 처음에 호출)
   * UI.mountLayout({ active: 'menu' | 'search' | 'guide' })
   */
  function mountLayout({ active } = {}) {
    document.body.insertAdjacentHTML('afterbegin', header(active));
    document.body.insertAdjacentHTML('beforeend', footer() + tabbar(active));
  }

  /**
   * 헤더의 "내 알레르기" 칩 갱신 (설정 저장 후 호출)
   * UI.setHeaderAllergens([5, 9])
   */
  function setHeaderAllergens(ids = []) {
    const wrap = document.querySelector('.my-allergens');
    const list = document.querySelector('[data-my-allergens]');
    const compact = document.querySelector('[data-my-allergens-compact]');
    if (list) list.innerHTML = ids.map((id) => chip(SM.allergenLabel(id))).join('');
    if (wrap) wrap.hidden = ids.length === 0;
    if (compact) compact.textContent = ids.length ? ids.map(SM.circled).join('') : '설정';
  }

  /* ---------------- 공통 동작 (이벤트 위임) ---------------- */

  document.addEventListener('click', (e) => {
    const seg = e.target.closest('.segmented__option');
    if (seg) {
      const group = seg.closest('[data-segmented]');
      group.querySelectorAll('.segmented__option').forEach((b) => {
        const on = b === seg;
        b.setAttribute('aria-checked', on);
        b.tabIndex = on ? 0 : -1;
      });
      emit(group, 'sm:segment', { name: group.dataset.segmented, value: seg.dataset.value });
      return;
    }

    const day = e.target.closest('.date-strip__day');
    if (day) {
      day.closest('.date-strip').querySelectorAll('.date-strip__day').forEach((b) => b.setAttribute('aria-pressed', b === day));
      emit(day, 'sm:date', { date: day.dataset.date });
      return;
    }

    const week = e.target.closest('[data-week]');
    if (week) {
      emit(week, 'sm:week', { dir: Number(week.dataset.week) });
      return;
    }

    if (e.target.closest('[data-open-settings]')) {
      emit(document, 'sm:open-settings', {});
    }
  });

  // 세그먼트: 좌우 화살표 키로 이동
  document.addEventListener('keydown', (e) => {
    const seg = e.target.closest && e.target.closest('.segmented__option');
    if (!seg || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const opts = [...seg.parentElement.querySelectorAll('.segmented__option')];
    const next = opts[(opts.indexOf(seg) + (e.key === 'ArrowRight' ? 1 : -1) + opts.length) % opts.length];
    next.focus();
    next.click();
  });

  window.UI = {
    esc, icon, button, iconButton, chip,
    statusBadge, statusLegend, allergenTag,
    segmented, dateStrip, checkTile, checkGrid,
    menuItem, mealCard, callout,
    judgeRow, infoRow, tagRow,
    openSheet, mountLayout, setHeaderAllergens,
  };
})();
