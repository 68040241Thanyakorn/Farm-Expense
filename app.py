import math
import re
from collections import defaultdict
from datetime import date
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://127.0.0.1:5500", "http://localhost:5500", "http://127.0.0.1:5000", "http://localhost:5000", "https://thriving-hamster-a3b881.netlify.app", "null"]}})


def get_payload():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValueError("Invalid JSON")
    return data


def valid_amount(value):
    try:
        n = float(value)
    except (TypeError, ValueError, OverflowError):
        raise ValueError("Invalid amount")
    if not math.isfinite(n) or not 0 <= n < 1e13:
        raise ValueError("Invalid amount")
    return n


def parse_transactions(data, key="transactions"):
    records = data.get(key, [])
    if not isinstance(records, list) or len(records) > 10000:
        raise ValueError("Invalid transactions")
    clean = []
    for t in records:
        if not isinstance(t, dict) or t.get("type") not in ("income", "expense"):
            raise ValueError("Invalid transaction")
        clean.append({"amount": valid_amount(t.get("amount", 0)), "type": t["type"],
                      "category": str(t.get("category") or "อื่น ๆ")[:120]})
    return clean


def summarize(records):
    income = sum(t["amount"] for t in records if t["type"] == "income")
    expense = sum(t["amount"] for t in records if t["type"] == "expense")
    categories = defaultdict(float)
    for t in records:
        if t["type"] == "expense":
            categories[t["category"]] += t["amount"]
    return {"income": round(income, 2), "expense": round(expense, 2),
            "profit": round(income - expense, 2),
            "categories": [{"name": k, "amount": round(v, 2), "percent": round(v / expense * 100, 1) if expense else 0}
                           for k, v in sorted(categories.items(), key=lambda kv: kv[1], reverse=True)]}


def recommend(records):
    stats = summarize(records)
    if not records:
        return "เริ่มบันทึกรายรับและรายจ่าย เพื่อดูคำแนะนำการจัดการต้นทุนของบ่อปลา"
    if stats["profit"] < 0:
        return f"เดือนนี้ขาดทุน {-stats['profit']:,.2f} บาท ควรตรวจสอบรายจ่ายหลักและวางแผนลดต้นทุน"
    if stats["categories"]:
        top = stats["categories"][0]
        return (f"เดือนนี้กำไร {stats['profit']:,.2f} บาท โดย {top['name']} เป็นต้นทุนสูงสุด "
                f"({top['amount']:,.2f} บาท คิดเป็น {top['percent']:.1f}% ของรายจ่าย) "
                "ควรติดตามและควบคุมรายการนี้")
    return "มีรายรับแล้ว แต่ยังไม่มีรายจ่ายที่บันทึก ควรเพิ่มต้นทุนเพื่อคำนวณกำไรให้แม่นยำ"


def pond_id(pond):
    return str(pond.get("id") or pond.get("pondNumber") or "")


def analyze(data):
    ponds = data.get("ponds", [])
    transactions = data.get("allTransactions", data.get("transactions", []))
    month = str(data.get("month", ""))
    selection = str(data.get("selectedPond", "all"))
    if not isinstance(ponds, list) or not isinstance(transactions, list):
        raise ValueError("Invalid ponds or transactions")
    if len(ponds) > 1000 or len(transactions) > 10000:
        raise ValueError("Too much data")
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month):
        raise ValueError("Invalid month")
    known = {pond_id(p): p for p in ponds if isinstance(p, dict) and pond_id(p)}
    selected_ids = set(known) if selection == "all" else ({selection} if selection in known else set())
    per_pond = defaultdict(lambda: {"income": 0.0, "expense": 0.0, "categories": defaultdict(float), "count": 0})
    by_month = defaultdict(list)
    categories = defaultdict(float)
    income = expense = 0.0
    selected_count = 0
    for t in transactions:
        if not isinstance(t, dict) or t.get("type") not in ("income", "expense"):
            continue
        pid = str(t.get("pondId", ""))
        ym = str(t.get("date", ""))[:7]
        if pid not in selected_ids or not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", ym) or ym > month:
            continue
        value = valid_amount(t.get("amount", 0))
        category = str(t.get("category") or "อื่น ๆ")[:100]
        tx = {"type": t["type"], "amount": value, "category": category}
        by_month[ym].append(tx)
        if ym != month:
            continue
        selected_count += 1
        per_pond[pid][t["type"]] += value
        per_pond[pid]["count"] += 1
        if t["type"] == "income":
            income += value
        else:
            expense += value
            categories[category] += value
            per_pond[pid]["categories"][category] += value
    rows = []
    for pid in selected_ids:
        pond = known[pid]
        values = per_pond[pid]
        p_income = round(values["income"], 2)
        p_expense = round(values["expense"], 2)
        rows.append({"id": pid, "pondNumber": pond.get("pondNumber"),
                     "fishSpecies": str(pond.get("fishSpecies") or "ไม่ระบุ")[:100],
                     "fishCount": pond.get("fishCount"), "income": p_income,
                     "expense": p_expense, "profit": round(p_income-p_expense, 2),
                     "profitMargin": round((p_income-p_expense)/p_income*100, 2) if p_income else None,
                     "transactionCount": values["count"], "categories": dict(values["categories"])})
    rows.sort(key=lambda r: r["profit"], reverse=True)
    months = []
    year, number = map(int, month.split("-"))
    for offset in range(-5, 1):
        index = year * 12 + number - 1 + offset
        ym = f"{index//12:04d}-{index%12+1:02d}"
        summary = summarize(by_month.get(ym, []))
        months.append({"month": ym, "income": summary["income"], "expense": summary["expense"],
                       "profit": summary["profit"], "transactionCount": len(by_month.get(ym, []))})
    prev = months[-2]
    expense_categories = [{"name": name, "amount": round(value, 2),
                           "percentage": round(value/expense*100, 2) if expense else 0}
                          for name, value in sorted(categories.items(), key=lambda item: item[1], reverse=True)]
    return {"month": month, "selectedPond": selection, "income": round(income, 2),
            "expense": round(expense, 2), "profit": round(income-expense, 2),
            "profitMargin": round((income-expense)/income*100, 2) if income else None,
            "categories": dict(categories), "expenseCategories": expense_categories,
            "ponds": rows, "selectedPonds": rows, "monthlyTrend": months,
            "previousMonth": prev, "profitChange": round(income-expense-prev["profit"], 2),
            "transactionCount": selected_count,
            "limitations": ["ตัวเลขมาจากรายการที่บันทึกเท่านั้น", "เดือนที่ไม่มีรายการไม่ได้ยืนยันว่าไม่มีต้นทุนจริง",
                            "ข้อมูลรายเดือนอาจไม่สะท้อนต้นทุนทั้งรอบการเลี้ยง"]}


def advice_for(stats):
    rows = stats["selectedPonds"]
    if not rows:
        return "ยังไม่มีข้อมูลบ่อปลาที่เลือก กรุณาเพิ่มบ่อก่อนวิเคราะห์"
    if not stats["transactionCount"]:
        return "เดือนนี้ยังไม่มีรายการที่บันทึก ไม่สามารถสรุปผลประกอบการจริงได้ กรุณาบันทึกรายรับ–รายจ่ายก่อน"
    lines = ["1. ภาพรวมการเงิน",
             f"รายรับ {stats['income']:,.2f} บาท รายจ่าย {stats['expense']:,.2f} บาท กำไร/ขาดทุนจากรายการที่บันทึก {stats['profit']:,.2f} บาท"]
    if stats["profitMargin"] is not None:
        lines.append(f"อัตรากำไรต่อรายรับ {stats['profitMargin']:.2f}%")
    previous = stats["previousMonth"]
    lines += ["\n2. เปรียบเทียบเดือนก่อน"]
    if previous["transactionCount"]:
        lines.append(f"กำไรเปลี่ยนแปลง {stats['profitChange']:+,.2f} บาท เมื่อเทียบกับ {previous['month']}")
    else:
        lines.append("ไม่มีรายการบันทึกเดือนก่อน จึงยังเปรียบเทียบอย่างน่าเชื่อถือไม่ได้")
    lines += ["\n3. โครงสร้างค่าใช้จ่าย"]
    if stats["expenseCategories"]:
        for c in stats["expenseCategories"][:5]:
            lines.append(f"{c['name']}: {c['amount']:,.2f} บาท ({c['percentage']:.1f}%)")
    else:
        lines.append("ไม่มีรายการค่าใช้จ่ายที่บันทึก")
    lines += ["\n4. เปรียบเทียบบ่อ"]
    active = [r for r in rows if r["transactionCount"]]
    for row in active[:10]:
        lines.append(f"บ่อ {row['pondNumber']} ({row['fishSpecies']}): กำไร/ขาดทุน {row['profit']:,.2f} บาท")
    lines += ["\n5. แนวโน้มย้อนหลัง"]
    for m in stats["monthlyTrend"]:
        if m["transactionCount"]:
            lines.append(f"{m['month']}: กำไร/ขาดทุน {m['profit']:,.2f} บาท")
    lines += ["\n6. แนวทางดำเนินการ"]
    if stats["expenseCategories"]:
        top = stats["expenseCategories"][0]
        lines.append(f"ตรวจสอบใบซื้อและปริมาณใช้ของหมวด {top['name']} ซึ่งมีรายจ่ายสูงสุด ก่อนวางแผนลดต้นทุน")
        lines.append(f"หากลดต้นทุนหมวดนี้ได้ 5% โดยไม่กระทบผลผลิต จะประหยัดเชิงสมมติ {top['amount']*0.05:,.2f} บาท")
    lines.append("ตรวจสอบความครบถ้วนของรายการและเทียบผลหลายรอบการเลี้ยงก่อนตัดสินใจขยายการผลิต")
    return "\n".join(lines)


def is_multi_pond_payload(data):
    return isinstance(data.get("ponds"), list) and bool(data.get("month"))


@app.post("/api/advice")
def advice():
    try:
        data = get_payload()
        return jsonify(advice=recommend(parse_transactions(data)))
    except (ValueError, TypeError, OverflowError) as exc:
        return jsonify(error=str(exc)), 400


@app.post("/api/analysis")
def analysis():
    try:
        data = get_payload()
        if is_multi_pond_payload(data):
            stats = analyze(data)
            return jsonify(advice=basic_report(stats), stats=stats, mode="python", engine="rule-based")
        records = parse_transactions(data)
        previous = parse_transactions(data, "previous_transactions")
        current = summarize(records)
        prev = summarize(previous)
        change = (round((current["profit"]-prev["profit"])/abs(prev["profit"])*100, 1)
                  if previous and prev["profit"] > 0 else None)
        return jsonify(**current, advice=recommend(records), change_percent=change, mode="python")
    except (ValueError, TypeError, OverflowError) as exc:
        return jsonify(error=str(exc)), 400


def baht(value):
    return f"{value:,.2f} บาท"


def meaningful_months(stats):
    return [m for m in stats["monthlyTrend"] if m["transactionCount"] > 0]


def category_insights(stats):
    cats = stats["expenseCategories"]
    if not cats:
        return "ยังไม่มีรายการค่าใช้จ่ายที่บันทึกในเดือนนี้"
    lines = ["โครงสร้างรายจ่ายตามหมวด (จากรายการที่บันทึก):"]
    for c in cats[:10]:
        lines.append(f"- {c['name']}: {baht(c['amount'])} ({c['percentage']:.1f}% ของรายจ่าย)")
    if len(cats) > 10:
        lines.append(f"ยังมีอีก {len(cats)-10} หมวด")
    top = cats[0]
    lines.append(f"หมวดสูงสุดคือ {top['name']} คิดเป็น {top['percentage']:.1f}% ของรายจ่ายทั้งหมด")
    return "\n".join(lines)


def pond_insights(stats):
    rows = [r for r in stats["selectedPonds"] if r["transactionCount"]]
    if not rows:
        return "ยังไม่มีรายการของบ่อที่เลือกในเดือนนี้"
    lines = ["เปรียบเทียบรายบ่อ (เฉพาะบ่อที่มีรายการบันทึก):"]
    for r in rows[:20]:
        lines.append(f"- บ่อ {r['pondNumber']} ({r['fishSpecies']}): รายรับ {baht(r['income'])}, รายจ่าย {baht(r['expense'])}, กำไร/ขาดทุน {baht(r['profit'])}")
    best = max(rows, key=lambda r: r["profit"])
    lines.append(f"บ่อที่มีกำไรสูงสุดจากรายการที่บันทึก: บ่อ {best['pondNumber']} ({baht(best['profit'])})")
    losses = [r for r in rows if r["profit"] < 0]
    if losses:
        lines.append("บ่อที่ขาดทุนจากรายการที่บันทึก: " + ", ".join(f"บ่อ {r['pondNumber']} ({baht(r['profit'])})" for r in losses))
    if len(rows) > 20:
        lines.append(f"ยังมีอีก {len(rows)-20} บ่อ")
    return "\n".join(lines)


def trend_insights(stats):
    lines = ["แนวโน้มย้อนหลัง 6 เดือน (เดือนที่ไม่มีรายการไม่ใช่ศูนย์จริง):"]
    for m in stats["monthlyTrend"]:
        if m["transactionCount"]:
            lines.append(f"- {m['month']}: รายรับ {baht(m['income'])}, รายจ่าย {baht(m['expense'])}, กำไร/ขาดทุน {baht(m['profit'])}")
        else:
            lines.append(f"- {m['month']}: ไม่มีรายการบันทึก")
    active = meaningful_months(stats)
    if len(active) >= 2:
        first, last = active[0], active[-1]
        change = last["profit"] - first["profit"]
        lines.append(f"กำไร/ขาดทุนเปลี่ยนจากเดือน {first['month']} ถึง {last['month']}: {change:+,.2f} บาท (เทียบเฉพาะเดือนที่มีรายการ)")
    else:
        lines.append("มีข้อมูลไม่พอสำหรับสรุปทิศทางย้อนหลัง")
    return "\n".join(lines)


def comparison_insights(stats):
    prev = stats["previousMonth"]
    if not prev["transactionCount"]:
        return "ไม่มีรายการบันทึกในเดือนก่อน จึงยังสรุปการเปลี่ยนแปลงอย่างน่าเชื่อถือไม่ได้"
    return (f"เปรียบเทียบกับ {prev['month']} จากรายการที่บันทึก:\n"
            f"- รายรับ: {baht(stats['income'])} (เปลี่ยน {stats['income']-prev['income']:+,.2f} บาท)\n"
            f"- รายจ่าย: {baht(stats['expense'])} (เปลี่ยน {stats['expense']-prev['expense']:+,.2f} บาท)\n"
            f"- กำไร/ขาดทุน: {baht(stats['profit'])} (เปลี่ยน {stats['profitChange']:+,.2f} บาท)")


def savings_insights(stats):
    cats = stats["expenseCategories"]
    lines = ["แนวทางควบคุมต้นทุนที่ตรวจสอบได้:"]
    if cats:
        top = cats[0]
        lines.append(f"1. ตรวจสอบใบซื้อ ราคาต่อหน่วย และปริมาณใช้ในหมวด {top['name']} ({baht(top['amount'])})")
        lines.append(f"2. หากลดค่าใช้จ่ายหมวดนี้ได้ 5% โดยไม่กระทบผลผลิตและสุขภาพปลา จะประหยัดเชิงสมมติ {baht(top['amount']*.05)}; หากลดได้ 10% จะประหยัด {baht(top['amount']*.10)}")
        if len(cats) > 1:
            second = cats[1]
            lines.append(f"3. ตรวจสอบหมวดรอง {second['name']} ({baht(second['amount'])}) และเปรียบเทียบราคาจากผู้ขาย")
        else:
            lines.append("3. แยกหมวดรายจ่ายให้ละเอียดขึ้นเพื่อระบุรายการที่ควบคุมได้")
    else:
        lines.append("1. บันทึกต้นทุนอาหารปลา ลูกพันธุ์ ค่าแรง ค่าน้ำ และค่าไฟตามที่เกิดขึ้นจริง")
        lines.append("2. ตรวจสอบความครบถ้วนของรายจ่ายก่อนประเมินกำไร")
        lines.append("3. เปรียบเทียบรายจ่ายรายเดือนหลังมีข้อมูลเพียงพอ")
    lines.append("4. แยกต้นทุนตามบ่อและตามรอบการเลี้ยง เพื่อเปรียบเทียบอย่างเป็นธรรม")
    lines.append("5. ตรวจสอบการสูญเสีย อาหารเหลือ และอุปกรณ์สิ้นเปลือง โดยไม่ลดการดูแลจนกระทบสุขภาพปลา")
    lines.append("ตัวเลขประหยัดเป็นสถานการณ์สมมติ ไม่ใช่ผลประหยัดที่รับประกัน")
    return "\n".join(lines)


def financial_overview(stats):
    lines = [f"ภาพรวมเดือน {stats['month']} (จากรายการที่บันทึก):",
             f"- รายรับรวม {baht(stats['income'])}",
             f"- รายจ่ายรวม {baht(stats['expense'])}",
             f"- กำไร/ขาดทุน {baht(stats['profit'])}",
             f"- จำนวนรายการ {stats['transactionCount']} รายการ"]
    if stats["profitMargin"] is not None:
        lines.append(f"- อัตรากำไรต่อรายรับ {stats['profitMargin']:.2f}%")
    else:
        lines.append("- คำนวณอัตรากำไรต่อรายรับไม่ได้ เพราะไม่มีรายรับที่บันทึก")
    if stats["profit"] < 0:
        lines.append("สถานะ: ขาดทุนจากรายการที่บันทึก ควรตรวจสอบต้นทุนหลักและความครบถ้วนของรายรับ")
    elif stats["profit"] > 0:
        lines.append("สถานะ: มีกำไรจากรายการที่บันทึก แต่ยังไม่ใช่กำไรทั้งรอบการเลี้ยง")
    else:
        lines.append("สถานะ: รายรับเท่ากับรายจ่ายที่บันทึก หรือยังไม่มีข้อมูล")
    return "\n".join(lines)


def basic_report(stats):
    if not stats["selectedPonds"]:
        return "ยังไม่มีบ่อที่เลือก กรุณาเพิ่มบ่อปลาเพื่อเริ่มวิเคราะห์"
    if not stats["transactionCount"]:
        return (financial_overview(stats) + "\n\n" + trend_insights(stats) +
                "\n\nข้อมูลเดือนนี้ไม่เพียงพอสำหรับคำแนะนำเฉพาะเจาะจง กรุณาตรวจสอบการบันทึกรายรับรายจ่าย")
    return "\n\n".join([
        "1. " + financial_overview(stats),
        "2. " + comparison_insights(stats),
        "3. " + category_insights(stats),
        "4. " + pond_insights(stats),
        "5. " + trend_insights(stats),
        "6. " + savings_insights(stats),
        "หมายเหตุ: ตัวเลขสะท้อนเฉพาะข้อมูลที่บันทึก ไม่ใช่การยืนยันผลประกอบการจริงทั้งหมด"
    ])


def answer_question(question, stats):
    q = question.lower().strip()
    if not stats["selectedPonds"]:
        return "ยังไม่มีข้อมูลบ่อปลา กรุณาเพิ่มบ่อก่อนถามคำถาม"
    if not stats["transactionCount"]:
        return basic_report(stats)
    if any(w in q for w in ("ทั้งหมด", "อย่างละเอียด", "ภาพรวม", "วิเคราะห์ฟาร์ม", "สรุปปัญหา", "วิเคราะห์รายรับ", "วิเคราะห์รายจ่าย", "วิเคราะห์กำไร")):
        return basic_report(stats)
    sections = []
    if any(w in q for w in ("กำไร", "ขาดทุน", "รายรับ", "อัตรากำไร", "การเงิน")):
        sections.append(financial_overview(stats))
    if any(w in q for w in ("เดือนก่อน", "เปรียบเทียบเดือน", "เพิ่มขึ้น", "ลดลง")):
        sections.append(comparison_insights(stats))
    if any(w in q for w in ("ค่าใช้จ่าย", "รายจ่าย", "ต้นทุน", "ค่าอาหาร", "ค่าแรง", "ค่าน้ำ", "ค่าไฟ", "หมวด", "สัดส่วน", "เปอร์เซ็นต์")):
        sections.append(category_insights(stats))
    if any(w in q for w in ("บ่อไหน", "บ่อใด", "แต่ละบ่อ", "รายบ่อ", "เปรียบเทียบบ่อ", "บ่อที่", "บ่อปลา")):
        sections.append(pond_insights(stats))
    if any(w in q for w in ("ย้อนหลัง", "แนวโน้ม", "6 เดือน", "หกเดือน", "รายเดือน")):
        sections.append(trend_insights(stats))
    if any(w in q for w in ("แนะนำ", "คำแนะนำ", "ควร", "ลดต้นทุน", "ประหยัด", "ปรับปรุง", "แก้ปัญหา")):
        sections.append(savings_insights(stats))
    if not sections:
        return ("ระบบวิเคราะห์ฟรีตอบได้จากข้อมูลที่บันทึก เช่น กำไร–ขาดทุน รายจ่ายรายหมวด "
                "เปรียบเทียบบ่อ แนวโน้ม 6 เดือน และวิธีควบคุมต้นทุน\n\n" + financial_overview(stats))
    sections.append("หมายเหตุ: อ้างอิงเฉพาะรายการที่บันทึก ไม่ใช่ผลทั้งรอบการเลี้ยง")
    return "\n\n".join(sections)


@app.post("/api/ask")
def ask():
    try:
        data = get_payload()
        question = str(data.get("question") or "").strip()
        if not question or len(question) > 1500:
            return jsonify(error="กรุณาพิมพ์คำถามไม่เกิน 1,500 ตัวอักษร"), 400
        if is_multi_pond_payload(data):
            stats = analyze(data)
            return jsonify(answer=answer_question(question, stats), mode="python", engine="rule-based")
        records = parse_transactions(data)
        stats = summarize(records)
        return jsonify(answer=(f"รายรับ {baht(stats['income'])} รายจ่าย {baht(stats['expense'])} "
                               f"กำไร/ขาดทุน {baht(stats['profit'])} (จากรายการที่บันทึก)"), mode="python", engine="rule-based")
    except (ValueError, TypeError, OverflowError) as exc:
        return jsonify(error=str(exc)), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(__import__("os").environ.get("PORT", "5000")), debug=False)