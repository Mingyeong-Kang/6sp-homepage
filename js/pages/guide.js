/*
 * 자료 안내 화면 (Figma 07)
 * 담당: 이채은
 * 사용: js/ui.js (UI), js/constants.js (SM)
 */
(function () {
  'use strict';

  // key는 SM.STATUS와 같게
  const STATUS_DESC = {
    contains: '내 알레르기가 메뉴의 ‘확정’ 성분 목록에 있습니다. 재료 자체가 표시 대상인 경우입니다 (예: 두부 → ⑤ 대두).',
    may: '‘포함 가능’ 목록에 있습니다. 소스·양념·가공품이라 실제 제품 성분표를 확인하지 못한 경우입니다.',
    unknown: '목록에는 없지만, 메뉴가 성분표와 연결되지 않았거나 확인이 끝나지 않은 재료가 있습니다.',
    clear: '목록에도 없고 모든 재료가 판정되었습니다. 그래도 알레르기 안전을 보장하지는 않습니다.',
  };

  document.getElementById('guide-warning').innerHTML = UI.callout({
    variant: 'danger',
    title: 'SafeMeal은 알레르기 안전을 보장하지 않습니다',
    text: '정보가 없다는 이유로 안전한 메뉴로 표시하지 않습니다. 심한 알레르기가 있다면 드시기 전 반드시 식당에 확인하세요.',
  });

  document.getElementById('guide-status-list').innerHTML = SM.STATUS_ORDER
    .map((key) => `<li class="status-list__row">
        <div class="status-list__badge">${UI.statusBadge(key)}</div>
        <p class="status-list__desc">${UI.esc(STATUS_DESC[key])}</p>
      </li>`)
    .join('');

  document.getElementById('guide-allergens').innerHTML = SM.ALLERGENS
    .map((a) => UI.chip(SM.allergenLabel(a.id)))
    .join('');
})();
