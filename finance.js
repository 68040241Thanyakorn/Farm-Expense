
"use strict";

const POND_KEY = "farmExpensePonds";
const TX_KEY = "farmExpenseTransactions";
const SELECTED_POND_KEY = "farmExpenseSelectedPond";

const params = new URLSearchParams(window.location.search);

const pondId =
  params.get("pond") ||
  localStorage.getItem(SELECTED_POND_KEY);

function getJSON(key) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

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
  if (!pondId) return null;

  return ponds().find(
    p =>
      String(p.id ?? p.pondNumber) === String(pondId) ||
      String(p.pondNumber) === String(pondId)
  ) || null;
}

function activePondId() {
  const pond = currentPond();

  return pond
    ? String(pond.id ?? pond.pondNumber)
    : null;
}

function period(date) {
  return String(date || "").slice(0, 7);
}

function validMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(0);
  date.setFullYear(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function money(value) {
  const number = Number(value);

  return (Number.isFinite(number) ? number : 0)
    .toLocaleString("th-TH", {
      maximumFractionDigits: 2
    });
}

function link(
  page,
  month =
    document.getElementById("month-picker")?.value ||
    params.get("month")
) {
  const query = new URLSearchParams();
  const id = activePondId() || pondId;

  if (id) {
    query.set("pond", id);
  }

  if (validMonth(month)) {
    query.set("month", month);
  }

  const queryString = query.toString();

  return `${page}.html${queryString ? "?" + queryString : ""}`;
}

function setup() {
  const pond = currentPond();

  if (!pond) {
    alert("ไม่พบข้อมูลบ่อ กรุณาเลือกบ่อใหม่");
    window.location.replace("index4.html");
    return null;
  }

  const id = activePondId();

  localStorage.setItem(SELECTED_POND_KEY, id);

  const title = document.getElementById("pond-title");
  const count = document.getElementById("fish-count");

  if (title) {
    title.textContent =
      `บ่อที่ ${pond.pondNumber} : ${pond.fishSpecies}`;
  }

  if (count) {
    count.textContent =
      `จำนวนปลา ${money(pond.fishCount)} ตัว`;
  }

  const picker = document.getElementById("month-picker");

  if (!picker) {
    return pond;
  }

  const now = new Date();

  const current =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

  const requested = params.get("month");

  const selected = validMonth(requested)
    ? requested
    : current;

  const months = new Set([selected]);

  for (let i = 0; i < 12; i++) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );

    const value =
      `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

    months.add(value);
  }

  for (const tx of txs()) {
    if (
      String(tx.pondId) === id &&
      validMonth(period(tx.date))
    ) {
      months.add(period(tx.date));
    }
  }

  picker.replaceChildren();

  for (const value of [...months].sort().reverse()) {
    const [year, month] = value.split("-").map(Number);

    const option = document.createElement("option");

    option.value = value;

    const monthName = new Intl.DateTimeFormat(
      "th-TH",
      { month: "long" }
    ).format(new Date(year, month - 1, 1));

    option.textContent =
      `เดือน${monthName} ${year + 543}`;

    picker.append(option);
  }

  picker.value = selected;

  picker.addEventListener("change", () => {
    const currentPage = window.location.pathname
      .split("/")
      .pop()
      .replace(/\.html$/i, "");

    window.location.href = link(
      currentPage,
      picker.value
    );
  });

  return pond;
}

function entries() {
  const id = activePondId();

  const selected =
    document.getElementById("month-picker")?.value ||
    params.get("month");

  if (!id || !validMonth(selected)) {
    return [];
  }

  return txs().filter(
    tx =>
      String(tx.pondId) === id &&
      period(tx.date) === selected
  );
}

function sum(type) {
  return entries()
    .filter(tx => tx.type === type)
    .reduce((total, tx) => {
      const amount = Number(tx.amount);

      if (!Number.isFinite(amount) || amount < 0) {
        return total;
      }

      return total + amount;
    }, 0);
}

function saveEntry(type) {
  const form = document.getElementById("entry-form");
  const errorBox = document.getElementById("error");

  if (!form) {
    console.error("ไม่พบ form id=entry-form");
    return;
  }

  if (!["income", "expense"].includes(type)) {
    console.error("ประเภทข้อมูลไม่ถูกต้อง:", type);
    return;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    if (errorBox) {
      errorBox.textContent = "";
    }

    const category =
      document.getElementById("category")?.value.trim() || "";

    const amount = Number(
      document.getElementById("amount")?.value
    );

    const date =
      document.getElementById("date")?.value || "";

    const details =
      document.getElementById("details")?.value.trim() || "";

    const id = activePondId();

    if (!id) {
      if (errorBox) {
        errorBox.textContent =
          "ไม่พบข้อมูลบ่อ กรุณาเลือกบ่อใหม่";
      }
      return;
    }

    if (
      !category ||
      !validDate(date) ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      if (errorBox) {
        errorBox.textContent =
          "กรุณากรอกประเภท จำนวนเงินมากกว่า 0 และวันที่ที่ถูกต้อง";
      }
      return;
    }

    const record = {
      id:
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      pondId: id,
      type,
      category,
      amount,
      date,
      details
    };

    try {
      const data = txs();

      data.push(record);

      localStorage.setItem(
        TX_KEY,
        JSON.stringify(data)
      );

      const saved = txs().some(
        tx => tx.id === record.id
      );

      if (!saved) {
        throw new Error(
          "ตรวจสอบข้อมูลที่บันทึกไม่ผ่าน"
        );
      }

      window.location.assign(
        link("index5", period(date))
      );

    } catch (error) {
      console.error(
        "บันทึกข้อมูลไม่สำเร็จ:",
        error
      );

      if (errorBox) {
        errorBox.textContent =
          "บันทึกไม่สำเร็จ กรุณาตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์";
      }
    }
  });
}
