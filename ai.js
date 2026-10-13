"use strict";

const API = "https://farm-expense-backend.onrender.com";
const POND_KEY = "farmExpensePonds";
const TX_KEY = "farmExpenseTransactions";

const TH_MONTHS = [
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

const COLORS = [
  "#4cbcc1",
  "#e9b7af",
  "#f5c66b",
  "#a4c5e7",
  "#b7d8a2",
  "#c9b5e7",
  "#f2a7ca",
  "#7bc9aa",
];

const $ = (id) => document.getElementById(id);

const query = new URLSearchParams(location.search);
const monthPicker = $("month-picker");
const pondPicker = $("pond-picker");

let chatHistory = [];
let renderVersion = 0;
let chatVersion = 0;
let analysisController = null;
let chatController = null;

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function pondId(pond) {
  return String(pond.id ?? pond.pondNumber);
}

function validMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
}

function monthLabel(ym) {
  if (!validMonth(ym)) {
    return "ไม่ระบุเดือน";
  }

  const [year, month] = ym.split("-").map(Number);

  return `${TH_MONTHS[month - 1]} ${year + 543}`;
}

function currentMonth() {
  const date = new Date();

  return (
    date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0")
  );
}

function shiftMonth(ym, offset) {
  const [year, month] = ym.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);

  return (
    date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0")
  );
}

function previousMonth(ym) {
  return shiftMonth(ym, -1);
}

function money(value) {
  const number = Number(value);

  return (Number.isFinite(number) ? number : 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function percent(value) {
  return Number(value).toFixed(2);
}

function getPonds() {
  return readArray(POND_KEY);
}

function getTxs() {
  return readArray(TX_KEY);
}

function populateFilters() {
  const ponds = getPonds();

  const months = new Set([
    currentMonth(),
    ...getTxs()
      .map((tx) => String(tx.date || "").slice(0, 7))
      .filter(validMonth),
  ]);

  const chosenMonth = validMonth(query.get("month"))
    ? query.get("month")
    : currentMonth();

  months.add(chosenMonth);

  monthPicker.replaceChildren();
  pondPicker.replaceChildren();

  for (const ym of [...months].sort().reverse()) {
    monthPicker.add(new Option(monthLabel(ym), ym));
  }

  monthPicker.value = chosenMonth;

  pondPicker.add(new Option("ทุกบ่อ (รวมทั้งหมด)", "all"));

  const sortedPonds = [...ponds].sort(
    (a, b) => Number(a.pondNumber) - Number(b.pondNumber),
  );

  for (const pond of sortedPonds) {
    pondPicker.add(
      new Option(
        `บ่อที่ ${pond.pondNumber} : ${pond.fishSpecies}`,
        pondId(pond),
      ),
    );
  }

  const selected = query.get("pond");

  pondPicker.value = ponds.some((pond) => pondId(pond) === selected)
    ? selected
    : "all";
}

function selectedData() {
  const ponds = getPonds();
  const allTxs = getTxs();

  const id = pondPicker.value;
  const month = monthPicker.value;

  const chosenPonds =
    id === "all" ? ponds : ponds.filter((pond) => pondId(pond) === id);

  const ids = new Set(chosenPonds.map(pondId));

  const relevantTransactions = allTxs.filter((tx) =>
    ids.has(String(tx.pondId)),
  );

  const transactions = relevantTransactions.filter((tx) =>
    String(tx.date || "").startsWith(month),
  );

  const previousTransactions = relevantTransactions.filter((tx) =>
    String(tx.date || "").startsWith(previousMonth(month)),
  );

  return {
    ponds,
    chosenPonds,
    transactions,
    previousTransactions,
    allTransactions: relevantTransactions,
    month,
    selectedPond: id,
  };
}

function totals(items) {
  let income = 0;
  let expense = 0;

  const categories = {};

  for (const tx of items) {
    const amount = Number(tx.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      continue;
    }

    if (tx.type === "income") {
      income += amount;
    }

    if (tx.type === "expense") {
      expense += amount;

      const category = String(tx.category || "อื่น ๆ").trim() || "อื่น ๆ";

      categories[category] = (categories[category] || 0) + amount;
    }
  }

  return {
    income,
    expense,
    profit: income - expense,
    categories,
  };
}

function buildAnalysis(data) {
  const current = totals(data.transactions);
  const previous = totals(data.previousTransactions);

  const expenseCategories = Object.entries(current.categories)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage:
        current.expense > 0
          ? Number(((amount / current.expense) * 100).toFixed(2))
          : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const pondAnalysis = data.chosenPonds.map((pond) => {
    const id = pondId(pond);

    const pondTransactions = data.transactions.filter(
      (tx) => String(tx.pondId) === id,
    );

    const result = totals(pondTransactions);
    const fishCount = Number(pond.fishCount) || 0;

    return {
      pondId: id,
      pondNumber: pond.pondNumber,
      fishSpecies: pond.fishSpecies,
      fishCount,
      income: result.income,
      expense: result.expense,
      profit: result.profit,
      profitMargin:
        result.income > 0
          ? Number(((result.profit / result.income) * 100).toFixed(2))
          : null,
      recordedExpensePerFish:
        fishCount > 0 ? Number((result.expense / fishCount).toFixed(2)) : null,
      transactionCount: pondTransactions.length,
    };
  });

  const monthlyTrend = [];

  for (let offset = -5; offset <= 0; offset++) {
    const month = shiftMonth(data.month, offset);

    const monthTransactions = data.allTransactions.filter((tx) =>
      String(tx.date || "").startsWith(month),
    );

    const result = totals(monthTransactions);

    monthlyTrend.push({
      month,
      monthLabel: monthLabel(month),
      income: result.income,
      expense: result.expense,
      profit: result.profit,
      transactionCount: monthTransactions.length,
    });
  }

  const profitMargin =
    current.income > 0 ? (current.profit / current.income) * 100 : null;

  const previousProfitMargin =
    previous.income > 0 ? (previous.profit / previous.income) * 100 : null;

  const expenseChangePercent =
    previous.expense > 0
      ? ((current.expense - previous.expense) / previous.expense) * 100
      : null;

  const incomeChangePercent =
    previous.income > 0
      ? ((current.income - previous.income) / previous.income) * 100
      : null;

  const topExpense = expenseCategories[0] || null;

  const highestProfitPond =
    pondAnalysis.length > 0
      ? [...pondAnalysis].sort((a, b) => b.profit - a.profit)[0]
      : null;

  const highestExpensePond =
    pondAnalysis.length > 0
      ? [...pondAnalysis].sort((a, b) => b.expense - a.expense)[0]
      : null;

  const lossPonds = pondAnalysis.filter((pond) => pond.profit < 0);

  return {
    month: data.month,
    monthLabel: monthLabel(data.month),
    selectedPond: data.selectedPond,

    summary: {
      income: current.income,
      expense: current.expense,
      profit: current.profit,
      profitMargin:
        profitMargin === null ? null : Number(profitMargin.toFixed(2)),
      transactionCount: data.transactions.length,
    },

    comparison: {
      previousIncome: previous.income,
      previousExpense: previous.expense,
      previousProfit: previous.profit,
      previousProfitMargin:
        previousProfitMargin === null
          ? null
          : Number(previousProfitMargin.toFixed(2)),
      incomeChange: current.income - previous.income,
      expenseChange: current.expense - previous.expense,
      profitChange: current.profit - previous.profit,
      incomeChangePercent:
        incomeChangePercent === null
          ? null
          : Number(incomeChangePercent.toFixed(2)),
      expenseChangePercent:
        expenseChangePercent === null
          ? null
          : Number(expenseChangePercent.toFixed(2)),
      previousTransactionCount: data.previousTransactions.length,
    },

    expenseCategories,
    topExpense,
    pondAnalysis,
    highestProfitPond,
    highestExpensePond,
    lossPonds,
    monthlyTrend,

    dataLimitations: [
      "ข้อมูลมาจากรายการที่ผู้ใช้บันทึกเท่านั้น",
      "เดือนที่ไม่มีรายการบันทึกไม่ยืนยันว่าไม่มีรายรับหรือรายจ่ายจริง",
      "จำนวนปลาอาจไม่ใช่จำนวนปลาที่ขายหรือเก็บเกี่ยว",
      "รายจ่ายต่อปลาเป็นค่าใช้จ่ายที่บันทึกในเดือนนั้นหารด้วยจำนวนปลาที่ระบุ ไม่ใช่ต้นทุนตลอดรอบการผลิต",
      "ข้อมูลย้อนหลังที่แสดงจำกัดถึงเดือนที่เลือก",
    ],
  };
}

function renderDonut(categories) {
  const element = $("expense-donut");
  const list = $("category-list");

  list.replaceChildren();

  const pairs = Object.entries(categories)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = pairs.reduce((sum, [, value]) => sum + value, 0);

  if (!total) {
    element.style.background = "#eeeeee";
    list.textContent = "ยังไม่มีข้อมูลค่าใช้จ่ายในเดือนนี้";
    list.className = "category-list empty";
    return;
  }

  list.className = "category-list";

  let angle = 0;
  const stops = [];

  pairs.forEach(([name, value], index) => {
    const next = angle + (value / total) * 100;
    const color = COLORS[index % COLORS.length];

    stops.push(`${color} ${angle}% ${next}%`);

    angle = next;

    const row = document.createElement("div");
    row.className = "category-row";

    const label = document.createElement("span");
    const amount = document.createElement("strong");

    const percentage = (value / total) * 100;

    label.textContent = `● ${name} (${percent(percentage)}%)`;

    label.style.color = color;

    amount.textContent = `${money(value)} ฿`;

    row.append(label, amount);
    list.append(row);
  });

  element.style.background = `conic-gradient(${stops.join(",")})`;
}

function updateUrl() {
  const url = new URL(location.href);

  url.searchParams.set("month", monthPicker.value);

  url.searchParams.set("pond", pondPicker.value);

  history.replaceState(null, "", url);

  $("nav-summary").href = `index8.html?${url.searchParams.toString()}`;

  $("nav-ai").href = `index9.html?${url.searchParams.toString()}`;
}

async function post(path, payload, signal) {
  const controller = new AbortController();

  const onAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(API + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } finally {
    clearTimeout(timer);

    if (signal) {
      signal.removeEventListener("abort", onAbort);
    }
  }
}

function addMessage(role, content) {
  const container = $("chat-messages");

  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.textContent = String(content ?? "");

  container.append(message);

  container.scrollTop = container.scrollHeight;
}

function resetChat() {
  chatVersion++;

  if (chatController) {
    chatController.abort();
    chatController = null;
  }

  chatHistory = [];

  $("chat-messages").replaceChildren();

  addMessage(
    "assistant",
    "ถามได้เลย เช่น บ่อไหนกำไรมากที่สุด ค่าอาหารปลาเดือนนี้เท่าไร หรือควรลดต้นทุนส่วนไหน?",
  );

  $("chat-status").textContent = "";
  $("send-button").disabled = false;
}

function analysisPayload(data) {
  return {
    ...data,
    analysis: buildAnalysis(data),
    analysisLevel: "detailed",
    language: "th",
    focus: [
      "profitability",
      "expense_breakdown",
      "pond_comparison",
      "monthly_trends",
      "cost_optimization",
      "actionable_recommendations",
    ],
  };
}

function render() {
  renderVersion++;
  const version = renderVersion;

  if (analysisController) {
    analysisController.abort();
  }

  analysisController = new AbortController();

  updateUrl();

  const data = selectedData();
  const current = totals(data.transactions);
  const previous = totals(data.previousTransactions);

  $("welcome-month").textContent = `ประจำเดือน${monthLabel(data.month)}`;

  $("pond-title").textContent =
    data.selectedPond === "all"
      ? "ข้อมูลทุกบ่อรวมกัน"
      : `บ่อที่ ${data.chosenPonds[0]?.pondNumber ?? "-"} : ${data.chosenPonds[0]?.fishSpecies ?? "-"}`;

  $("profit").textContent = `${money(current.profit)} บาท`;

  $("income-expense").textContent =
    `รายรับ ${money(current.income)} • รายจ่าย ${money(current.expense)} บาท`;

  $("profit-card").classList.toggle("loss", current.profit < 0);

  const hasPreviousData = data.previousTransactions.length > 0;

  const profitDifference = current.profit - previous.profit;

  $("change").textContent = hasPreviousData
    ? `${profitDifference >= 0 ? "+" : ""}${money(profitDifference)} ฿`
    : "—";

  renderDonut(current.categories);

  $("recommendation").textContent = "กำลังวิเคราะห์ข้อมูลฟาร์มอย่างละเอียด...";

  resetChat();

  const payload = analysisPayload(data);

  post("/api/analysis", payload, analysisController.signal)
    .then((result) => {
      if (version !== renderVersion) {
        return;
      }

      $("recommendation").textContent =
        result.advice || "ยังไม่มีคำแนะนำจาก AI";
    })
    .catch((error) => {
      if (version !== renderVersion || error.name === "AbortError") {
        return;
      }

      console.error("AI Analysis Error:", error);

      $("recommendation").textContent =
        "ไม่สามารถเชื่อมต่อ AI Server ได้ กรุณาลองใหม่อีกครั้ง";
    });
}

$("chat-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const input = $("chat-input");
  const question = input.value.trim();

  if (!question) {
    return;
  }

  const version = chatVersion;
  const currentRenderVersion = renderVersion;

  const data = selectedData();

  const payload = {
    ...analysisPayload(data),
    question,
    history: chatHistory.slice(-10),
  };

  const controller = new AbortController();
  chatController = controller;

  input.value = "";

  addMessage("user", question);

  $("send-button").disabled = true;
  $("chat-status").textContent = "AI กำลังวิเคราะห์และตอบคำถาม...";

  try {
    const result = await post("/api/ask", payload, controller.signal);

    if (version !== chatVersion || currentRenderVersion !== renderVersion) {
      return;
    }

    const answer = String(result.answer || "AI ยังไม่มีคำตอบสำหรับคำถามนี้");

    addMessage("assistant", answer);

    chatHistory.push(
      {
        role: "user",
        content: question,
      },
      {
        role: "assistant",
        content: answer,
      },
    );

    $("chat-status").textContent = "";
  } catch (error) {
    if (
      version !== chatVersion ||
      currentRenderVersion !== renderVersion ||
      error.name === "AbortError"
    ) {
      return;
    }

    console.error("AI Chat Error:", error);

    addMessage("assistant", `ยังตอบไม่ได้: ${error.message}`);

    $("chat-status").textContent =
      "ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่อีกครั้ง";
  } finally {
    if (version === chatVersion && currentRenderVersion === renderVersion) {
      $("send-button").disabled = false;
      chatController = null;
      input.focus();
    }
  }
});

monthPicker.addEventListener("change", render);

pondPicker.addEventListener("change", render);

populateFilters();
render();
