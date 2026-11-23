(function () {
  const STORAGE_KEY = 'safemeal.allergenIds';

  function loadSelectedIds() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));

      if (!Array.isArray(stored)) return [];

      return SM.ALLERGENS
        .filter(function (allergen) {
          return stored.includes(allergen.id);
        })
        .map(function (allergen) {
          return allergen.id;
        });
    } catch (error) {
      return [];
    }
  }

  let selectedIds = loadSelectedIds();
  let activeSheet = null;

  UI.setHeaderAllergens(selectedIds);

  document.addEventListener('sm:open-settings', function () {
    if (activeSheet) return;

    const sheet = UI.openSheet({
      title: '내 알레르기 설정',
      variant: 'panel',

      body:
        '<p class="settings-description">' +
          '식약처 표시 대상 19종 중 피해야 하는 성분을 고르세요. ' +
          '<span data-selection-count aria-live="polite"></span>' +
        '</p>' +
        UI.checkGrid(selectedIds) +
        UI.callout({
          variant: 'note',
          text:
            '로그인 없이 이 기기의 이 브라우저에만 저장됩니다. ' +
            '다른 기기에서는 다시 설정해야 해요.'
        }) +
        '<p class="settings-note">' +
          '들깨·참깨·생선 등 19종 외 성분은 아직 설정할 수 없고, ' +
          '메뉴 상세에 참고로 표시됩니다.' +
        '</p>' +
        '<p class="settings-error" data-save-message role="alert" hidden></p>',

      actions:
        UI.button({
          label: '전체 삭제',
          variant: 'danger',
          icon: 'trash',
          attrs: { 'data-clear-allergens': true }
        }) +
        UI.button({
          label: '저장하기',
          variant: 'primary',
          attrs: { 'data-save-allergens': true }
        }),

      onClose: function () {
        activeSheet = null;
      }
    });

    activeSheet = sheet;
    sheet.el.classList.add('settings-panel');

    function updateSelectionCount() {
      const count = sheet.el.querySelectorAll(
        'input[name="allergen"]:checked'
      ).length;

      sheet.el.querySelector('[data-selection-count]').textContent =
        '선택 ' + count + '개';
    }

    updateSelectionCount();
    sheet.el.addEventListener('change', updateSelectionCount);

    sheet.el.addEventListener('click', function (event) {
      if (event.target.closest('[data-clear-allergens]')) {
        sheet.el
          .querySelectorAll('input[name="allergen"]')
          .forEach(function (checkbox) {
            checkbox.checked = false;
          });

        updateSelectionCount();
      }

      if (event.target.closest('[data-save-allergens]')) {
        const checked = sheet.el.querySelectorAll(
          'input[name="allergen"]:checked'
        );

        const nextIds = Array.from(checked, function (checkbox) {
          return Number(checkbox.value);
        });

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
        } catch (error) {
          const message = sheet.el.querySelector('[data-save-message]');
          message.textContent =
            '저장하지 못했어요. 브라우저의 저장 허용 설정을 확인하고 다시 시도해 주세요.';
          message.hidden = false;
          return;
        }

        selectedIds = nextIds;
        UI.setHeaderAllergens(selectedIds);

        document.dispatchEvent(
          new CustomEvent('sm:allergens-changed', {
            detail: { ids: selectedIds.slice() }
          })
        );

        sheet.close();
      }
    });
  });
})();