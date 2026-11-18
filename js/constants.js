/**
 * SafeMeal 공통 상수
 * - 알레르기 19종, 판정 상태, 식당, 페이지 목록을 한곳에서 관리해요.
 * - 설정 화면 체크박스 / allergen-map.json의 키 / 화면 표시가 모두 이 이름을 따라야 비교가 됩니다.
 */
window.SM = window.SM || {};

/** 식약처 알레르기 유발물질 표시 대상 19종 (Figma 설정 화면 기준 이름) */
SM.ALLERGENS = [
  { id: 1,  name: '난류' },
  { id: 2,  name: '우유' },
  { id: 3,  name: '메밀' },
  { id: 4,  name: '땅콩' },
  { id: 5,  name: '대두' },
  { id: 6,  name: '밀' },
  { id: 7,  name: '고등어' },
  { id: 8,  name: '게' },
  { id: 9,  name: '새우' },
  { id: 10, name: '돼지고기' },
  { id: 11, name: '복숭아' },
  { id: 12, name: '토마토' },
  { id: 13, name: '아황산류' },
  { id: 14, name: '호두' },
  { id: 15, name: '닭고기' },
  { id: 16, name: '쇠고기' },
  { id: 17, name: '오징어' },
  { id: 18, name: '조개류' },
  { id: 19, name: '잣' },
];

/** ①~⑲ 원문자 */
SM.circled = (n) => String.fromCharCode(0x2460 + n - 1);

/** id → "⑤ 대두" */
SM.allergenLabel = (id) => {
  const a = SM.ALLERGENS.find((x) => x.id === Number(id));
  return a ? `${SM.circled(a.id)} ${a.name}` : String(id);
};

/**
 * 판정 상태 4가지. 데이터에서는 key(영문)로, 화면에서는 label로 씁니다.
 *  contains : 내 알레르기 성분이 확정 목록에 있음
 *  may      : 포함 가능 목록에 있음 (가공품 등)
 *  unknown  : 판정에 필요한 정보가 부족함
 *  clear    : 확인된 충돌 없음 (안전 보장 아님!)
 */
SM.STATUS = {
  contains: { label: '포함',             icon: 'status-contains' },
  may:      { label: '포함 가능',        icon: 'status-may' },
  unknown:  { label: '정보 부족',        icon: 'status-unknown' },
  clear:    { label: '확인된 충돌 없음', icon: 'status-clear' },
};
SM.STATUS_ORDER = ['contains', 'may', 'unknown', 'clear'];

/** 식당 */
SM.CAFETERIAS = [
  { id: 'jinsunmi', name: '진선미관' },
  { id: 'engineering', name: '신공학관' },
];

/** 페이지 (헤더/탭바 공통). key는 UI.mountLayout({ active })에 넘기는 값 */
SM.PAGES = [
  { key: 'menu',   label: '식단',      mobileLabel: '식단',      href: 'index.html',  icon: 'calendar' },
  { key: 'search', label: '메뉴 검색', mobileLabel: '검색',      href: 'search.html', icon: 'search' },
  { key: 'guide',  label: '자료 안내', mobileLabel: '자료 안내', href: 'guide.html',  icon: 'file-text' },
];
