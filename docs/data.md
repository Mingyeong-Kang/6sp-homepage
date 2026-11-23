# 알레르기 데이터 (데이터 담당: 이채은)

학식 메뉴의 알레르기를 **두 가지 출처**로 찾아요.

| 순서 | 출처 | 파일 | 신뢰도 |
|---|---|---|---|
| ① | **영양사 알레르기 성분표** (학식 기준) | `data/dietitian-allergens.json` | 높음 |
| ② | **식약처 Open API 레시피 DB** (표준 레시피 기준 추정) | `data/recipe-allergens.json` | 중간~낮음 |
| ③ | 둘 다 없으면 메뉴 이름만 보고 추정, 그것도 없으면 "정보 없음" | – | 낮음 |

```
[영양사 엑셀] ──▶ build_dietitian.py ──▶ data/dietitian-allergens.json ─┐
                                                                      ├─▶ lookup.js ──▶ 화면
[식약처 Open API] ──▶ build_recipes.py ──▶ data/recipe-allergens.json ─┘   (①→②→③ 순서로 찾기)
                       (매주 자동 실행)
```

알레르기 이름과 번호는 학교 급식 표시번호와 같아요.
①난류 ②우유 ③메밀 ④땅콩 ⑤대두 ⑥밀 ⑦고등어 ⑧게 ⑨새우 ⑩돼지고기 ⑪복숭아 ⑫토마토 ⑬아황산류 ⑭호두 ⑮닭고기 ⑯쇠고기 ⑰오징어 ⑱조개류 ⑲잣
(법정 22종은 조개류를 굴·전복·홍합·조개류 4개로 나눠 센 숫자예요.)

## 파일 구성
| 파일 | 역할 |
|---|---|
| `scripts/build_recipes.py` | 식약처 API 호출 → 재료 정리 → 알레르기 판정 → `recipe-allergens.json`(전체, 확인용) + `recipe-allergens.min.json`(화면용, 약 100KB) |
| `scripts/build_dietitian.py` | 영양사 엑셀 → `dietitian-allergens.json` |
| `data/allergen_rules.json` | 재료 → 알레르기 키워드 규칙 (코드 몰라도 수정 가능) |
| `js/lookup.js` | 메뉴 이름을 넣으면 ①→②→③ 순서로 알레르기를 찾아주는 함수 |
| `data/source/` | 영양사 엑셀 원본 |
| `.github/workflows/update-recipes.yml` | 매주 월요일 03:00(KST) 레시피 데이터 자동 갱신 |
| `.env.example`, `.gitignore` | 인증키 보호 |

## 1. 레시피 데이터 만들기 (식약처 API)
1. `.env.example`을 복사해 `.env`로 바꾸고 인증키 입력: `FOODSAFETY_API_KEY=내인증키`
2. `python scripts/build_recipes.py`

자동 갱신은 결과가 이상하면(0개, 일부만 받음, 지난번보다 10% 넘게 줄어듦) 파일을 덮어쓰지 않고 실패해요. 정말 줄어든 게 맞으면 `FORCE_UPDATE=1`로 실행하세요. API는 https를 먼저 시도하고, 안 되면 http로 연결하면서 로그에 경고를 남겨요.

GitHub에서는 **Settings → Secrets and variables → Actions**에 `FOODSAFETY_API_KEY`를 등록하면 매주 자동으로 실행돼요. (**Actions** 탭 → **Run workflow**로 수동 실행도 가능)

## 2. 영양사 데이터 만들기
1. 처음 한 번: `pip install openpyxl`
2. 엑셀을 `data/source/` 폴더에 넣고 `scripts/build_dietitian.py` 맨 위의 `SOURCE_FILES`에 **최신 파일을 맨 앞에** 적기
3. `python scripts/build_dietitian.py`

- 같은 메뉴가 여러 파일에 있으면 **앞에 적힌(최신) 파일**을 써요.
- 알레르기 글자와 표시번호(①~⑲)가 다르면 둘 다 반영하고 알려줘요.
- 메뉴 이름에 보이는 재료가 성분표에 없으면(예: 콩나물인데 대두 없음) 확인하라고 알려줘요.
- 영양사 자료는 새 엑셀을 받았을 때만 직접 실행해요. (자동 실행 아님)

## 3. 화면에서 쓰기 (data.js 담당)
```html
<script src="js/lookup.js"></script>
<script>
  async function loadAllergenIndex() {
    const [dietitian, recipes, rules] = await Promise.all([
      fetch("data/dietitian-allergens.json").then(r => r.json()),
      fetch("data/recipe-allergens.min.json").then(r => r.json()), // 화면용 가벼운 파일
      fetch("data/allergen_rules.json").then(r => r.json()),
    ]);
    return createAllergenIndex(dietitian, recipes, rules);
  }

  loadAllergenIndex().then(index => {
    const result = index.find("치즈돈까스");
    const check = checkMenu(result, [2, 5]); // 사용자가 설정한 알레르기 (번호 권장, ["우유", "대두"]도 가능)
    console.log(result.sourceLabel, result.allergens, check.level);
  });
</script>
```

### `find()` 결과
| 값 | 뜻 |
|---|---|
| `source` | `dietitian` / `recipe` / `combined` / `name` / `none` |
| `sourceLabel` | 화면에 보여줄 출처 문구 (예: "영양사 제공 (학식 기준)") |
| `allergens` | 들어 있는 알레르기 `[{no: 5, name: "대두"}, ...]` |
| `possibleFromName` | 들어 있을 **수도** 있는 알레르기 (주의 표시용) |
| `status` | `ok` / `none_estimated`(주요 알레르기 추정 안 됨) / `needs_check`(정보 부족) |
| `note` | 영양사 참고 사항 등 |

### `checkMenu()` 결과 → 화면 색
| level | 뜻 | 표시 예시 |
|---|---|---|
| `danger` | 내 알레르기가 들어 있음 | 🔴 대두 포함 |
| `caution` | 들어 있을 수 있음 | 🟠 대두 포함 가능 |
| `unknown` | 정보 부족. `reason`: `needs_check`(정보 없음) / `none_estimated`(영양사표 "없음" → `note`를 꼭 함께 표시) / `low_confidence`(비슷한 레시피로 추정) | ⚪ 정보 부족, 식당에 확인하세요 |
| `ok` | 알려진 범위에선 없음 | 🟢 (식당 확인 권장 문구 함께) |

⚠️ `unknown`을 절대 "안전"으로 표시하지 마세요.

### 알레르기 이름 규칙
- ①번 이름은 **"난류"**로 통일해요. 식약처 표시기준의 "알류(가금류만 해당)"와 같은 항목이에요. (`js/constants.js`의 `SM.ALLERGENS`와 같음)
- 사용자 설정은 **번호로 넘기는 걸 권장해요**: `checkMenu(result, [1, 5])`. 화면 이름이 바뀌어도 판정이 깨지지 않아요.
- 이름으로 넘겨도 돼요. `"① 난류"`, `"알류(가금류)"`, `"계란"`은 모두 `난류`로 읽어요.

## 알레르기 규칙 고치는 법 (`data/allergen_rules.json`)
- `keywords`: 이 글자가 재료 이름에 있으면 해당 알레르기
- `exclude`: 이 글자가 있으면 제외 (예: `땅콩호박`은 땅콩 아님)
- `review_keywords` / `review_exclude` / `always_review`: 사람 확인 목록 조절

**안전 원칙**: 헷갈리면 경고하는 쪽으로 판정해요. 알레르기를 놓치는 것보다 괜히 경고하는 게 나아요.

## 주의
- 인증키는 코드, 단톡방, 발표 자료에 넣지 않기
- 영양사 성분표 원본(`data/source/`)은 공개 허락을 받아 함께 올려요.
- 영양사 자료도 "주요 식재료 기준"이라 가공식품·소스 성분은 빠져 있을 수 있어요. 화면에 "식당 확인 권장" 문구를 꼭 넣어주세요.
