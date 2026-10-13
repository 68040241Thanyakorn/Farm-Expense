(() => {
  "use strict";
  const POND_KEY = "farmExpensePonds";
  const TX_KEY = "farmExpenseTransactions";
  const ALL = "all";
  const monthNames = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  const fullMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];
  const colors = [
    "#4cbcc1",
    "#e9b7af",
    "#f3d27b",
    "#9db9eb",
    "#a5d6a7",
    "#c7a7dd",
    "#f4ae83",
    "#7cbab0",
  ];
  const $ = (id) => document.getElementById(id);
  const money = (n) =>
    Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
  const readArray = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  const ponds = readArray(POND_KEY);
  const transactions = readArray(TX_KEY);
  const params = new URLSearchParams(location.search);
  const pondPicker = $("pond-picker");
  const monthPicker = $("month-picker");
  const pondId = (pond) => String(pond.id ?? pond.pondNumber);
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  const validMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
  let activeTab = "monthly";

  // ค่าเริ่มต้นคือทุกบ่อ หากเปิดจากหน้าบ่อพร้อม ?pond=... จะเลือกบ่อนั้น
  pondPicker.add(new Option("ทุกบ่อ (รวมทั้งหมด)", ALL));
  [...ponds]
    .sort((a, b) => Number(a.pondNumber) - Number(b.pondNumber))
    .forEach((pond) => {
      pondPicker.add(
        new Option(
          `บ่อที่ ${pond.pondNumber} : ${pond.fishSpecies}`,
          pondId(pond),
        ),
      );
    });
  const requestedPond = params.get("pond");
  pondPicker.value =
    requestedPond &&
    [...pondPicker.options].some((o) => o.value === requestedPond)
      ? requestedPond
      : ALL;

  // เดือนจากข้อมูลจริง + ย้อนหลัง 12 เดือน
  const months = new Set();
  for (let i = 0; i < 12; i++) {
    const d = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - i,
      1,
    );
    months.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  transactions.forEach((t) => {
    const month = String(t.date || "").slice(0, 7);
    if (validMonth(month)) months.add(month);
  });
  const requestedMonth = params.get("month");
  if (validMonth(requestedMonth)) months.add(requestedMonth);
  [...months]
    .sort()
    .reverse()
    .forEach((value) => {
      const [year, month] = value.split("-").map(Number);
      monthPicker.add(
        new Option(`เดือน${fullMonths[month - 1]} ${year + 543}`, value),
      );
    });
  monthPicker.value = validMonth(requestedMonth)
    ? requestedMonth
    : currentMonth;

  function chosenTransactions() {
    const chosen = pondPicker.value;
    return transactions.filter(
      (t) => chosen === ALL || String(t.pondId) === chosen,
    );
  }
  function totals(rows) {
    return rows.reduce(
      (acc, t) => {
        const value = Number(t.amount);
        if (!Number.isFinite(value) || value < 0) return acc;
        if (t.type === "income") acc.income += value;
        if (t.type === "expense") acc.expense += value;
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }
  function monthShift(value, offset) {
    const [year, month] = value.split("-").map(Number);
    const d = new Date(year, month - 1 + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function syncUrl() {
    const url = new URL(location.href);
    if (pondPicker.value === ALL) url.searchParams.delete("pond");
    else url.searchParams.set("pond", pondPicker.value);
    url.searchParams.set("month", monthPicker.value);
    history.replaceState(null, "", url);
    // หน้า AI เดิมอาจยังรองรับเฉพาะรายบ่อ: ส่งบ่อที่เลือก หรือบ่อแรกเมื่อเลือกทั้งหมด
    const aiUrl = new URL("index9.html", location.href);
    if (pondPicker.value !== ALL)
      aiUrl.searchParams.set("pond", pondPicker.value);
    else aiUrl.searchParams.delete("pond");
    aiUrl.searchParams.set("month", monthPicker.value);
    $("nav-ai").href = aiUrl.href;
  }
  function drawChart(rows) {
    const months4 = [-3, -2, -1, 0].map((offset) =>
      monthShift(monthPicker.value, offset),
    );
    const series = months4.map((month) => ({
      month,
      ...totals(rows.filter((t) => String(t.date || "").startsWith(month))),
    }));
    const highest = Math.max(
      1,
      ...series.flatMap((s) => [s.income, s.expense]),
    );
    const ceiling = Math.ceil(highest / 4) * 4;
    $("yaxis").replaceChildren();
    for (let i = 4; i >= 0; i--) {
      const label = document.createElement("span");
      label.textContent = money((ceiling * i) / 4);
      $("yaxis").append(label);
    }
    $("monthly-chart").replaceChildren();
    series.forEach((s) => {
      const column = document.createElement("div");
      column.className = "month-col";
      const pair = document.createElement("div");
      pair.className = "bar-pair";
      for (const type of ["income", "expense"]) {
        const bar = document.createElement("div");
        bar.className = `bar ${type}`;
        bar.style.height = `${(s[type] / ceiling) * 100}%`;
        bar.title = `${type === "income" ? "รายรับ" : "รายจ่าย"} ${money(s[type])} บาท`;
        pair.append(bar);
      }
      const label = document.createElement("span");
      label.className = "month-name";
      label.textContent = monthNames[Number(s.month.slice(5)) - 1];
      column.append(pair, label);
      $("monthly-chart").append(column);
    });
    const [year, month] = monthPicker.value.split("-").map(Number);
    $("monthly-note").textContent =
      `ข้อมูล 4 เดือนย้อนหลังจนถึง ${fullMonths[month - 1]} ${year + 543} (คำนวณจากรายการที่บันทึกจริง)`;
  }
  function drawCategories(monthRows) {
    const categoryTotals = new Map();
    monthRows
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const amount = Number(t.amount);
        if (!Number.isFinite(amount) || amount <= 0) return;
        const name = String(t.category || "อื่น ๆ");
        categoryTotals.set(name, (categoryTotals.get(name) || 0) + amount);
      });
    const data = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
    const total = data.reduce((sum, [, amount]) => sum + amount, 0);
    const list = $("category-list");
    list.replaceChildren();
    const donut = $("expense-donut");
    if (!total) {
      donut.style.background = "#eee";
      donut.setAttribute("aria-label", "ยังไม่มีรายจ่าย");
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "ยังไม่มีรายจ่ายในเดือนนี้";
      list.append(empty);
      return;
    }
    let position = 0;
    const stops = data.map(([, amount], i) => {
      const start = position;
      position += (amount / total) * 100;
      return `${colors[i % colors.length]} ${start}% ${position}%`;
    });
    donut.style.background = `conic-gradient(${stops.join(", ")})`;
    donut.setAttribute("aria-label", `ค่าใช้จ่ายรวม ${money(total)} บาท`);
    data.forEach(([name, amount], i) => {
      const row = document.createElement("div");
      row.className = "category-row";
      const label = document.createElement("span");
      const dot = document.createElement("i");
      dot.className = "dot";
      dot.style.background = colors[i % colors.length];
      label.append(dot, document.createTextNode(name));
      const number = document.createElement("strong");
      number.textContent = `${((amount / total) * 100).toFixed(1)}%`;
      number.title = `${money(amount)} บาท`;
      row.append(label, number);
      list.append(row);
    });
  }
  function render() {
    const rows = chosenTransactions();
    const selectedRows = rows.filter((t) =>
      String(t.date || "").startsWith(monthPicker.value),
    );
    const { income, expense } = totals(selectedRows);
    $("income").textContent = money(income);
    $("expense").textContent = money(expense);
    $("profit").textContent = money(income - expense);
    $("profit").parentElement.classList.toggle("loss", income < expense);
    const selectedPond = ponds.find((p) => pondId(p) === pondPicker.value);
    $("pond-title").textContent = selectedPond
      ? `บ่อที่ ${selectedPond.pondNumber} : ${selectedPond.fishSpecies} • จำนวนปลา ${money(selectedPond.fishCount)} ตัว`
      : `ข้อมูลทุกบ่อรวมกัน • ${ponds.length} บ่อ • จำนวนปลารวม ${money(ponds.reduce((n, p) => n + (Number(p.fishCount) || 0), 0))} ตัว`;
    drawChart(rows);
    drawCategories(selectedRows);
    $("monthly-panel").hidden = activeTab === "categories";
    $("category-panel").hidden = activeTab === "income-expense";
    $("chart-title").textContent =
      activeTab === "income-expense"
        ? "เปรียบเทียบรายรับ–รายจ่าย"
        : "กำไร–ขาดทุนรายเดือน";
    syncUrl();
  }
  pondPicker.addEventListener("change", render);
  monthPicker.addEventListener("change", render);
  document.querySelectorAll(".tab").forEach((button) =>
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      document.querySelectorAll(".tab").forEach((b) => {
        const selected = b === button;
        b.classList.toggle("active", selected);
        b.setAttribute("aria-selected", String(selected));
      });
      render();
    }),
  );
  render();
})();