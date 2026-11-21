/**
 * Ewha SafeMeal - 메뉴 알레르기 찾기 (data.js에서 가져다 쓰는 함수)
 *
 * 찾는 순서
 *   ① 영양사 성분표 (학식 기준, 가장 정확)        → source: "dietitian"
 *   ② 식약처 레시피 DB (표준 레시피 기준 추정)     → source: "recipe"
 *   ③ "A·B"처럼 여러 메뉴가 붙어 있으면 나눠서 각각 ①② → source: "combined"
 *   ④ 아무 데도 없으면 메뉴 이름만 보고 추정, 그것도 없으면 정보 없음
 *                                                → source: "name" / "none"
 *
 * 사용 예시
 *   const [dietitian, recipes, rules] = await Promise.all([
 *     fetch("data/dietitian-allergens.json").then(r => r.json()),
 *     fetch("data/recipe-allergens.json").then(r => r.json()),
 *     fetch("data/allergen_rules.json").then(r => r.json()),
 *   ]);
 *   const allergenIndex = createAllergenIndex(dietitian, recipes, rules);
 *   const result = allergenIndex.find("치즈돈까스");
 *   // result.allergens → [{ no: 1, name: "난류" }, { no: 2, name: "우유" }, ...]
 *   // result.sourceLabel → "표준 레시피 기준 추정 ('돈가스')"
 *   // isDangerous(result, ["우유"]) → true
 */

// 표기가 흔들리는 단어를 하나로 맞춤 (돈까스/돈가스, 소세지/소시지 ...)
const SPELLING = [
  ["까스", "가스"], ["소세지", "소시지"], ["쏘세지", "소시지"], ["케찹", "케첩"],
  ["떡볶기", "떡볶이"], ["쭈꾸미", "주꾸미"], ["후라이", "프라이"],
];

function normalizeMenuName(name) {
  let s = String(name || "")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, "") // 괄호 안 설명 제거: 김치찌개(소) → 김치찌개
    .replace(/[\s·.,/&+*~!\-]/g, "")       // 띄어쓰기, 기호 제거
    .toLowerCase();
  for (const [from, to] of SPELLING) s = s.split(from).join(to);
  return s;
}

function splitMenuParts(name) {
  return String(name || "").split(/[·/&+,]|\s+&\s+/).map(p => p.trim()).filter(p => p.length >= 2);
}

function createAllergenIndex(dietitianData, recipeData, rules) {
  const nameToNo = Object.fromEntries(rules.rules.map(r => [r.allergen, r.no]));
  const toObjects = names =>
    [...new Set(names)]
      .filter(n => n in nameToNo)
      .sort((a, b) => nameToNo[a] - nameToNo[b])
      .map(n => ({ no: nameToNo[n], name: n }));

  // 메뉴 이름에서 보이는 알레르기 (예: "치즈" → 우유)
  function hintsFromName(name) {
    const found = [];
    for (const rule of rules.rules) {
      if (rule.exclude.some(ex => name.includes(ex))) continue;
      if (rule.keywords.some(kw => name.includes(kw))) found.push(rule.allergen);
    }
    return found;
  }

  const dietitianMap = new Map();
  for (const m of dietitianData.menus) dietitianMap.set(normalizeMenuName(m.name), m);

  const recipeMap = new Map();
  const recipeList = [];
  for (const r of recipeData.recipes) {
    const key = normalizeMenuName(r.name);
    if (key.length < 2 || recipeMap.has(key)) continue;
    recipeMap.set(key, r);
    recipeList.push({ key, recipe: r });
  }

  function fromDietitian(m) {
    const extra = hintsFromName(m.name).filter(a => !m.allergens.includes(a));
    return {
      source: "dietitian",
      sourceLabel: "영양사 제공 (학식 기준)",
      confidence: "high",
      matchedName: m.name,
      allergens: toObjects(m.allergens),
      possibleFromName: toObjects(extra), // 성분표엔 없지만 이름상 들어 있을 수 있음
      status: m.status, // ok / none_estimated / needs_check
      note: m.note || "",
    };
  }

  function fromRecipe(r, query, exact) {
    const usable = r.data_status !== "no_ingredients";
    const allergens = [...(usable ? r.allergens : []), ...hintsFromName(query)];
    return {
      source: "recipe",
      sourceLabel: exact ? "표준 레시피 기준 추정" : `표준 레시피 기준 추정 ('${r.name}')`,
      confidence: exact ? "medium" : "low",
      matchedName: r.name,
      allergens: toObjects(allergens),
      possibleFromName: [],
      status: usable ? "ok" : "needs_check",
      note: usable ? "실제 학식 재료와 다를 수 있어요." : "레시피에 재료 정보가 없어요.",
    };
  }

  // 비슷한 레시피 찾기
  //  - 레시피 이름이 메뉴 이름 안에 들어 있으면 가장 긴 것 하나 (예: "매콤닭갈비" ⊃ "닭갈비")
  //  - 메뉴 이름이 여러 레시피 이름 안에 들어 있으면 그 변형들을 모두 비교
  //    (예: "떡볶이" ⊂ "호두떡볶이", "궁중떡볶이" ...)
  //    → 모든 변형에 공통인 알레르기 = allergens, 일부에만 있는 것 = possible(주의)
  function fuzzyRecipe(query, key) {
    let best = null;
    for (const { key: rk, recipe } of recipeList) {
      if (rk.length >= 3 && key.includes(rk) && (!best || rk.length > best.key.length)) best = { key: rk, recipe };
    }
    if (best) return fromRecipe(best.recipe, query, false);

    if (key.length < 3) return null;
    const variants = recipeList
      .filter(({ key: rk, recipe }) => rk.includes(key) && recipe.data_status !== "no_ingredients")
      .map(x => x.recipe);
    if (!variants.length) return null;

    const sets = variants.map(v => new Set(v.allergens));
    const common = [...sets[0]].filter(a => sets.every(set => set.has(a)));
    const some = [...new Set(variants.flatMap(v => v.allergens))].filter(a => !common.includes(a));
    const names = variants.slice(0, 3).map(v => v.name).join(", ") + (variants.length > 3 ? " 등" : "");
    return {
      source: "recipe",
      sourceLabel: `표준 레시피 ${variants.length}개 기준 추정 (${names})`,
      confidence: "low",
      matchedName: names,
      allergens: toObjects([...common, ...hintsFromName(query)]),
      possibleFromName: toObjects(some), // 레시피에 따라 들어갈 수 있음 → '주의'
      status: "ok",
      note: "비슷한 레시피들로 추정했어요. 실제 학식 재료와 다를 수 있어요.",
    };
  }

  function findSingle(name, allowFuzzy) {
    const key = normalizeMenuName(name);
    if (dietitianMap.has(key)) return fromDietitian(dietitianMap.get(key));
    if (recipeMap.has(key)) return fromRecipe(recipeMap.get(key), name, true);
    return allowFuzzy ? fuzzyRecipe(name, key) : null;
  }

  function find(menuName) {
    const query = String(menuName || "").trim();

    // ①② 메뉴 이름 그대로
    const whole = findSingle(query, false);
    if (whole) return { query, ...whole };

    // ③ "카레춘권·칠리소스"처럼 여러 개가 붙어 있으면 나눠서 찾기
    const parts = splitMenuParts(query);
    if (parts.length > 1) {
      const results = parts.map(p => ({ part: p, result: findSingle(p, true) }));
      if (results.some(x => x.result)) {
        const all = results.flatMap(x => (x.result ? x.result.allergens.map(a => a.name) : hintsFromName(x.part)));
        const missing = results.filter(x => !x.result).map(x => x.part);
        const order = { high: 3, medium: 2, low: 1 };
        const lowest = results.filter(x => x.result).map(x => x.result.confidence)
          .sort((a, b) => order[a] - order[b])[0];
        return {
          query,
          source: "combined",
          sourceLabel: "여러 메뉴를 나눠서 찾은 결과",
          confidence: missing.length ? "low" : lowest,
          matchedName: results.map(x => (x.result ? x.result.matchedName : `${x.part}(정보 없음)`)).join(" + "),
          allergens: toObjects(all),
          possibleFromName: toObjects(results.flatMap(x => (x.result ? x.result.possibleFromName.map(a => a.name) : [])))
            .filter(a => !all.includes(a.name)),
          status: missing.length ? "needs_check" : "ok",
          note: missing.length ? `${missing.join(", ")}은(는) 정보가 없어요.` : "",
          parts: results,
        };
      }
    }

    // ② 비슷한 레시피 찾기
    const fuzzy = findSingle(query, true);
    if (fuzzy) return { query, ...fuzzy };

    // ④ 이름만 보고 추정
    const hints = hintsFromName(query);
    return {
      query,
      source: hints.length ? "name" : "none",
      sourceLabel: hints.length ? "메뉴 이름만 보고 추정" : "정보 없음",
      confidence: "low",
      matchedName: null,
      allergens: toObjects(hints),
      possibleFromName: [],
      status: "needs_check",
      note: "알레르기 정보가 부족해요. 식당에 꼭 확인하세요.",
    };
  }

  return { find };
}

/**
 * 사용자 알레르기와 겹치는지 확인 → 화면 표시 단계
 *   danger  : 내 알레르기가 들어 있음            (빨강)
 *   caution : 들어 있을 수 있음 (이름·변형 레시피)  (주황)
 *   unknown : 정보가 부족함 → '안전'이라고 하면 안 됨 (회색)
 *   ok      : 알려진 범위에서는 내 알레르기 없음      (초록, "식당 확인 권장" 문구 함께)
 */
function checkMenu(result, myAllergens) {
  const hits = result.allergens.filter(a => myAllergens.includes(a.name));
  if (hits.length) return { level: "danger", hits };
  const maybe = (result.possibleFromName || []).filter(a => myAllergens.includes(a.name));
  if (maybe.length) return { level: "caution", hits: maybe };
  if (result.status === "needs_check") return { level: "unknown", hits: [] };
  return { level: "ok", hits: [] };
}

// 브라우저(<script>)와 Node(테스트) 둘 다에서 쓸 수 있게
if (typeof module !== "undefined") module.exports = { createAllergenIndex, checkMenu, normalizeMenuName };
