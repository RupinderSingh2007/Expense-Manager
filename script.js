// State + Storage Keys (local storage)
const STORAGE = {
  transactions: "transactions",
  budgets: "budgets",
  categories: "categories",
  currency: "currency",
  theme: "theme",
  calendarLimits: "calendarLimits",
};
// default categories
const DEFAULT_CATEGORIES = [
  "Food", "Rent", "Travel", "Shopping", "Salary",
  "Entertainment", "Health", "Education", "Subscriptions",
];
// assigning a constant to calendar limits
const DEFAULT_CAL_LIMITS = { low: 500, medium: 1500 };

let state = {
  transactions: [],
  budgets: {},
  categories: [...DEFAULT_CATEGORIES],
  currency: "₹",
  theme: "light",
  calendarLimits: { ...DEFAULT_CAL_LIMITS },

  showAllTransactions: false,
  currentCalendarDate: new Date(),
};

let dom = {};
let expenseChart = null;

// Boot
document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  loadState();
  applyTheme(state.theme);
  bindEvents();
  hydrateSelects();
  renderAll();
});

// DOM Cache
function cacheDom() {
  dom = {
    // Tabs + Views
    tabDashboard: document.getElementById("tab-dashboard"),
    tabCalendar: document.getElementById("tab-calendar"),
    viewDashboard: document.getElementById("dashboard-view"),
    viewCalendar: document.getElementById("calendar-view"),
    // Header controls
    themeToggle: document.getElementById("theme-toggle"),
    settingsBtn: document.querySelector(".settings-btn"),
    settingsMenu: document.getElementById("settingsMenu"),
    // Form
    form: document.getElementById("transaction-form"),
    description: document.getElementById("description"),
    amount: document.getElementById("amount"),
    category: document.getElementById("category"),
    type: document.getElementById("type"),
    // Transaction list
    txList: document.getElementById("transaction-list"),
    toggleTransactions: document.getElementById("toggle-transactions"),
    // Summary
    totalBalance: document.getElementById("total-balance"),
    totalIncome: document.getElementById("total-income"),
    totalExpense: document.getElementById("total-expense"),
    // Chart
    chartCanvas: document.getElementById("expenseChart"),
    // Smart alerts
    budgetAlertContent: document.getElementById("budget-alert-content"),
    // Settings actions
    downloadBtn: document.getElementById("download-btn"),
    resetBtn: document.getElementById("reset-btn"),
    currencySelect: document.getElementById("currency-select"),
    // Budgets settings panel
    toggleBudgetSettings: document.getElementById("toggle-budget-settings"),
    budgetPanel: document.getElementById("budgetSettings"),
    budgetCategory: document.getElementById("budget-category"),
    budgetAmount: document.getElementById("budget-amount"),
    saveBudgetBtn: document.getElementById("save-budget-btn"),
    // Categories
    newCategory: document.getElementById("new-category"),
    addCategoryBtn: document.getElementById("add-category-btn"),
    deleteCategoryBtn: document.getElementById("delete-category-btn"),
    // Calendar
    prevMonth: document.getElementById("prev-month"),
    nextMonth: document.getElementById("next-month"),
    calendarTitle: document.getElementById("calendar-title"),
    calendarGrid: document.querySelector(".calendar-grid"),
    limitLow: document.getElementById("limit-low"),
    limitMedium: document.getElementById("limit-medium"),
    saveCalLimits: document.getElementById("save-calendar-limits"),
    dayDetails: document.getElementById("day-details"),
  };
}
// State Load/Save
function loadState() {
  state.transactions = safeParse(localStorage.getItem(STORAGE.transactions), []);
  state.budgets = safeParse(localStorage.getItem(STORAGE.budgets), {});
  state.categories = safeParse(localStorage.getItem(STORAGE.categories), [...DEFAULT_CATEGORIES]);
  state.currency = localStorage.getItem(STORAGE.currency) || "₹";
  state.theme = localStorage.getItem(STORAGE.theme) || "light";
  state.calendarLimits = safeParse(localStorage.getItem(STORAGE.calendarLimits), { ...DEFAULT_CAL_LIMITS });
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
// Events
function bindEvents() {
  // Tabs
  dom.tabDashboard?.addEventListener("click", () => showView("dashboard"));
  dom.tabCalendar?.addEventListener("click", () => {
    showView("calendar");
    syncCalendarLimitsInputs();
    renderCalendar();
  });
  // Theme
  dom.themeToggle?.addEventListener("click", () => {
    state.theme = document.body.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem(STORAGE.theme, state.theme);
    applyTheme(state.theme);
  });
  // Settings open/close
  dom.settingsBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    dom.settingsMenu?.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!dom.settingsMenu || !dom.settingsBtn) return;
    const clickedMenu = dom.settingsMenu.contains(e.target);
    const clickedBtn = dom.settingsBtn.contains(e.target);
    if (!clickedMenu && !clickedBtn) dom.settingsMenu.classList.add("hidden");
  });
  // Add transaction
  dom.form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const desc = dom.description.value.trim();
    const amt = Number(dom.amount.value);

    if (!desc || !Number.isFinite(amt) || amt <= 0) return;

    state.transactions.push({
      id: Date.now(),
      description: desc,
      amount: amt,
      category: dom.category.value,
      type: dom.type.value,
      date: new Date().toISOString(),
    });

    save(STORAGE.transactions, state.transactions);
    dom.form.reset();
    renderAll();
  });
  // Transaction list delete
  dom.txList?.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-tx-btn");
    if (!btn) return;

    const id = Number(btn.dataset.id);
    if (!Number.isFinite(id)) return;

    if (!confirm("Delete this transaction?")) return;

    state.transactions = state.transactions.filter(t => t.id !== id);
    save(STORAGE.transactions, state.transactions);
    renderAll();
  });
  // Show more / less
  dom.toggleTransactions?.addEventListener("click", () => {
    state.showAllTransactions = !state.showAllTransactions;
    renderTransactionHistory();
  });
  // Currency
  dom.currencySelect?.addEventListener("change", (e) => {
    state.currency = e.target.value;
    localStorage.setItem(STORAGE.currency, state.currency);
    renderAll();
  });
  // Download
  dom.downloadBtn?.addEventListener("click", downloadCSV);
  // Reset
  dom.resetBtn?.addEventListener("click", () => {
    if (!confirm("Are you sure you want to delete all data?")) return;

    state.transactions = [];
    state.budgets = {};
    state.categories = [...DEFAULT_CATEGORIES];

    localStorage.removeItem(STORAGE.transactions);
    localStorage.removeItem(STORAGE.budgets);
    localStorage.removeItem(STORAGE.categories);

    hydrateSelects();
    renderAll();
  });
  // Budget panel toggle
  dom.toggleBudgetSettings?.addEventListener("click", () => {
    if (!dom.budgetPanel) return;
    dom.budgetPanel.classList.toggle("hidden");
    dom.toggleBudgetSettings.textContent = dom.budgetPanel.classList.contains("hidden")
      ? "Budgets"
      : "Budgets";
  });
  // Budget save
  dom.saveBudgetBtn?.addEventListener("click", () => {
    const cat = dom.budgetCategory.value;
    const amt = Number(dom.budgetAmount.value);

    if (!cat) return alert("Please select a category.");
    if (!Number.isFinite(amt) || amt <= 0) return alert("Please enter a valid budget amount.");

    state.budgets[cat] = amt;
    save(STORAGE.budgets, state.budgets);

    renderBudgetAlerts();
    dom.saveBudgetBtn.textContent = "Saved";
    setTimeout(() => (dom.saveBudgetBtn.textContent = "Save Budget"), 900);
  });
  // Budget category change -> load saved value
  dom.budgetCategory?.addEventListener("change", () => {
    const cat = dom.budgetCategory.value;
    dom.budgetAmount.value = state.budgets[cat] ?? "";
  });
  // Category add/delete
  dom.addCategoryBtn?.addEventListener("click", () => {
    const name = dom.newCategory.value.trim();
    if (!name) return alert("Category name required");
    if (state.categories.includes(name)) return alert("Category already exists");

    state.categories.push(name);
    save(STORAGE.categories, state.categories);

    hydrateSelects();
    dom.newCategory.value = "";
  });

  dom.deleteCategoryBtn?.addEventListener("click", () => {
    const name = dom.newCategory.value.trim();
    if (!name) return alert("Type a category name to delete");
    if (!state.categories.includes(name)) return alert("Category not found.");

    // Do NOT alter transactions
    state.categories = state.categories.filter(c => c !== name);
    save(STORAGE.categories, state.categories);

    // Remove budget entry for that category
    if (Object.prototype.hasOwnProperty.call(state.budgets, name)) {
      delete state.budgets[name];
      save(STORAGE.budgets, state.budgets);
    }

    hydrateSelects();
    renderBudgetAlerts();
    dom.newCategory.value = "";
    alert("Category deleted (transactions unchanged).");
  });
  // Calendar month navigation
  dom.prevMonth?.addEventListener("click", () => {
    state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });

  dom.nextMonth?.addEventListener("click", () => {
    state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });
  // Calendar limits save
  dom.saveCalLimits?.addEventListener("click", () => {
    const low = Number(dom.limitLow.value);
    const med = Number(dom.limitMedium.value);

    if (!Number.isFinite(low) || !Number.isFinite(med) || low <= 0 || med <= 0 || low >= med) {
      alert("Please enter valid limits (Low < Moderate).");
      return;
    }

    state.calendarLimits = { low, medium: med };
    save(STORAGE.calendarLimits, state.calendarLimits);
    renderCalendar();
  });
}
// Theme
function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.body.classList.remove("light", "dark");
  document.body.classList.add(t);

  if (dom.themeToggle) dom.themeToggle.textContent = t === "dark" ? "☀️" : "🌙";
}
// View switching
function showView(view) {
  const isDashboard = view === "dashboard";

  dom.viewDashboard?.classList.toggle("hidden", !isDashboard);
  dom.viewCalendar?.classList.toggle("hidden", isDashboard);

  dom.tabDashboard?.classList.toggle("active", isDashboard);
  dom.tabCalendar?.classList.toggle("active", !isDashboard);

  if (!isDashboard) renderCalendar();
}
// Select hydration (categories everywhere)
function hydrateSelects() {
  // Categories in transaction form
  if (dom.category) fillSelect(dom.category, state.categories);
  // Categories in budget settings
  if (dom.budgetCategory) fillSelect(dom.budgetCategory, state.categories);
  // Currency select
  if (dom.currencySelect) dom.currencySelect.value = state.currency;
  // Budget amount input sync
  if (dom.budgetCategory && dom.budgetAmount) {
    const cat = dom.budgetCategory.value;
    dom.budgetAmount.value = state.budgets[cat] ?? "";
  }
}

function fillSelect(selectEl, values) {
  const current = selectEl.value;
  selectEl.innerHTML = "";
  values.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
  if (values.includes(current)) selectEl.value = current;
}
// Render: All
function renderAll() {
  renderTransactionHistory();
  renderSummary();
  renderChart();
  renderBudgetAlerts();
  // Keep calendar updated if open
  if (dom.viewCalendar && !dom.viewCalendar.classList.contains("hidden")) {
    syncCalendarLimitsInputs();
    renderCalendar();
  }
}
// Transactions
function renderTransactionHistory() {
  if (!dom.txList) return;

  dom.txList.innerHTML = "";

  const all = [...state.transactions];
  const toShow = state.showAllTransactions ? all.slice().reverse() : all.slice(-3).reverse();

  toShow.forEach(renderTransactionRow);
  // Toggle button visibility + label
  if (!dom.toggleTransactions) return;

  if (state.transactions.length <= 3) {
    dom.toggleTransactions.classList.add("hidden");
  } else {
    dom.toggleTransactions.classList.remove("hidden");
    dom.toggleTransactions.textContent = state.showAllTransactions ? "Show less" : "Show more";
  }
}

function renderTransactionRow(t) {
  const li = document.createElement("li");
  li.className = t.type;

  const dateStr = new Date(t.date).toLocaleDateString("default", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  li.innerHTML = `
    <span>
      <strong>${escapeHtml(t.description)}</strong><br>
      <small>${escapeHtml(t.category)} • ${dateStr}</small>
    </span>
    <span class="tx-right">
      <span>${t.type === "income" ? "+" : "-"}${state.currency}${t.amount}</span>
      <button class="delete-tx-btn" data-id="${t.id}" aria-label="Delete transaction">✖</button>
    </span>
  `;

  dom.txList.appendChild(li);
}
// Summary
function renderSummary() {
  let income = 0, expense = 0;

  state.transactions.forEach(t => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });

  if (dom.totalIncome) dom.totalIncome.textContent = `${state.currency}${income}`;
  if (dom.totalExpense) dom.totalExpense.textContent = `${state.currency}${expense}`;
  if (dom.totalBalance) dom.totalBalance.textContent = `${state.currency}${income - expense}`;
}
// pieChart
function renderChart() {
  if (!dom.chartCanvas || typeof Chart === "undefined") return;

  const data = {};
  state.transactions
    .filter(t => t.type === "expense")
    .forEach(t => { data[t.category] = (data[t.category] || 0) + t.amount; });

  if (expenseChart) expenseChart.destroy();

  expenseChart = new Chart(dom.chartCanvas, {
    type: "pie",
    data: {
      labels: Object.keys(data),
      datasets: [{ data: Object.values(data) }]
    },
    options: { plugins: { legend: { position: "bottom" } } }
  });
}
// Smart Budget Alerts
function renderBudgetAlerts() {
  if (!dom.budgetAlertContent) return;

  const budgetEntries = Object.entries(state.budgets || {});
  if (budgetEntries.length === 0) {
    dom.budgetAlertContent.innerHTML = `<p class="no-alerts">Set budgets to get smart alerts</p>`;
    return;
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  // Monthly spending per category
  const spentByCat = {};
  state.transactions.forEach(t => {
    if (t.type !== "expense") return;
    const d = new Date(t.date);
    if (d.getFullYear() !== y || d.getMonth() !== m) return;
    spentByCat[t.category] = (spentByCat[t.category] || 0) + t.amount;
  });

  // Render alerts -sorted by highest usage
  const rows = budgetEntries
    .map(([cat, limit]) => {
      const spent = spentByCat[cat] || 0;
      const pct = limit > 0 ? spent / limit : 0;

      let cls = "alert-success";
      let label = "On track ✅";

      if (pct >= 1) { cls = "alert-danger"; label = "Budget exceeded ❌"; }
      else if (pct >= 0.8) { cls = "alert-warning"; label = "Near limit ⚠️"; }

      return {
        cat,
        spent,
        limit,
        pct,
        cls,
        label
      };
    })
    .sort((a, b) => b.pct - a.pct);

  const monthName = now.toLocaleString("default", { month: "long" });

  dom.budgetAlertContent.innerHTML = `
    ${rows.map(r => `
      <p class="${r.cls}">
        <strong>${escapeHtml(r.cat)}</strong>: ${r.label}
        <small>${monthName}: ${state.currency}${r.spent} / ${state.currency}${r.limit}</small>
      </p>
    `).join("")}
  `;
}

// Calendar
function syncCalendarLimitsInputs() {
  if (dom.limitLow) dom.limitLow.value = state.calendarLimits.low;
  if (dom.limitMedium) dom.limitMedium.value = state.calendarLimits.medium;
}

function renderCalendar() {
  if (!dom.calendarGrid || !dom.calendarTitle) return;

  // Remove old day cells -keep weekday headers
  dom.calendarGrid.querySelectorAll(".calendar-day, .empty").forEach(el => el.remove());

  const year = state.currentCalendarDate.getFullYear();
  const month = state.currentCalendarDate.getMonth();

  dom.calendarTitle.textContent = `${state.currentCalendarDate.toLocaleString("default", { month: "long" })} ${year}`;

  // Monday-first start index
  const first = new Date(year, month, 1);
  const startIndex = first.getDay() === 0 ? 6 : first.getDay() - 1;

  for (let i = 0; i < startIndex; i++) {
    const empty = document.createElement("div");
    empty.className = "empty";
    dom.calendarGrid.appendChild(empty);
  }

  const dailyTotals = getMonthlyExpenseTotalsByDay(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-day";

    const spent = dailyTotals[day] || 0;

    cell.innerHTML = `
      <div class="date">${day}</div>
      ${spent ? `<div class="amount">${state.currency}${spent}</div>` : ""}
    `;

    applySpendingColor(cell, spent);

    cell.addEventListener("click", () => {
      dom.calendarGrid.querySelectorAll(".calendar-day.active").forEach(n => n.classList.remove("active"));
      cell.classList.add("active");
      renderDayDetails(year, month, day);
    });

    dom.calendarGrid.appendChild(cell);
  }
}

function getMonthlyExpenseTotalsByDay(year, month) {
  const totals = {};
  state.transactions.forEach(t => {
    if (t.type !== "expense") return;
    const d = new Date(t.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      totals[day] = (totals[day] || 0) + t.amount;
    }
  });
  return totals;
}

function applySpendingColor(cell, amount) {
  if (!amount) return;
  const { low, medium } = state.calendarLimits;

  cell.style.borderLeft =
    amount <= low ? "4px solid #22c55e" :
    amount <= medium ? "4px solid #facc15" :
    "4px solid #ef4444";
}

function renderDayDetails(year, month, day) {
  if (!dom.dayDetails) return;

  const list = state.transactions.filter(t => {
    if (t.type !== "expense") return false;
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  const titleDate = new Date(year, month, day).toDateString();

  if (list.length === 0) {
    dom.dayDetails.innerHTML = `
      <h3>Day Details</h3>
      <p class="muted">${titleDate}</p>
      <p class="muted">No expenses recorded</p>
    `;
    return;
  }

  const total = list.reduce((sum, t) => sum + t.amount, 0);

  dom.dayDetails.innerHTML = `
    <h3>Day Details</h3>
    <p class="muted">${titleDate}</p>
    <p><strong>Total:</strong> ${state.currency}${total}</p>
    ${list.map(t => `<p>${escapeHtml(t.description)} — ${state.currency}${t.amount}</p>`).join("")}
  `;
}

// CSV Download
function downloadCSV() {
  if (!state.transactions.length) {
    alert("No data to download");
    return;
  }

  const headers = ["Date", "Description", "Amount", "Category", "Type"];
  const rows = state.transactions.map(t => [
    new Date(t.date).toLocaleDateString(),
    t.description,
    t.amount,
    t.category,
    t.type
  ]);

  const csv = [
    headers.join(","),
    ...rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "expense-data.csv";
  a.click();

  URL.revokeObjectURL(url);
}

// to prevent XSS vulnerabilities
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
