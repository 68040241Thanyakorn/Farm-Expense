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

  function safeNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
      return 0;
    }

    const number = Number(value);

    return Number.isFinite(number) && number >= 0 ? number : 0;
  }

  function money(value) {
    return safeNumber(value).toLocaleString("th-TH", {
      maximumFractionDigits: 2,
    });
  }

  function signedMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return number.toLocaleString("th-TH", {
      maximumFractionDigits: 2,
    });
  }

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");

      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error("อ่านข้อมูลไม่สำเร็จ:", key, error);
      return [];
    }
  }

  const ponds = readArray(POND_KEY);
  const transactions = readArray(TX_KEY);

  const params = new URLSearchParams(window.location.search);

  const pondPicker = $("pond-picker");
  const monthPicker = $("month-picker");

  if (!pondPicker || !monthPicker) {
    console.error("ไม่พบ pond-picker หรือ month-picker");
    return;
  }

  function pondId(pond) {
    return String(pond.id ?? pond.pondNumber ?? "");
  }

  function validMonth(value) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
  }

  function transactionMonth(tx) {
    return String(tx.date || "").slice(0, 7);
  }

  function monthShift(value, offset) {
    if (!validMonth(value)) return "";

    const [year, month] = value.split("-").map(Number);

    const date = new Date(year, month - 1 + offset, 1);

    return (
      date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0")
    );
  }

  function monthLabel(value) {
    if (!validMonth(value)) return "";

    const [year, month] = value.split("-").map(Number);

    return `เดือน${fullMonths[month - 1]} ${year + 543}`;
  }

  const now = new Date();

  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}`;

  let activeTab = "monthly";

  // ------------------------------
  // Setup pond picker
  // ------------------------------

  pondPicker.replaceChildren();

  pondPicker.add(new Option("ทุกบ่อ (รวมทั้งหมด)", ALL));

  const sortedPonds = [...ponds].sort((a, b) => {
    return safeNumber(a.pondNumber) - safeNumber(b.pondNumber);
  });

  sortedPonds.forEach((pond) => {
    pondPicker.add(
      new Option(
        `บ่อที่ ${pond.pondNumber} : ${pond.fishSpecies || "-"}`,
        pondId(pond),
      ),
    );
  });

  const requestedPond = params.get("pond");

  const pondExists = [...pondPicker.options].some(
    (option) => option.value === requestedPond,
  );

  pondPicker.value = requestedPond && pondExists ? requestedPond : ALL;

  // ------------------------------
  // Setup month picker
  // ------------------------------

  const months = new Set([currentMonth]);

  for (let i = 0; i < 12; i++) {
    months.add(monthShift(currentMonth, -i));
  }

  transactions.forEach((tx) => {
    const month = transactionMonth(tx);

    if (validMonth(month)) {
      months.add(month);
    }
  });

  const requestedMonth = params.get("month");

  if (validMonth(requestedMonth)) {
    months.add(requestedMonth);
  }

  monthPicker.replaceChildren();

  [...months]
    .sort()
    .reverse()
    .forEach((value) => {
      monthPicker.add(new Option(monthLabel(value), value));
    });

  monthPicker.value = validMonth(requestedMonth)
    ? requestedMonth
    : currentMonth;

  // ------------------------------
  // Data calculations
  // ------------------------------

  function chosenTransactions() {
    const chosen = pondPicker.value;

    return transactions.filter((tx) => {
      return chosen === ALL || String(tx.pondId) === chosen;
    });
  }

  function totals(rows) {
    return rows.reduce(
      (result, tx) => {
        const amount = Number(tx.amount);

        if (!Number.isFinite(amount) || amount < 0) {
          return result;
        }

        if (tx.type === "income") {
          result.income += amount;
        }

        if (tx.type === "expense") {
          result.expense += amount;
        }

        return result;
      },
      {
        income: 0,
        expense: 0,
      },
    );
  }

  function selectedMonthRows(rows) {
    const selectedMonth = monthPicker.value;

    return rows.filter((tx) => {
      return transactionMonth(tx) === selectedMonth;
    });
  }

  // ------------------------------
  // Navigation to AI
  // ------------------------------

  function syncUrl() {
    const url = new URL(window.location.href);

    if (pondPicker.value === ALL) {
      url.searchParams.delete("pond");
    } else {
      url.searchParams.set("pond", pondPicker.value);
    }

    url.searchParams.set("month", monthPicker.value);

    window.history.replaceState(null, "", url.href);

    const aiLink = $("nav-ai");

    if (aiLink) {
      const aiUrl = new URL("index9.html", window.location.href);

      if (pondPicker.value === ALL) {
        aiUrl.searchParams.delete("pond");
      } else {
        aiUrl.searchParams.set("pond", pondPicker.value);
      }

      aiUrl.searchParams.set("month", monthPicker.value);

      aiLink.href = aiUrl.href;
    }
  }

  // ------------------------------
  // Monthly chart
  // ------------------------------

  function drawChart(rows) {
    const chart = $("monthly-chart");
    const yaxis = $("yaxis");

    if (!chart || !yaxis) return;

    const months4 = [-3, -2, -1, 0].map((offset) =>
      monthShift(monthPicker.value, offset),
    );

    const series = months4.map((month) => {
      const monthRows = rows.filter((tx) => transactionMonth(tx) === month);

      const result = totals(monthRows);

      return {
        month,
        income: result.income,
        expense: result.expense,
        profit: result.income - result.expense,
      };
    });

    const highest = Math.max(
      1,
      ...series.flatMap((item) => [item.income, item.expense]),
    );

    const ceiling = Math.ceil(highest / 4) * 4;

    yaxis.replaceChildren();

    for (let i = 4; i >= 0; i--) {
      const label = document.createElement("span");

      label.textContent = money((ceiling * i) / 4);

      yaxis.append(label);
    }

    chart.replaceChildren();

    series.forEach((item) => {
      const column = document.createElement("div");
      column.className = "month-col";

      const pair = document.createElement("div");
      pair.className = "bar-pair";

      ["income", "expense"].forEach((type) => {
        const bar = document.createElement("div");

        bar.className = `bar ${type}`;

        const percent = (item[type] / ceiling) * 100;

        bar.style.height = `${Math.max(0, Math.min(percent, 100))}%`;

        bar.title =
          `${type === "income" ? "รายรับ" : "รายจ่าย"} ` +
          `${money(item[type])} บาท`;

        pair.append(bar);
      });

      const label = document.createElement("span");
      label.className = "month-name";

      const monthIndex = Number(item.month.slice(5)) - 1;

      label.textContent = monthNames[monthIndex] || "-";

      column.append(pair, label);
      chart.append(column);
    });

    const note = $("monthly-note");

    if (note) {
      note.textContent =
        `ข้อมูล 4 เดือนย้อนหลังจนถึง ${monthLabel(monthPicker.value)} ` +
        "(คำนวณจากรายการที่บันทึกจริง)";
    }
  }

  // ------------------------------
  // Expense categories chart
  // ------------------------------

  function drawCategories(monthRows) {
    const list = $("category-list");
    const donut = $("expense-donut");

    if (!list || !donut) return;

    const categoryTotals = new Map();

    monthRows
      .filter((tx) => tx.type === "expense")
      .forEach((tx) => {
        const amount = Number(tx.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
          return;
        }

        const name = String(tx.category || "").trim() || "อื่น ๆ";

        categoryTotals.set(name, (categoryTotals.get(name) || 0) + amount);
      });

    const data = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);

    const total = data.reduce((sum, [, amount]) => sum + amount, 0);

    list.replaceChildren();

    if (total <= 0) {
      donut.style.background = "#eeeeee";

      donut.setAttribute("aria-label", "ยังไม่มีรายจ่าย");

      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "ยังไม่มีรายจ่ายในเดือนนี้";

      list.append(empty);
      return;
    }

    let position = 0;

    const stops = data.map(([, amount], index) => {
      const start = position;

      position += (amount / total) * 100;

      return `${colors[index % colors.length]} ` + `${start}% ${position}%`;
    });

    donut.style.background = `conic-gradient(${stops.join(", ")})`;

    donut.setAttribute("aria-label", `ค่าใช้จ่ายรวม ${money(total)} บาท`);

    data.forEach(([name, amount], index) => {
      const row = document.createElement("div");
      row.className = "category-row";

      const label = document.createElement("span");

      const dot = document.createElement("i");
      dot.className = "dot";

      dot.style.background = colors[index % colors.length];

      label.append(dot, document.createTextNode(name));

      const number = document.createElement("strong");

      const percentage = (amount / total) * 100;

      number.textContent = `${percentage.toFixed(1)}%`;

      number.title = `${money(amount)} บาท`;

      row.append(label, number);
      list.append(row);
    });
  }

  // ------------------------------
  // Render summary
  // ------------------------------

  function render() {
    const rows = chosenTransactions();
    const monthRows = selectedMonthRows(rows);

    const { income, expense } = totals(monthRows);

    const profit = income - expense;

    const incomeElement = $("income");
    const expenseElement = $("expense");
    const profitElement = $("profit");

    if (incomeElement) {
      incomeElement.textContent = money(income);
    }

    if (expenseElement) {
      expenseElement.textContent = money(expense);
    }

    if (profitElement) {
      profitElement.textContent = signedMoney(profit);

      if (profitElement.parentElement) {
        profitElement.parentElement.classList.toggle("loss", profit < 0);
      }
    }

    const selectedPond = ponds.find(
      (pond) => pondId(pond) === pondPicker.value,
    );

    const title = $("pond-title");

    if (title) {
      if (selectedPond) {
        title.textContent =
          `บ่อที่ ${selectedPond.pondNumber} : ` +
          `${selectedPond.fishSpecies || "-"} • ` +
          `จำนวนปลา ${money(selectedPond.fishCount)} ตัว`;
      } else {
        const totalFish = ponds.reduce(
          (sum, pond) => sum + safeNumber(pond.fishCount),
          0,
        );

        title.textContent =
          `ข้อมูลทุกบ่อรวมกัน • ${ponds.length} บ่อ • ` +
          `จำนวนปลารวม ${money(totalFish)} ตัว`;
      }
    }

    drawChart(rows);
    drawCategories(monthRows);

    const monthlyPanel = $("monthly-panel");
    const categoryPanel = $("category-panel");

    if (monthlyPanel) {
      monthlyPanel.hidden = activeTab === "categories";
    }

    if (categoryPanel) {
      categoryPanel.hidden = activeTab !== "categories";
    }

    const chartTitle = $("chart-title");

    if (chartTitle) {
      if (activeTab === "income-expense") {
        chartTitle.textContent = "เปรียบเทียบรายรับ–รายจ่าย";
      } else if (activeTab === "categories") {
        chartTitle.textContent = "สัดส่วนค่าใช้จ่ายตามประเภท";
      } else {
        chartTitle.textContent = "กำไร–ขาดทุนรายเดือน";
      }
    }

    syncUrl();
  }

  // ------------------------------
  // Events
  // ------------------------------

  pondPicker.addEventListener("change", render);

  monthPicker.addEventListener("change", render);

  const tabs = document.querySelectorAll(".tab");

  tabs.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;

      if (!["monthly", "income-expense", "categories"].includes(tab)) {
        return;
      }

      activeTab = tab;

      tabs.forEach((item) => {
        const selected = item === button;

        item.classList.toggle("active", selected);

        item.setAttribute("aria-selected", String(selected));
      });

      render();
    });
  });

  // ------------------------------
  // Initialize
  // ------------------------------

  render();
})();
