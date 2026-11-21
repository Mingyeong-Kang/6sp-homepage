"""
Ewha SafeMeal - 레시피 수집 + 알레르기 판정 스크립트

하는 일
  1. 식약처(식품안전나라) '조리식품의 레시피 DB' Open API(COOKRCP01)를 호출해 레시피 전체를 받는다
  2. 레시피마다 메뉴명과 재료만 뽑아 정리한다
  3. allergen_rules.json 규칙으로 재료별 알레르기를 판정한다
  4. 결과를 data/recipe-allergens.json 에 저장한다 (매번 새로 만들어 덮어씀)

실행 방법
  python build_recipes.py

인증키
  - 내 컴퓨터: 같은 폴더의 .env 파일에  FOODSAFETY_API_KEY=내인증키  한 줄을 적어 둔다
  - GitHub Actions: 저장소 Settings > Secrets 에 FOODSAFETY_API_KEY 로 등록한다
  - 인증키는 절대 코드나 GitHub에 직접 올리지 않는다
"""

import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent  # 저장소 최상위 폴더
RULES_PATH = BASE_DIR / "data" / "allergen_rules.json"
OUTPUT_PATH = BASE_DIR / "data" / "recipe-allergens.json"

SERVICE_ID = "COOKRCP01"
PAGE_SIZE = 1000  # 이 API는 한 번에 최대 1000개까지 받을 수 있음
API_URL = "http://openapi.foodsafetykorea.go.kr/api/{key}/{service}/json/{start}/{end}"


# ---------------------------------------------------------------
# 0. 인증키 읽기
# ---------------------------------------------------------------
def load_api_key() -> str:
    """환경변수 → .env 파일 순서로 인증키를 찾는다."""
    key = os.environ.get("FOODSAFETY_API_KEY", "").strip()
    if key:
        return key

    env_path = BASE_DIR / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("FOODSAFETY_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")

    sys.exit("❌ 인증키가 없어요. .env 파일에 FOODSAFETY_API_KEY=인증키 를 적어 주세요.")


# ---------------------------------------------------------------
# 1. API 호출
# ---------------------------------------------------------------
def call_api(key: str, start: int, end: int) -> dict:
    """레시피 start~end번을 요청해서 COOKRCP01 부분을 돌려준다."""
    url = API_URL.format(key=urllib.parse.quote(key), service=SERVICE_ID, start=start, end=end)

    for attempt in range(1, 4):  # 서버가 잠깐 불안정할 수 있어서 최대 3번 시도
        try:
            with urllib.request.urlopen(url, timeout=60) as res:
                body = json.loads(res.read().decode("utf-8"))
            break
        except Exception as e:
            if attempt == 3:
                sys.exit(f"❌ API 호출 실패 ({start}~{end}): {e}")
            print(f"   ⚠️ 호출 실패, {attempt * 5}초 뒤 다시 시도: {e}")
            time.sleep(attempt * 5)

    data = body.get(SERVICE_ID)
    if data is None:
        # 인증키 오류 등은 최상위에 RESULT만 오는 경우가 있음
        result = body.get("RESULT", {})
        sys.exit(f"❌ API 오류: {result.get('CODE')} {result.get('MSG')}")

    code = data.get("RESULT", {}).get("CODE", "")
    if code not in ("INFO-000", "INFO-200"):  # 000 = 정상, 200 = 데이터 없음
        sys.exit(f"❌ API 오류: {code} {data['RESULT'].get('MSG')}")
    return data


def fetch_all_recipes(key: str) -> list:
    """total_count를 먼저 확인하고 1000개씩 나눠서 전부 받는다."""
    first = call_api(key, 1, 1)
    total = int(first.get("total_count", 0))
    print(f"📦 전체 레시피 수: {total}개")

    recipes = []
    for start in range(1, total + 1, PAGE_SIZE):
        end = min(start + PAGE_SIZE - 1, total)
        print(f"   ↳ {start}~{end}번 받는 중...")
        page = call_api(key, start, end)
        recipes.extend(page.get("row", []))
        time.sleep(1)  # 서버에 부담 주지 않게 잠깐 쉬기
    return recipes


# ---------------------------------------------------------------
# 2. 재료 문자열 정리
#    예) "재료 닭가슴살(60g), 애호박(30g)\n육수 다시마(5g)"
#        → ["닭가슴살", "애호박", "다시마"]
# ---------------------------------------------------------------
UNITS = (r"(?:kg|g|mg|ml|mL|L|cc|개|큰술|작은술|컵|장|쪽|줌|모|톨|대|마리|조각|cm|T|t|"
         r"스푼|숟가락|봉지|팩|캔|알|송이|뿌리|포기|잎|토막)")
SECTION_LABEL = re.compile(
    r"^\s*(필수\s*재료|주\s*재료|부\s*재료|육수\s*재료|양념\s*재료|소스\s*재료|"
    r"재료|육수|양념장|양념|소스|고명|드레싱|반죽|속재료|토핑)\s*[:：]?\s+"
)
# "레몬소스 설탕", "고기완자양념 생강즙"처럼 '○○소스/양념/드레싱 + 띄어쓰기'로 시작하면 앞부분은 이름표
NAMED_LABEL = re.compile(r"^\S*(소스|드레싱|양념장|양념|육수|밑간|무침양념|반죽|토핑)\s+(?=[가-힣A-Za-z])")
COLON_LABEL = re.compile(r"^[^,]{0,20}?[:：]\s*")
QUANTITY = re.compile(r"\s*[\d½¼¾/.\-~]+\s*" + UNITS + r"?\s*$")
VAGUE_AMOUNT = re.compile(r"\s*(약간|적당량|조금|소량|적량|약간씩)\s*$")


def parse_ingredients(raw: str, menu_name: str = "") -> list:
    if not raw:
        return []

    text = re.sub(r"<[^>]*>?", ",", raw)                       # <br> 같은 HTML 태그
    text = re.sub(r"[•·●○■□▶◆◇★☆\n]", ",", text)              # 글머리표, 줄바꿈
    text = re.sub(r"[①-⑳]", "", text)                          # ① ② 같은 번호
    text = text.replace(">", ":")                               # "크림치즈 > 우유" → 이름표
    text = re.sub(r"\([^)]*\)|\[[^\]]*\]", "", text)        # 괄호 안 양·설명
    text = re.sub(r"(\d)\s*-\s*", r"\1,", text)                # "3g - 양념 :" 처럼 이어진 것
    # "닭가슴살 100g  밑간양념:요구르트"처럼 쉼표 없이 이어진 경우 양 표시 뒤에서 자르기
    text = re.sub(r"(\d(?:\.\d+)?\s*" + UNITS + r")\s+", r"\1,", text)
    text = re.sub(r"(약간|적당량)(?=\S)", r"\1,", text)        # "소금적당량달걀흰자"
    if menu_name:
        text = text.replace(menu_name, ",")

    items = []
    for piece in re.split(r"[,，/]|\s{2,}", text):
        piece = re.sub(r"\(.*$", "", piece)                 # 닫히지 않은 괄호 "후춧가루("
        piece = SECTION_LABEL.sub("", piece).strip()
        piece = COLON_LABEL.sub("", piece).strip()
        piece = NAMED_LABEL.sub("", piece).strip()
        piece = QUANTITY.sub("", piece)
        piece = VAGUE_AMOUNT.sub("", piece)
        piece = re.sub(r"^l(?=[가-힣])", "", piece.strip(" :-."))
        if len(piece) < 1 or piece.isdigit() or len(piece) > 25:
            continue  # 비었거나, 숫자뿐이거나, 조리 설명 문장이 섞인 경우 제외
        if piece not in items:
            items.append(piece)
    return items


# ---------------------------------------------------------------
# 3. 알레르기 판정
# ---------------------------------------------------------------
def load_rules() -> dict:
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


def detect_allergens(ingredient: str, rules: dict) -> list:
    found = []
    for rule in rules["rules"]:
        if any(ex in ingredient for ex in rule["exclude"]):
            continue
        if any(kw in ingredient for kw in rule["keywords"]):
            found.append(rule["allergen"])
    return found


def needs_review(ingredient: str, hits: list, rules: dict) -> bool:
    if any(ex in ingredient for ex in rules.get("review_exclude", [])):
        return False  # 다시마육수, 만두피처럼 확인할 필요 없는 재료
    if any(kw in ingredient for kw in rules.get("always_review", [])):
        return True   # 카레·어묵·만두처럼 제품마다 성분이 다른 재료
    if hits:
        return False
    return any(kw in ingredient for kw in rules["review_keywords"])


def build_entry(row: dict, rules: dict) -> dict:
    name = (row.get("RCP_NM") or "").strip()
    raw = row.get("RCP_PARTS_DTLS", "") or ""
    ingredients = parse_ingredients(raw, name)

    allergens, by_ingredient, review = [], {}, []
    for ing in ingredients:
        hits = detect_allergens(ing, rules)
        if hits:
            by_ingredient[ing] = hits
            for a in hits:
                if a not in allergens:
                    allergens.append(a)
        if needs_review(ing, hits, rules):
            review.append(ing)

    entry = {
        "id": row.get("RCP_SEQ"),
        "name": name,
        "category": row.get("RCP_PAT2"),
        "ingredients": ingredients,
        "allergens": allergens,
        "allergen_by_ingredient": by_ingredient,
        "needs_review": review,
        # ok = 재료 정보 있음 / no_ingredients = 식약처 원본에 재료 정보가 없음
        # 화면에서는 no_ingredients를 '안전'이 아니라 '정보 없음'으로 보여줘야 함
        "data_status": "ok" if ingredients else "no_ingredients",
    }
    if not ingredients:
        entry["raw_ingredients"] = raw  # 재료를 못 뽑은 경우 원문을 남겨 사람이 확인
    return entry


# ---------------------------------------------------------------
# 4. 저장
# ---------------------------------------------------------------
def save(entries: list) -> None:
    kst = timezone(timedelta(hours=9))
    output = {
        "source": "식품의약품안전처 식품안전나라 Open API - 조리식품의 레시피 DB (COOKRCP01)",
        "note": "표준 레시피 기준으로 추정한 알레르기 정보입니다. 실제 학식 재료와 다를 수 있습니다.",
        "generated_at": datetime.now(kst).strftime("%Y-%m-%d %H:%M (KST)"),
        "count": len(entries),
        "recipes": entries,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    key = load_api_key()
    rules = load_rules()

    print("1️⃣ 식약처 Open API 호출")
    rows = fetch_all_recipes(key)

    print("2️⃣ 재료 정리 + 알레르기 판정")
    entries = [build_entry(r, rules) for r in rows if r.get("RCP_NM")]

    print("3️⃣ JSON 저장")
    save(entries)

    review_count = sum(1 for e in entries if e["needs_review"])
    no_ing = sum(1 for e in entries if not e["ingredients"])
    print(f"✅ 완료: {len(entries)}개 레시피 → {OUTPUT_PATH.relative_to(BASE_DIR)}")
    print(f"   🔍 사람 확인이 필요한 재료가 있는 레시피: {review_count}개")
    print(f"   ⚠️ 재료를 못 뽑은 레시피: {no_ing}개")


if __name__ == "__main__":
    main()
