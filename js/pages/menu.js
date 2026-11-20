/*
 * 식단 목록 화면 (Figma 03) + 자료 없음 화면 (Figma 04)
 * 담당: 이수빈
 * 사용: js/ui.js (UI), js/constants.js (SM)
 */
(function () {
  'use strict';

  // ---- 화면의 빈 자리 (index.html에 만들어 둔 곳) ----
  const cafeteriaSlot = document.getElementById('menu-cafeteria'); // 식당 버튼 자리
  const bodySlot = document.getElementById('menu-body');           // 본문 자리

  // ---- 메모장: 지금 사용자가 무엇을 골랐는지 기억 ----
  const state = {
    cafeteria: 'engineering', // 처음엔 신공학관 (진선미관은 준비 중)
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

  // 내 알레르기 mock (서진님 localStorage 형식이 정해지면 교체)
  const MY_ALLERGIES = ['대두', '우유'];

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

  // [그리기 2] 본문 (4단계: 임시로 고른 식당 이름만 보여 줌 → 6·7단계에서 메뉴 카드로 바꿀 예정)
  function renderBody() {
    const cafe = SM.CAFETERIAS.find((c) => c.id === state.cafeteria);
    if (state.cafeteria === 'engineering') {
      bodySlot.innerHTML = `<p>선택한 식당: <b>${UI.esc(cafe.name)}</b> (여기에 메뉴 카드가 나올 예정)</p>`;
    } else {
      bodySlot.innerHTML = `<p>선택한 식당: <b>${UI.esc(cafe.name)}</b> (준비 중 화면이 나올 예정)</p>`;
    }
  }

  // [신호 받기] 식당 버튼을 누르면 → 메모장 고치기 → 본문 다시 그리기
  cafeteriaSlot.addEventListener('sm:segment', (e) => {
    if (e.detail.name !== 'cafeteria') return; // 다른 세그먼트 신호면 무시
    state.cafeteria = e.detail.value;
    renderBody();
  });

  // [처음 한 번] 페이지가 열리면 그리기
  renderCafeteria();
  renderBody();

  // 3단계 확인용: 이번 주 모든 메뉴를 기계에 넣어 보고 표로 보여 주기 (확인 끝나면 지울 예정)
  const testRows = [];
  MOCK_WEEKLY.days.forEach((day) => {
    day.menus.forEach((menuName) => {
      const result = mockFind(menuName);
      const check = mockCheckMenu(result, MY_ALLERGIES);
      testRows.push({
        날짜: day.date,
        메뉴: menuName,
        판정: check.level,
        걸린것: check.hits.map((a) => a.name).join(', '),
        출처: result.sourceLabel,
      });
    });
  });
  console.table(testRows);

})();
