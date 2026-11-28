/*
 * 자료 안내 화면 (Figma 07)
 * 담당: 이채은
 * 사용: js/ui.js (UI), js/constants.js (SM)
 */
(function () {
  'use strict';

  // key는 SM.STATUS와 같게
  const STATUS_DESC = {
    contains: '내 알레르기가 들어 있다고 판단된 경우입니다. 영양사 자료에 있거나, 여러 표준 레시피에 공통으로 들어 있거나, 메뉴 이름에 재료가 드러난 경우입니다 (예: 두부 → ⑤ 대두). 출처는 메뉴마다 함께 표시됩니다.',
    may: '들어 있을 수 있는 경우입니다. 소스·양념·가공품이라 실제 제품 성분표를 확인하지 못했거나, 일부 표준 레시피에만 들어 있습니다.',
    unknown: '목록에는 없지만, 메뉴가 성분표와 연결되지 않았거나 확인이 끝나지 않은 재료가 있습니다.',
    clear: '확인한 자료 범위에서는 내 알레르기가 나오지 않은 경우입니다. 소스·양념·가공품 성분은 빠져 있을 수 있어, 알레르기 안전을 보장하지 않습니다.',
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
