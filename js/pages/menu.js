/*
 * 식단 목록 화면 (Figma 03) + 자료 없음 화면 (Figma 04)
 * 담당: 이수빈
 * 사용: js/ui.js (UI), js/constants.js (SM)
 */
(function () {
  'use strict';

  // ---- Day.js 준비: 한국어로 바꾸고, 주(week) 계산 플러그인 끼우기 ----
  dayjs.locale('ko');
  dayjs.extend(window.dayjs_plugin_isoWeek);

  // ---- 화면의 빈 자리 (index.html에 만들어 둔 곳) ----
  const cafeteriaSlot = document.getElementById('menu-cafeteria'); // 식당 버튼 자리
  const titleSlot = document.getElementById('menu-title');         // 큰 날짜 제목 자리
  const weekSlot = document.getElementById('menu-week');           // "○월 ○일 주" 자리
  const datesSlot = document.getElementById('menu-dates');         // 날짜 띠 자리
  const bodySlot = document.getElementById('menu-body');           // 본문 자리

  // ---- 메모장: 지금 사용자가 무엇을 골랐는지 기억 ----
  const state = {
    cafeteria: 'engineering',  // 처음엔 신공학관 (진선미관은 준비 중)
    date: null,    // 기본 날짜는 메뉴 자료를 읽은 뒤 아래에서 지정
  };

  // 이번 주 메뉴 mock (채은님 weekly-menu.json 형식과 같게)
  // TODO: 채은님 파일이 올라오면 fetch로 바꾸기
  const MOCK_WEEKLY = {
    week: '2026-11-16 ~ 2026-11-20',
    cafeteria: '신공학관',
    days: [
      { date: '2026-11-16', meal: '중식', menus: ['묵은지순살찜닭', '쌀밥', '미역국', '감자고로케*케찹', '오이양파무침', '배추김치'] },
      { date: '2026-11-17', meal: '중식', menus: ['토마토스파게티&모닝빵', '잡곡밥', '김치 찌개(소)', '돈까스', '배추김치'] },
      { date: '2026-11-18', meal: '중식', menus: ['제육볶음', '쌀밥', '청국장찌개', '카레춘권·칠리소스', '오이양파무침'] },
      { date: '2026-11-19', meal: '중식', menus: ['뼈없는 갈비탕', '파채너비아니', '들기름막국수', '배추김치'] },
      // 11-20(금)은 04 '자료 없음' 화면 테스트용으로 일부러 넣지 않음
      // (자동 수집 데이터도 메뉴가 있는 날만 들어올 가능성이 높음)
    ],
  };

  // 설정 패널에서 저장한 알레르기 번호를 이름으로 변환
  function getMyAllergies() {
    try {
      const ids = JSON.parse(
        localStorage.getItem('safemeal.allergenIds')
      );

      if (!Array.isArray(ids)) return [];

      return SM.ALLERGENS
        .filter(function (allergen) {
          return ids.includes(allergen.id);
        })
        .map(function (allergen) {
          return allergen.name;
        });
    } catch (error) {
      return [];
    }
  }

  // 번호(1~19) → { no, name } 모양으로 바꿔 주는 도우미
  function toAllergen(no) {
    const found = SM.ALLERGENS.find((a) => a.id === no);
    return { no: no, name: found.name };
  }

  // 메뉴 이름 → find() 결과 mock (채은님 lookup.js가 오면 삭제)
  // ⚠️ 알레르기 내용은 테스트용 가짜예요. 실제 성분 아님!
  const MOCK_LOOKUP = {
    '제육볶음': {
      allergens: [5, 6, 10].map(toAllergen),
      possibleFromName: [],
      source: 'dietitian',
      sourceLabel: '영양사 제공 (학식 기준)',
      status: 'ok',
      note: '양념·고추장 등 실제 제품 확인',
    },
    '묵은지순살찜닭': {
      allergens: [],
      possibleFromName: [5, 6, 15].map(toAllergen),
      source: 'recipe',
      sourceLabel: '표준 레시피 기준 추정',
      status: 'ok',
      note: '',
    },
    '돈까스': {
      allergens: [1, 2, 5, 6, 10].map(toAllergen),
      possibleFromName: [],
      source: 'dietitian',
      sourceLabel: '영양사 제공 (학식 기준)',
      status: 'ok',
      note: '튀김옷·소스 실제 제품 확인',
    },
    '감자고로케*케찹': {
      allergens: [],
      possibleFromName: [2, 5, 6, 12].map(toAllergen),
      source: 'recipe',
      sourceLabel: '표준 레시피 기준 추정',
      status: 'ok',
      note: '',
    },
    '배추김치': {
      allergens: [],
      possibleFromName: [9].map(toAllergen),
      source: 'recipe',
      sourceLabel: '표준 레시피 기준 추정',
      status: 'ok',
      note: '',
    },
    '쌀밥': {
      allergens: [],
      possibleFromName: [],
      source: 'recipe',
      sourceLabel: '표준 레시피 기준 추정',
      status: 'none_estimated',
      note: '',
    },
    // 표에 없는 메뉴(토마토스파게티&모닝빵, 미역국 등)는 일부러 안 넣음
    // → 아래 mockFind에서 '정보 없음'으로 처리 (안전 규칙 1번 테스트)
  };

  // [찾기 기계] 메뉴 이름을 넣으면 재료표를 찾아 줌 (채은님 index.find 흉내)
  // 표에 없으면 '정보 없음' 카드를 돌려줌 → 절대 '안전'으로 보이면 안 됨
  function mockFind(menuName) {
    const found = MOCK_LOOKUP[menuName];
    if (found) {
      return found;
    }
    return {
      allergens: [],
      possibleFromName: [],
      source: 'none',
      sourceLabel: '정보 없음',
      status: 'needs_check',
      note: '',
    };
  }

  // [비교 기계] 재료표와 내 알레르기를 비교해서 판정 (채은님 checkMenu 흉내)
  // 위에서부터 순서대로 검사하고, 걸리면 바로 결과를 돌려줌
  function mockCheckMenu(result, myAllergies) {
    // 1) 확실히 들어 있는 것 중에 내 알레르기가 있나? → 위험
    const sure = result.allergens.filter((a) => myAllergies.includes(a.name));
    if (sure.length > 0) {
      return { level: 'danger', hits: sure };
    }
    // 2) 들어 있을 수도 있는 것 중에 내 알레르기가 있나? → 주의
    const maybe = result.possibleFromName.filter((a) => myAllergies.includes(a.name));
    if (maybe.length > 0) {
      return { level: 'caution', hits: maybe };
    }
    // 3) 정보가 없거나 추정이 안 되면 → 모름 (안전 아님!)
    if (result.source === 'none' || result.status !== 'ok') {
      return { level: 'unknown', hits: [] };
    }
    // 4) 알려진 범위에서는 없음 (그래도 안전 보장은 아님)
    return { level: 'ok', hits: [] };
  }

  // ================= 날짜 계산 (Day.js) =================

  // [날짜 1] 처음 보여 줄 날짜: 오늘. 토요일이면 +2일, 일요일이면 +1일 → 다음 월요일
  function getDefaultDate() {
    let today = dayjs().startOf('day');
    if (today.day() === 6) today = today.add(2, 'day');
    if (today.day() === 0) today = today.add(1, 'day');
    const todayText = today.format('YYYY-MM-DD');

    const dates = getDataDates();
    if (dates.length === 0 || dates.includes(todayText)) return todayText;

    let nearest = dates[0];
    for (const d of dates) {
      const gap = Math.abs(dayjs(d).diff(today, 'day'));          // 오늘과 며칠 차이?
      const bestGap = Math.abs(dayjs(nearest).diff(today, 'day'));
      if (gap < bestGap) nearest = d;                             // 더 가까우면 바꾸기
    }
    return nearest;
  }

  // [날짜 2] 그 날짜에 메뉴가 있나? (메뉴판에서 같은 날짜를 찾아봄)
  function hasMenuOn(date) {
    return MOCK_WEEKLY.days.some((d) => d.date === date && d.menus.length > 0);
  }

  // [날짜 2-1] 메뉴가 있는 날짜들만 모아서 순서대로 (예: ['2026-11-16', …, '2026-11-19'])
  function getDataDates() {
    return MOCK_WEEKLY.days
      .filter((d) => d.menus.length > 0)
      .map((d) => d.date)
      .sort();
  }

  // [날짜 3] 고른 날짜가 들어 있는 주의 월요일
  function getMonday(date) {
    return dayjs(date).isoWeekday(1);
  }

  // [날짜 4] 날짜 띠에 넣을 월~금 5칸 만들기
  function buildWeekDays(date) {
    const monday = getMonday(date);
    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = monday.add(i, 'day');
      days.push({
        date: d.format('YYYY-MM-DD'), // "2026-11-16"
        dow: d.format('dd'),          // "월"
        day: d.date(),                // 16
        hasData: hasMenuOn(d.format('YYYY-MM-DD')),
      });
    }
    return days;
  }

  // ================= 메뉴 한 줄 만들기 =================

  // [바꾸기 표] 비교 기계의 판정(level) → 화면 스티커 이름(status)
  const LEVEL_TO_STATUS = {
    danger: 'contains', // 🔴 포함
    caution: 'may',     // 🟠 포함 가능
    unknown: 'unknown', // ⚪ 정보 부족
    ok: 'clear',        // 🟢 확인된 충돌 없음
  };

  // [메뉴 1] 알레르기 목록 → "⑤⑥⑮" 같은 동그라미 숫자 글자
  function circledList(list) {
    return list.map((a) => SM.circled(a.no)).join('');
  }

  // [메뉴 2] 메뉴 이름 아래 작은 설명줄 만들기
  // 예: "확정 ⑤⑥⑩ · 영양사 제공 (학식 기준)", "가능 ⑤⑥⑮ · 표준 레시피 기준 추정"
  function buildDesc(result) {
    const parts = [];
    if (result.allergens.length > 0) {
      parts.push('확정 ' + circledList(result.allergens));
    }
    if (result.possibleFromName.length > 0) {
      parts.push('가능 ' + circledList(result.possibleFromName));
    }
    if (result.status === 'none_estimated') {
      parts.push('주요 19종 추정 불가');
    }
    parts.push(result.sourceLabel); // 출처는 항상 넣기 (안전 규칙 2번)
    if (result.note) {
      parts.push('참고: ' + result.note); // 영양사 참고 사항 (예: "육수 확인") - 안전에 중요
    }
    return parts.join(' · ');
  }

  // [메뉴 3] 메뉴 이름 하나 → UI.menuItem이 원하는 모양으로 바꾸기
  function toMenuItem(menuName, index) {
    const result = mockFind(menuName);
    const myAllergies = getMyAllergies();
    const check = mockCheckMenu(result, myAllergies);

    return {
      id: state.date + '-' + index,
      name: menuName,
      desc: buildDesc(result),
      status: myAllergies.length
        ? LEVEL_TO_STATUS[check.level]
        : undefined,
      statusDetail: check.hits.map(function (allergen) {
        return allergen.name;
      }).join(', ')
    };
  }

  // ================= 화면 그리기 =================

  // [그리기 1] 식당 선택 버튼 (진선미관 / 신공학관)
  function renderCafeteria() {
    cafeteriaSlot.innerHTML = UI.segmented({
      name: 'cafeteria',
      label: '식당 선택',
      value: state.cafeteria,
      options: SM.CAFETERIAS.map((c) => ({ value: c.id, label: c.name })),
    });
  }

  // [그리기 2] 큰 날짜 제목 + "○월 ○일 주" + 날짜 띠
  function renderDates() {
    titleSlot.textContent = dayjs(state.date).format('M월 D일 (dd)');          // "11월 20일 (금)"
    weekSlot.textContent = getMonday(state.date).format('YYYY년 M월 D일 주');  // "2026년 11월 16일 주"
    datesSlot.innerHTML = UI.dateStrip({
      days: buildWeekDays(state.date),
      selected: state.date,
      canPrev: true, // 이전 주 화살표 켜기
      canNext: true, // 다음 주 화살표 켜기
    });
  }

  // [그리기 3] 메뉴 영역: 범례 + 끼니 카드 (Figma 03)
  function renderUnconfiguredMenu(menuName, index) {
    const result = mockFind(menuName);
    const labels = [];

    if (result.allergens.length > 0) {
      labels.push('확정 ' + circledList(result.allergens));
    }

    if (result.possibleFromName.length > 0) {
      labels.push('가능 ' + circledList(result.possibleFromName));
    }

    if (result.status === 'needs_check') {
      labels.push('정보 부족');
    }

    const badgeText = labels.length
      ? labels.join(' · ')
      : '확인된 성분 정보 없음';

    const id = state.date + '-' + index;

    return `
      <button
        type="button"
        class="menu-item"
        data-menu-id="${UI.esc(id)}"
      >
        <span class="menu-item__text">
          <span class="menu-item__name">${UI.esc(menuName)}</span>
          <span class="menu-item__desc">
            ${UI.esc(buildDesc(result))}
          </span>
        </span>
        <span class="settings-ingredient-badge">
          ${UI.esc(badgeText)}
        </span>
        ${UI.icon('chevron-right', 16, 'menu-item__chevron')}
      </button>
    `;
  }
  function renderMenus() {
    const day = MOCK_WEEKLY.days.find(function (day) {
      return day.date === state.date;
    });

    if (getMyAllergies().length === 0) {
      return `
        <div class="meal-grid">
          <section class="meal-card" aria-label="${UI.esc(day.meal)}">
            <div class="meal-card__head">
              <h2 class="meal-card__title">${UI.esc(day.meal)}</h2>
            </div>

            <p class="settings-menu-guide">
              설정 전에는 성분 번호를 보여드려요.
              내 알레르기를 설정하면 메뉴별 일치 여부를 확인할 수 있어요.
            </p>

            <div class="meal-card__list">
              ${day.menus.map(renderUnconfiguredMenu).join('')}
            </div>
          </section>
        </div>
      `;
    }

    const items = day.menus.map(toMenuItem);

    return `
      <div class="menu-legend">${UI.statusLegend()}</div>
      <div class="meal-grid">
        ${UI.mealCard({ title: day.meal, items: items })}
      </div>
    `;
  }
  // [빈 상태 틀] 점선 박스 (Figma 04). 공통 컴포넌트에 없어서 직접 만듦
  // textHtml은 내가 만든 문장만 넣기 (메뉴 이름 같은 외부 글자는 UI.esc 거쳐서)
  function emptyState({ icon, title, textHtml, actions, hint }) {
    return `
      <section class="menu-empty">
        <div class="menu-empty__icon">${UI.icon(icon, 30)}</div>
        <h2 class="menu-empty__title">${UI.esc(title)}</h2>
        <p class="menu-empty__text">${textHtml}</p>
        <div class="menu-empty__actions">${actions}</div>
      </section>
      <p class="menu-empty__hint">${UI.esc(hint)}</p>`;
  }

  // [그리기 4] 메뉴 없는 날 (Figma 04)
  function renderNoData() {
    const dates = getDataDates();

    // 자료 날짜가 하나도 없으면 "마지막 자료" 안내를 할 수 없음
    // (dayjs(undefined)는 오늘 날짜가 돼서 "마지막 자료는 오늘"이라는 틀린 안내가 나오기 때문)
    if (dates.length === 0) {
      return emptyState({
        icon: 'calendar',
        title: '아직 받은 식단 자료가 없습니다',
        textHtml: 'SafeMeal은 영양사님께 받은 자료가 있는 날짜만 보여드려요. 자료를 받으면 날짜별 메뉴를 보여드릴게요.',
        actions: UI.button({ label: '메뉴 이름으로 찾기', icon: 'search', href: 'search.html' }),
        hint: '날짜 아래 점(•)이 있는 날만 자료가 있습니다.',
      });
    }

    const last = dates[dates.length - 1];  // 가장 마지막 자료 날짜
    const lastText = dayjs(last).format('M월 D일 (dd)');
    return emptyState({
      icon: 'calendar', // TODO: 민경님이 calendar-x 추가하면 바꾸기
      title: '이 날짜는 자료를 확보하지 못했습니다',
      textHtml: `SafeMeal은 영양사님께 받은 자료가 있는 날짜만 보여드려요. 신공학관의 마지막 자료는 <b>${UI.esc(lastText)}</b>입니다.`,
      actions:
        UI.button({ label: dayjs(last).format('M월 D일') + ' 식단 보기', variant: 'primary', icon: 'calendar', attrs: { 'data-goto-date': last } }) +
        UI.button({ label: '메뉴 이름으로 찾기', icon: 'search', href: 'search.html' }),
      hint: '날짜 아래 점(•)이 있는 날만 자료가 있습니다. 신공학관 자료 기간: ' +
        dayjs(dates[0]).format('YYYY년 M월 D일') + ' ~ ' + dayjs(last).format('M월 D일'),
    });
  }

  // [그리기 5] 진선미관 준비 중 (04와 같은 틀, 문구만 다름)
  function renderPreparing() {
    return emptyState({
      icon: 'info', // TODO: 민경님이 construction 추가하면 바꾸기
      title: '진선미관 자료는 준비 중입니다',
      textHtml: '지금은 신공학관 식단만 제공해요. 진선미관은 영양사님 자료를 받으면 추가할 예정이에요.',
      actions:
        UI.button({ label: '신공학관 식단 보기', variant: 'primary', icon: 'calendar', attrs: { 'data-goto-cafeteria': 'engineering' } }) +
        UI.button({ label: '메뉴 이름으로 찾기', icon: 'search', href: 'search.html' }),
      hint: '진선미관 메뉴는 메뉴 검색에서도 아직 나오지 않을 수 있어요.',
    });
  }

  // [그리기 6] 본문: 상황에 따라 세 갈래 중 하나
  function renderBody() {
    const notice = document.getElementById('allergy-settings-notice');

    notice.innerHTML = getMyAllergies().length
      ? ''
      : UI.callout({
          variant: 'brand',
          title: '내 알레르기를 설정하면 메뉴마다 포함 여부를 알려드려요',
          text:
            '식약처 표시 대상 19종 중에서 고르면 됩니다. ' +
            '로그인 없이 이 기기 브라우저에만 저장됩니다.',
          action: UI.button({
            label: '알레르기 설정하기',
            variant: 'primary',
            icon: 'sliders',
            attrs: { 'data-open-settings': true }
          })
        });

    if (state.cafeteria !== 'engineering') {
      bodySlot.innerHTML = renderPreparing();
    } else if (hasMenuOn(state.date)) {
      bodySlot.innerHTML = renderMenus();
    } else {
      bodySlot.innerHTML = renderNoData();
    }
  }

  // [신호 받기 1] 식당 버튼을 누르면 → 메모장 고치기 → 본문 다시 그리기
  cafeteriaSlot.addEventListener('sm:segment', (e) => {
    if (e.detail.name !== 'cafeteria') return; // 다른 세그먼트 신호면 무시
    state.cafeteria = e.detail.value;
    renderBody();
  });

  // [신호 받기 2] 날짜 칸을 누르면 → 메모장 고치기 → 날짜·본문 다시 그리기
  datesSlot.addEventListener('sm:date', (e) => {
    state.date = e.detail.date;
    renderDates();
    renderBody();
  });

  // [신호 받기 2-1] 이전·다음 주 화살표 → 같은 요일로 한 주 이동
  // e.detail.dir: 이전 주면 -1, 다음 주면 1
  datesSlot.addEventListener('sm:week', (e) => {
    state.date = dayjs(state.date).add(e.detail.dir, 'week').format('YYYY-MM-DD');
    renderDates();
    renderBody();
  });

  // [신호 받기 3] 빈 상태 박스 안 버튼 누르기
  bodySlot.addEventListener('click', (e) => {
    const gotoDate = e.target.closest('[data-goto-date]');           // "○월 ○일 식단 보기"
    if (gotoDate) {
      state.date = gotoDate.dataset.gotoDate;
      renderDates();
      renderBody();
      return;
    }
    const gotoCafe = e.target.closest('[data-goto-cafeteria]');      // "신공학관 식단 보기"
    if (gotoCafe) {
      state.cafeteria = gotoCafe.dataset.gotoCafeteria;
      renderCafeteria(); // 위쪽 식당 버튼 색도 바꿔야 하니까 다시 그리기
      renderBody();
    }
  });

  document.addEventListener('sm:allergens-changed', function () {
    renderBody();
  });
  // [처음 한 번] 기본 날짜를 정하고 화면 그리기
  state.date = getDefaultDate();
  renderCafeteria();
  renderDates();
  renderBody();


})();
