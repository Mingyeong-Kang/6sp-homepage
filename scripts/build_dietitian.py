"""
Ewha SafeMeal - 영양사 알레르기 성분표(엑셀) → JSON 변환 스크립트

하는 일
  1. source 폴더의 영양사 엑셀 파일을 읽는다 (시트마다 '메뉴명'이 있는 표를 자동으로 찾음)
  2. 알레르기 이름과 표시번호(①~⑲)를 읽어 레시피 데이터와 같은 이름으로 맞춘다
  3. 같은 메뉴가 여러 파일에 있으면 SOURCE_FILES에서 앞에 있는 파일(최신)을 우선한다
  4. data/dietitian-allergens.json 에 저장한다

실행 방법
  pip install openpyxl        (처음 한 번만)
  python build_dietitian.py

영양사 자료는 사람이 가끔 새로 받는 자료라서, 매주 자동 실행이 아니라
새 엑셀을 받았을 때 직접 실행합니다.
"""

import json
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("❌ openpyxl이 없어요. 먼저  pip install openpyxl  을 실행해 주세요.")

BASE_DIR = Path(__file__).resolve().parent.parent  # 저장소 최상위 폴더
RULES_PATH = BASE_DIR / "data" / "allergen_rules.json"
OUTPUT_PATH = BASE_DIR / "data" / "dietitian-allergens.json"

# 우선순위 순서 (앞에 있을수록 최신/우선). 새 파일을 받으면 맨 앞에 추가하세요.
SOURCE_FILES = [
    BASE_DIR / "data" / "source" / "알레르기성분표_v2.xlsx",
    BASE_DIR / "data" / "source" / "알레르기성분표_v1.xlsx",
]

CIRCLED = {chr(0x2460 + i): i + 1 for i in range(20)}  # ① → 1 ... ⑳ → 20

# 표에 쓰인 다른 이름 → 표준 이름
ALIASES = {"알류": "난류", "알": "난류", "계란": "난류", "달걀": "난류", "소고기": "쇠고기", "조개": "조개류"}


def load_allergen_names() -> dict:
    rules = json.loads(RULES_PATH.read_text(encoding="utf-8"))
    return {r["no"]: r["allergen"] for r in rules["rules"]}


def normalize_name(name: str) -> str:
    return re.sub(r"\s+", "", str(name or "")).strip()


def find_header(ws):
    """'메뉴명'이 들어 있는 행을 찾아 (행 번호, {열 역할: 열 번호})를 돌려준다."""
    for row in ws.iter_rows(min_row=1, max_row=min(ws.max_row, 10)):
        texts = [str(c.value or "").strip() for c in row]
        if "메뉴명" not in texts:
            continue
        cols = {}
        for i, t in enumerate(texts):
            if t == "메뉴명":
                cols["menu"] = i
            elif "알레르기" in t:
                cols["allergen_text"] = i
            elif "표시번호" in t:
                cols["numbers"] = i
            elif "참고" in t or "확인" in t:
                cols["note"] = i
            elif t in ("일자", "날짜"):
                cols["date"] = i
            elif t == "구분":
                cols["category"] = i
        return row[0].row, cols
    return None, None


def parse_allergens(text: str, numbers: str, no_to_name: dict):
    """알레르기 글자와 표시번호를 둘 다 읽어 합친다. (상태, 이름 목록, 불일치 메모)"""
    text = str(text or "").strip()
    numbers = str(numbers or "").strip()

    if "추정 불가" in text or "없음" in text:
        return "none_estimated", [], None   # 주요 알레르기가 추정되지 않음 (안전 보장은 아님)
    if "확인 필요" in text or not text:
        return "needs_check", [], None      # 아직 모름

    name_to_no = {v: k for k, v in no_to_name.items()}
    from_text = []
    for part in re.split(r"[,，/·]", text):
        part = re.sub(r"\(.*?\)", "", part).strip()   # "알류(가금류)" → "알류"
        part = ALIASES.get(part, part)                # "알류" → "난류"
        if part in name_to_no and part not in from_text:
            from_text.append(part)
    from_numbers = [no_to_name[CIRCLED[ch]] for ch in numbers if ch in CIRCLED and CIRCLED[ch] in no_to_name]

    merged = sorted(set(from_text) | set(from_numbers), key=lambda n: name_to_no[n])
    mismatch = None
    if from_numbers and set(from_text) != set(from_numbers):
        mismatch = f"글자({', '.join(from_text)})와 번호({', '.join(from_numbers)})가 달라 둘 다 반영"
    return "ok", merged, mismatch


def read_file(path: Path, no_to_name: dict) -> list:
    wb = openpyxl.load_workbook(path, data_only=True)
    menus = []
    for ws in wb.worksheets:
        header_row, cols = find_header(ws)
        if not header_row or "menu" not in cols:
            continue  # 안내 시트 등은 건너뜀
        sheet_category = ws.title.replace("메뉴", "").replace("이화여대 신공학관", "").replace("알레르기 성분표", "").strip()

        for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
            name = str(row[cols["menu"]] or "").strip()
            if not name:
                continue
            get = lambda key: row[cols[key]] if key in cols else None
            status, allergens, mismatch = parse_allergens(get("allergen_text"), get("numbers"), no_to_name)
            date = str(get("date") or "").strip()
            menus.append({
                "name": name,
                "category": str(get("category") or sheet_category or "").strip(),
                "dates": [date] if date and date not in ("공통", "날짜 미표기") else [],
                "allergens": allergens,
                "status": status,
                "note": str(get("note") or "").strip().rstrip(";").strip(),
                "source_file": path.name,
                "issues": [mismatch] if mismatch else [],
            })
    return menus


def name_hints(menu_name: str, rules: dict) -> list:
    """메뉴 이름 자체에서 보이는 알레르기 (예: 콩나물 → 대두). 사람 확인용."""
    found = []
    for rule in rules["rules"]:
        if any(ex in menu_name for ex in rule["exclude"]):
            continue
        if any(kw in menu_name for kw in rule["keywords"]):
            found.append(rule["allergen"])
    return found


def main() -> None:
    no_to_name = load_allergen_names()
    rules = json.loads(RULES_PATH.read_text(encoding="utf-8"))

    files = [p for p in SOURCE_FILES if p.exists()]
    if not files:
        sys.exit("❌ source 폴더에 영양사 엑셀 파일이 없어요. SOURCE_FILES의 파일 이름을 확인해 주세요.")

    merged = {}  # 정규화한 메뉴명 → 메뉴
    for priority, path in enumerate(files):
        print(f"📄 {path.name} 읽는 중...")
        for m in read_file(path, no_to_name):
            key = normalize_name(m["name"])
            if key not in merged:
                m["_priority"] = priority
                merged[key] = m
            elif merged[key]["_priority"] == priority:
                # 같은 파일 안에서 날짜만 다른 같은 메뉴 → 알레르기 합치기
                old = merged[key]
                old["dates"] += [d for d in m["dates"] if d not in old["dates"]]
                old["allergens"] = sorted(set(old["allergens"]) | set(m["allergens"]),
                                          key=lambda n: list(no_to_name.values()).index(n))
            # 우선순위가 낮은 파일의 같은 메뉴는 무시 (최신 파일 우선)

    menus = []
    for m in merged.values():
        m.pop("_priority")
        hints = [h for h in name_hints(m["name"], rules) if h not in m["allergens"]]
        if hints:
            m["issues"].append(f"메뉴 이름에 {', '.join(hints)} 관련 재료가 보이는데 성분표에는 없음 → 확인 필요")
        menus.append(m)

    kst = timezone(timedelta(hours=9))
    output = {
        "source": "이화여대 신공학관 학생식당 영양사 제공 알레르기 성분표",
        "note": "주요 식재료 기준으로 작성된 자료로, 가공식품·소스·양념에 든 성분은 빠져 있을 수 있습니다. "
                "알레르기가 표시되지 않았다고 해서 해당 성분이 없다는 뜻은 아닙니다.",
        "generated_at": datetime.now(kst).strftime("%Y-%m-%d %H:%M (KST)"),
        "count": len(menus),
        "menus": menus,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    issues = [m for m in menus if m["issues"]]
    print(f"✅ 완료: 메뉴 {len(menus)}개 → {OUTPUT_PATH.relative_to(BASE_DIR)}")
    print(f"   🔍 확인이 필요한 메뉴: {len(issues)}개")
    for m in issues:
        for i in m["issues"]:
            print(f"      - {m['name']}: {i}")


if __name__ == "__main__":
    main()
