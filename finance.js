const POND_KEY = "farmExpensePonds";
const TX_KEY = "farmExpenseTransactions";
const params = new URLSearchParams(window.location.search);
const pondId = params.get("pond");

function getJSON(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error("อ่านข้อมูลไม่สำเร็จ:", key, error);
    return [];
  }
}
function ponds() {
  return getJSON(POND_KEY);
}
function txs() {
  return getJSON(TX_KEY);
}
function currentPond() {
  return (
    ponds().find((p) => String(p.id ?? p.pondNumber) === String(pondId)) ||
    ponds().find((p) => String(p.pondNumber) === String(pondId))
  );
}
function period(date) {
  return String(date || "").slice(0, 7);
}
function money(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  });
}
function link(
  page,
  month = document.getElementById("month-picker")?.value || params.get("month"),
) {
  const q = new URLSearchParams();
  q.set("pond", pondId || "");
  if (month) q.set("month", month);
  return `${page}.html?${q}`;
}
function setup() {
  const pond = currentPond();
  if (!pond) {
    alert("ไม่พบข้อมูลบ่อ กรุณาเลือกบ่อใหม่");
    window.location.replace("index4.html");
    return null;
  }
  const title = document.getElementById("pond-title");
  const count = document.getElementById("fish-count");
  if (title)
    title.textContent = `บ่อที่ ${pond.pondNumber} : ${pond.fishSpecies}`;
  if (count) count.textContent = `จำนวนปลา ${money(pond.fishCount)} ตัว`;
  const picker = document.getElementById("month-picker");
  if (!picker) return pond;
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const requested = params.get("month");
  const selected = /^\d{4}-(0[1-9]|1[0-2])$/.test(requested || "")
    ? requested
    : current;
  const months = new Set([selected]);
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  for (const t of txs()) {
    if (
      String(t.pondId) === String(pondId) &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(period(t.date))
    ) {
      months.add(period(t.date));
    }
  }
  picker.replaceChildren();
  for (const value of [...months].sort().reverse()) {
    const [year, month] = value.split("-").map(Number);
    const option = document.createElement("option");
    option.value = value;
    option.textContent = `เดือน${new Intl.DateTimeFormat("th-TH", { month: "long" }).format(new Date(year, month - 1, 1))} ${year + 543}`;
    picker.append(option);
  }
  picker.value = selected;
  picker.addEventListener("change", () => {
    window.location.href = link(
      location.pathname
        .split("/")
        .pop()
        .replace(/\.html$/, ""),
      picker.value,
    );
  });
  return pond;
}
function entries() {
  const selected = document.getElementById("month-picker")?.value;
  return txs().filter(
    (t) => String(t.pondId) === String(pondId) && period(t.date) === selected,
  );
}
function sum(type) {
  return entries()
    .filter((t) => t.type === type)
    .reduce((total, t) => total + Number(t.amount || 0), 0);
}
function saveEntry(type) {
  const form = document.getElementById("entry-form");
  const errorBox = document.getElementById("error");
  if (!form) {
    console.error("ไม่พบ form id=entry-form");
    return;
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (errorBox) errorBox.textContent = "";
    const category = document.getElementById("category")?.value.trim() || "";
    const amount = Number(document.getElementById("amount")?.value);
    const date = document.getElementById("date")?.value || "";
    const details = document.getElementById("details")?.value.trim() || "";
    if (
      !category ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      if (errorBox)
        errorBox.textContent = "กรุณากรอกประเภท จำนวนเงินมากกว่า 0 และวันที่";
      return;
    }
    const record = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      pondId: String(pondId),
      type,
      category,
      amount,
      date,
      details,
    };
    try {
      const data = txs();
      data.push(record);
      localStorage.setItem(TX_KEY, JSON.stringify(data));
      if (!txs().some((t) => t.id === record.id))
        throw new Error("ตรวจสอบข้อมูลที่บันทึกไม่ผ่าน");
      window.location.assign(link("index5", period(date)));
    } catch (error) {
      console.error("บันทึกข้อมูลไม่สำเร็จ", error);
      if (errorBox)
        errorBox.textContent =
          "บันทึกไม่สำเร็จ กรุณาตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์";
    }
  });
}
