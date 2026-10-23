
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Receipt,
  Trash2,
  X,
  CalendarDays,
  TrendingDown,
  PieChart,
  Loader2,
  CreditCard,
  Building2,
  Pencil,
  ChevronDown,
  RefreshCw,
  Droplet,
  Zap,
  Utensils,
  Wrench,
  Wifi,
  Users,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  getMyExpensesApi,
  getExpenseSummaryApi,
  createExpenseApi,
  updateExpenseApi,
  deleteExpenseApi,
} from "../../services/api";

import "./Expenses.css";

const categories = [
  { value: "rent", label: "Rent", color: "#16a34a" },
  { value: "electricity", label: "Electricity", color: "#22c55e" },
  { value: "water", label: "Water", color: "#3b82f6" },
  { value: "maintenance", label: "Maintenance", color: "#a855f7" },
  { value: "food", label: "Food", color: "#fbbf24" },
  { value: "salary", label: "Staff Salary", color: "#0d9488" },
  { value: "internet", label: "Internet", color: "#60a5fa" },
  { value: "cleaning", label: "Cleaning", color: "#f97316" },
  { value: "supplies", label: "Supplies", color: "#ec4899" },
  { value: "other", label: "Others", color: "#9ca3af" },
];

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const PAGE_SIZE = 8;

const todayString = () => {
  const date = new Date();
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 10);
};

const emptyForm = () => ({
  title: "",
  category: "maintenance",
  amount: "",
  expenseDate: todayString(),
  paymentMethod: "cash",
  notes: "",
});

const getMonthKey = (date) => {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  return `${parsed.getFullYear()}-${String(
    parsed.getMonth() + 1
  ).padStart(2, "0")}`;
};

const getMonthLabel = (key) => {
  if (!key || key === "unknown") return "Unknown date";

  const [year, month] = key.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" }
  );
};

const formatAmount = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getCategory = (value) =>
  categories.find((item) => item.value === value) ||
  categories[categories.length - 1];

const getPaymentLabel = (value) =>
  paymentMethods.find((item) => item.value === value)?.label ||
  "Other";

const getExpenseIcon = (category) => {
  const iconProps = { size: 19, strokeWidth: 2.1 };

  switch (category) {
    case "electricity":
      return <Zap {...iconProps} className="expense-icon-electricity" />;

    case "water":
      return <Droplet {...iconProps} className="expense-icon-water" />;

    case "food":
    case "supplies":
      return <Utensils {...iconProps} className="expense-icon-food" />;

    case "maintenance":
      return <Wrench {...iconProps} className="expense-icon-maintenance" />;

    case "internet":
      return <Wifi {...iconProps} className="expense-icon-internet" />;

    case "salary":
      return <Users {...iconProps} className="expense-icon-salary" />;

    case "cleaning":
      return <Sparkles {...iconProps} className="expense-icon-cleaning" />;

    case "rent":
      return <Building2 {...iconProps} className="expense-icon-rent" />;

    default:
      return <Receipt {...iconProps} />;
  }
};

function Expenses() {
  const [expenses, setExpenses] = useState([]);

  const [summary, setSummary] = useState({
    totalExpenses: 0,
    expenseCount: 0,
    monthlyTotal: 0,
    monthlyCount: 0,
    categoryTotals: {},
  });

  const notifyExpensesChanged = () => {
    window.dispatchEvent(
      new Event("pgmate-expenses-changed")
    );
  };

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState(
    getMonthKey(todayString())
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const [collapsedMonths, setCollapsedMonths] = useState({});

  // Read the PG selected by the owner.
  const selectedPgId = useCallback(() => {
    return localStorage.getItem("pgmate_active_pg") || "";
  }, []);

  // Load expenses and summary.
  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const pgId = selectedPgId();

      const [expenseResponse, summaryResponse] = await Promise.all([
        getMyExpensesApi(pgId, ""),
        getExpenseSummaryApi(pgId),
      ]);

      setExpenses(expenseResponse?.expenses || []);

      setSummary(
        summaryResponse?.summary || {
          totalExpenses: 0,
          expenseCount: 0,
          monthlyTotal: 0,
          monthlyCount: 0,
          categoryTotals: {},
        }
      );
    } catch (err) {
      console.error("Failed to load expenses:", err);
      setError(err.message || "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [selectedPgId]);

  useEffect(() => {
    const handlePGChange = () => {
      loadExpenses();
    };

    handlePGChange();

    window.addEventListener(
      "pgmate-pg-changed",
      handlePGChange
    );

    window.addEventListener("storage", handlePGChange);

    return () => {
      window.removeEventListener(
        "pgmate-pg-changed",
        handlePGChange
      );

      window.removeEventListener("storage", handlePGChange);
    };
  }, [loadExpenses]);

  // Available months for the filter.
  const availableMonths = useMemo(() => {
    const keys = new Set(
      expenses.map((item) => getMonthKey(item.expenseDate))
    );

    keys.add(getMonthKey(todayString()));

    return [...keys]
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  /*
   * DYNAMIC MONTHLY SPENDING TREND
   *
   * If a month is selected, show all 12 months
   * from that selected year.
   *
   * If All Months is selected, show the current year.
   */
  const monthlyTrend = useMemo(() => {
    const selectedYear =
      monthFilter === "all"
        ? new Date().getFullYear()
        : Number(monthFilter.slice(0, 4));

    return Array.from({ length: 12 }, (_, monthIndex) => {
      const total = expenses.reduce((sum, expense) => {
        const date = new Date(expense.expenseDate);

        if (
          !Number.isNaN(date.getTime()) &&
          date.getFullYear() === selectedYear &&
          date.getMonth() === monthIndex
        ) {
          return sum + Number(expense.amount || 0);
        }

        return sum;
      }, 0);

      return {
        month: new Date(
          selectedYear,
          monthIndex,
          1
        ).toLocaleDateString("en-IN", { month: "short" }),
        total,
      };
    });
  }, [expenses, monthFilter]);

  /*
   * DYNAMIC CATEGORY BREAKDOWN
   *
   * IMPORTANT CHANGE:
   * Calculate category totals using only the selected month.
   * When monthFilter is "all", use all expenses.
   */
  const categoryBreakdown = useMemo(() => {
    const monthExpenses = expenses.filter((expense) => {
      if (monthFilter === "all") {
        return true;
      }

      return getMonthKey(expense.expenseDate) === monthFilter;
    });

    const totals = categories.map((category) => {
      const total = monthExpenses.reduce((sum, expense) => {
        if (expense.category !== category.value) {
          return sum;
        }

        return sum + Number(expense.amount || 0);
      }, 0);

      return {
        ...category,
        total,
      };
    });

    const grandTotal = totals.reduce(
      (sum, item) => sum + item.total,
      0
    );

    return totals
      .map((item) => ({
        ...item,
        percentage: grandTotal
          ? Math.round((item.total / grandTotal) * 100)
          : 0,
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [expenses, monthFilter]);

  // Total represented by the selected month's pie chart.
  const categoryChartTotal = useMemo(() => {
    return categoryBreakdown.reduce(
      (sum, item) => sum + item.total,
      0
    );
  }, [categoryBreakdown]);

  // Dynamically generate pie chart colors and segment sizes.
  const categoryGradient = useMemo(() => {
    if (!categoryChartTotal) {
      return "#e7f1ed";
    }

    let current = 0;

    const segments = categoryBreakdown.map((item) => {
      const start = current;

      current += (item.total / categoryChartTotal) * 100;

      return `${item.color} ${start}% ${current}%`;
    });

    return `conic-gradient(${segments.join(", ")})`;
  }, [categoryBreakdown, categoryChartTotal]);

  // Search and filter expense records.
  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const category = getCategory(expense.category);

      const pgName =
        typeof expense.pgId === "object"
          ? expense.pgId?.name || ""
          : "";

      const matchesSearch =
        !query ||
        [
          expense.title,
          expense.category,
          category.label,
          pgName,
          expense.notes,
          getPaymentLabel(expense.paymentMethod),
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );

      const matchesMonth =
        monthFilter === "all" ||
        getMonthKey(expense.expenseDate) === monthFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        expense.category === categoryFilter;

      const matchesPayment =
        paymentFilter === "all" ||
        expense.paymentMethod === paymentFilter;

      return (
        matchesSearch &&
        matchesMonth &&
        matchesCategory &&
        matchesPayment
      );
    });
  }, [
    expenses,
    search,
    monthFilter,
    categoryFilter,
    paymentFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredExpenses.length / PAGE_SIZE)
  );

  useEffect(() => {
    setPage(1);
  }, [search, monthFilter, categoryFilter, paymentFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;

    return filteredExpenses.slice(start, start + PAGE_SIZE);
  }, [filteredExpenses, page]);

  const groupedExpenses = useMemo(() => {
    const groups = new Map();

    paginatedExpenses.forEach((expense) => {
      const key = getMonthKey(expense.expenseDate) || "unknown";

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(expense);
    });

    return [...groups.entries()].sort((a, b) =>
      b[0].localeCompare(a[0])
    );
  }, [paginatedExpenses]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setForm(emptyForm());
    setError("");
    setShowModal(true);
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);

    setForm({
      title: expense.title || "",
      category: expense.category || "other",
      amount: String(expense.amount ?? ""),
      expenseDate: expense.expenseDate
        ? (() => {
          const date = new Date(expense.expenseDate);
          const localDate = new Date(
            date.getTime() - date.getTimezoneOffset() * 60000
          );

          return localDate.toISOString().slice(0, 10);
        })()
        : todayString(),
      paymentMethod: expense.paymentMethod || "cash",
      notes: expense.notes || "",
    });

    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setNotice("");

    const title = form.title.trim();
    const amount = Number(form.amount);
    const expenseDate = form.expenseDate;

    if (!title || !form.amount || !expenseDate) {
      setError("Please fill in the title, amount and date.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    const pgId = selectedPgId();

    if (!editingExpense && !pgId) {
      setError(
        "No PG is selected. Please select a PG first, then try again."
      );
      return;
    }

    try {
      setSubmitting(true);

      const expenseData = {
        title,
        category: form.category,
        amount,
        expenseDate,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim(),
      };

      if (editingExpense) {
        await updateExpenseApi(
          editingExpense._id,
          expenseData
        );

        setNotice("Expense updated successfully.");
      } else {
        await createExpenseApi({
          ...expenseData,
          pgId,
        });

        setNotice("Expense added successfully.");
      }

      notifyExpensesChanged();

      setShowModal(false);
      setEditingExpense(null);
      setForm(emptyForm());

      await loadExpenses();
    } catch (err) {
      console.error("Unable to save expense:", err);
      setError(err.message || "Unable to save the expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expense) => {
    const confirmed = window.confirm(
      `Delete "${expense.title}" (${formatAmount(
        expense.amount
      )})? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(expense._id);
      setError("");
      setNotice("");

      await deleteExpenseApi(expense._id);

      notifyExpensesChanged();

      setExpenses((previous) =>
        previous.filter((item) => item._id !== expense._id)
      );

      setNotice("Expense deleted successfully.");

      await loadExpenses();
    } catch (err) {
      console.error("Unable to delete expense:", err);
      setError(err.message || "Unable to delete the expense.");
    } finally {
      setDeletingId("");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setMonthFilter("all");
    setCategoryFilter("all");
    setPaymentFilter("all");
    setPage(1);
  };

  const toggleMonth = (key) => {
    setCollapsedMonths((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const currentMonthTotal = Number(summary.monthlyTotal || 0);

  const maxTrend = Math.max(
    ...monthlyTrend.map((item) => item.total),
    1
  );

  if (loading) {
    return (
      <div className="expenses-page">
        <div className="expenses-loading-card">
          <div className="expenses-loading-icon">
            <Loader2 size={24} className="expenses-spinner" />
          </div>

          <div>
            <h3>Loading expenses...</h3>
            <p>Fetching your expense records.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="expenses-page">
      <header className="expenses-header">
        <div>
          <span className="expenses-eyebrow">FINANCE</span>
          <p>Track your PG operating expenses and spending.</p>
        </div>

        <button
          type="button"
          className="expenses-add-btn"
          onClick={openAddModal}
        >
          <Plus size={19} />
          Add Expense
        </button>
      </header>

      {error && !showModal && (
        <div className="expenses-alert expenses-alert-error">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {notice && (
        <div className="expenses-alert expenses-alert-success">
          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section className="expenses-stats">
        <article className="expense-stat-card">
          <div className="expense-stat-icon">
            <TrendingDown size={23} />
          </div>

          <div className="expense-stat-content">
            <span>Total Expenses</span>
            <strong>{formatAmount(summary.totalExpenses)}</strong>
            <small>Across your recorded expenses</small>
          </div>
        </article>

        <article className="expense-stat-card">
          <div className="expense-stat-icon">
            <CalendarDays size={23} />
          </div>

          <div className="expense-stat-content">
            <span>This Month</span>
            <strong>{formatAmount(currentMonthTotal)}</strong>
            <small>Current calendar month</small>
          </div>
        </article>

        <article className="expense-stat-card">
          <div className="expense-stat-icon">
            <Receipt size={23} />
          </div>

          <div className="expense-stat-content">
            <span>Total Records</span>
            <strong>{summary.expenseCount || 0}</strong>
            <small>All expense entries</small>
          </div>
        </article>

        <article className="expense-stat-card">
          <div className="expense-stat-icon">
            <PieChart size={23} />
          </div>

          <div className="expense-stat-content">
            <span>Monthly Records</span>
            <strong>{summary.monthlyCount || 0}</strong>
            <small>Entries this month</small>
          </div>
        </article>
      </section>

      {/* Analytics */}
      <section className="expenses-analytics">
        {/* DYNAMIC CATEGORY PIE CHART */}
        <article className="expense-analytics-card expense-category-chart">
          <div className="expense-chart-heading">
            <h2>Expenses by Category</h2>

            <span>
              {monthFilter === "all"
                ? "All Months"
                : getMonthLabel(monthFilter)}
            </span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="expense-chart-empty">
              <PieChart size={30} />

              <span>
                {monthFilter === "all"
                  ? "No category data yet"
                  : `No expenses recorded for ${getMonthLabel(
                    monthFilter
                  )}`}
              </span>
            </div>
          ) : (
            <div className="expense-donut-layout">
              <div
                className="expense-donut"
                style={{ background: categoryGradient }}
                role="img"
                aria-label={`Expense category breakdown for ${monthFilter === "all"
                  ? "all months"
                  : getMonthLabel(monthFilter)
                  }`}
              >
                <div className="expense-donut-hole">
                  <strong>{formatAmount(categoryChartTotal)}</strong>

                  <span>
                    {monthFilter === "all"
                      ? "All Expenses"
                      : "Month Total"}
                  </span>
                </div>
              </div>

              <div className="expense-category-legend">
                {categoryBreakdown.map((item) => (
                  <div
                    className="expense-legend-row"
                    key={item.value}
                  >
                    <span
                      className="expense-legend-dot"
                      style={{ background: item.color }}
                    />

                    <span className="expense-legend-name">
                      {item.label}
                    </span>

                    <span className="expense-legend-percent">
                      {item.percentage}%
                    </span>

                    <strong>{formatAmount(item.total)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Monthly spending trend */}
        <article className="expense-analytics-card expense-trend-chart">
          <div className="expense-chart-heading">
            <h2>Monthly Spending Trend</h2>

            <span>
              {monthFilter === "all"
                ? new Date().getFullYear()
                : monthFilter.slice(0, 4)}
            </span>
          </div>

          <div className="expense-bar-chart">
            <div className="expense-chart-y-labels">
              {[1, 0.75, 0.5, 0.25, 0].map((factor) => (
                <span key={factor}>
                  {factor === 0
                    ? "₹0"
                    : `₹${Math.round(
                      (maxTrend * factor) / 1000
                    )}K`}
                </span>
              ))}
            </div>

            <div className="expense-bars">
              {monthlyTrend.map((item, index) => {
                const activeMonth =
                  monthFilter !== "all" &&
                  Number(monthFilter.slice(5, 7)) === index + 1;

                const height = Math.max(
                  item.total > 0
                    ? (item.total / maxTrend) * 100
                    : 0,
                  item.total > 0 ? 4 : 0
                );

                return (
                  <div
                    className="expense-bar-column"
                    key={item.month}
                  >
                    <div className="expense-bar-track">
                      <div
                        className={`expense-bar ${activeMonth ? "is-active" : ""
                          }`}
                        style={{ height: `${height}%` }}
                        title={`${item.month}: ${formatAmount(
                          item.total
                        )}`}
                      />
                    </div>

                    <span className="expense-bar-label">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>
      </section>

      {/* Expense records */}
      <section className="expenses-list-section">
        <div className="expenses-list-heading">
          <div>
            <h2>Expense Records</h2>

            <p>
              {filteredExpenses.length}{" "}
              {filteredExpenses.length === 1
                ? "record"
                : "records"}{" "}
              found
            </p>
          </div>

          <button
            type="button"
            className="expenses-refresh-btn"
            onClick={loadExpenses}
            title="Refresh expenses"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="expenses-filters">
          <div className="expenses-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Search expenses..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <select
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            aria-label="Filter by month"
          >
            <option value="all">All Months</option>

            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {getMonthLabel(month)}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>

            {categories.map((category) => (
              <option
                key={category.value}
                value={category.value}
              >
                {category.label}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            aria-label="Filter by payment method"
          >
            <option value="all">All Payment Methods</option>

            {paymentMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>

          {(search ||
            (monthFilter !== getMonthKey(todayString()) &&
              monthFilter !== "all") ||
            categoryFilter !== "all" ||
            paymentFilter !== "all") && (
              <button
                type="button"
                className="expenses-clear-filters"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
        </div>

        {/* Empty state */}
        {filteredExpenses.length === 0 ? (
          <div className="expenses-empty-state">
            <div className="expenses-empty-icon">
              <Receipt size={32} />
            </div>

            <h3>
              {expenses.length === 0
                ? "No expenses recorded yet"
                : "No matching expenses"}
            </h3>

            <p>
              {expenses.length === 0
                ? "Add your first expense to start tracking your PG spending."
                : "Try changing your search or filters."}
            </p>

            {expenses.length === 0 ? (
              <button
                type="button"
                className="expenses-add-btn"
                onClick={openAddModal}
              >
                <Plus size={18} />
                Add your first expense
              </button>
            ) : (
              <button
                type="button"
                className="expenses-clear-filters"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="expenses-groups">
              {groupedExpenses.map(([monthKey, monthExpenses]) => {
                const isCollapsed = Boolean(
                  collapsedMonths[monthKey]
                );

                const monthTotal = monthExpenses.reduce(
                  (sum, expense) =>
                    sum + Number(expense.amount || 0),
                  0
                );

                return (
                  <div
                    className="expense-month-group"
                    key={monthKey}
                  >
                    <button
                      type="button"
                      className="expense-month-heading"
                      onClick={() => toggleMonth(monthKey)}
                    >
                      <div className="expense-month-title">
                        {isCollapsed ? (
                          <ChevronRight size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}

                        <div>
                          <strong>{getMonthLabel(monthKey)}</strong>

                          <span>
                            {monthExpenses.length}{" "}
                            {monthExpenses.length === 1
                              ? "expense"
                              : "expenses"}
                          </span>
                        </div>
                      </div>

                      <strong>{formatAmount(monthTotal)}</strong>
                    </button>

                    {!isCollapsed && (
                      <div className="expenses-record-list">
                        {monthExpenses.map((expense) => {
                          const category = getCategory(
                            expense.category
                          );

                          return (
                            <article
                              className="expense-record-card"
                              key={expense._id}
                            >
                              <div className="expense-record-icon">
                                {getExpenseIcon(expense.category)}
                              </div>

                              <div className="expense-record-main">
                                <div className="expense-record-title-row">
                                  <h3>{expense.title}</h3>

                                  <span
                                    className="expense-category-badge"
                                    style={{
                                      "--category-color":
                                        category.color,
                                    }}
                                  >
                                    {category.label}
                                  </span>
                                </div>

                                <div className="expense-record-meta">
                                  <span>
                                    <CalendarDays size={14} />
                                    {formatDate(expense.expenseDate)}
                                  </span>

                                  <span>
                                    <CreditCard size={14} />
                                    {getPaymentLabel(
                                      expense.paymentMethod
                                    )}
                                  </span>

                                  {expense.pgId?.name && (
                                    <span>
                                      <Building2 size={14} />
                                      {expense.pgId.name}
                                    </span>
                                  )}
                                </div>

                                {expense.notes && (
                                  <p className="expense-record-notes">
                                    {expense.notes}
                                  </p>
                                )}
                              </div>

                              <div className="expense-record-right">
                                <strong className="expense-record-amount">
                                  {formatAmount(expense.amount)}
                                </strong>

                                <div className="expense-record-actions">
                                  <button
                                    type="button"
                                    className="expense-edit-btn"
                                    onClick={() =>
                                      openEditModal(expense)
                                    }
                                    title="Edit expense"
                                    aria-label={`Edit ${expense.title}`}
                                  >
                                    <Pencil size={16} />
                                  </button>

                                  <button
                                    type="button"
                                    className="expense-delete-btn"
                                    onClick={() =>
                                      handleDelete(expense)
                                    }
                                    disabled={
                                      deletingId === expense._id
                                    }
                                    title="Delete expense"
                                    aria-label={`Delete ${expense.title}`}
                                  >
                                    {deletingId === expense._id ? (
                                      <Loader2
                                        size={16}
                                        className="expenses-spinner"
                                      />
                                    ) : (
                                      <Trash2 size={16} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="expenses-pagination">
                <span>
                  Page {page} of {totalPages}
                </span>

                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((previous) => previous - 1)
                    }
                    disabled={page <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={18} />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((previous) => previous + 1)
                    }
                    disabled={page >= totalPages}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Add / Edit modal */}
      {showModal && (
        <div
          className="expense-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !submitting
            ) {
              setShowModal(false);
            }
          }}
        >
          <div
            className="expense-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-modal-title"
          >
            <div className="expense-modal-header">
              <div>
                <span className="expenses-eyebrow">
                  FINANCE MANAGEMENT
                </span>

                <h2 id="expense-modal-title">
                  {editingExpense ? "Edit Expense" : "Add Expense"}
                </h2>

                <p>
                  {editingExpense
                    ? "Update the details of this expense."
                    : "Enter the details of your PG expense."}
                </p>
              </div>

              <button
                type="button"
                className="expense-modal-close"
                onClick={() =>
                  !submitting && setShowModal(false)
                }
                disabled={submitting}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="expenses-alert expenses-alert-error">
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() => setError("")}
                  aria-label="Dismiss error"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <form className="expense-form" onSubmit={handleSubmit}>
              <div className="expense-form-group">
                <label htmlFor="expense-title">
                  Expense Title *
                </label>

                <input
                  id="expense-title"
                  name="title"
                  type="text"
                  placeholder="e.g. Electricity bill"
                  value={form.title}
                  onChange={handleFormChange}
                  maxLength={100}
                  required
                />
              </div>

              <div className="expense-form-row">
                <div className="expense-form-group">
                  <label htmlFor="expense-category">
                    Category *
                  </label>

                  <select
                    id="expense-category"
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    required
                  >
                    {categories.map((category) => (
                      <option
                        key={category.value}
                        value={category.value}
                      >
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="expense-form-group">
                  <label htmlFor="expense-amount">
                    Amount (₹) *
                  </label>

                  <input
                    id="expense-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              <div className="expense-form-row">
                <div className="expense-form-group">
                  <label htmlFor="expense-date">
                    Expense Date *
                  </label>

                  <input
                    id="expense-date"
                    name="expenseDate"
                    type="date"
                    value={form.expenseDate}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="expense-form-group">
                  <label htmlFor="expense-payment">
                    Payment Method *
                  </label>

                  <select
                    id="expense-payment"
                    name="paymentMethod"
                    value={form.paymentMethod}
                    onChange={handleFormChange}
                    required
                  >
                    {paymentMethods.map((method) => (
                      <option
                        key={method.value}
                        value={method.value}
                      >
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="expense-form-group">
                <label htmlFor="expense-notes">
                  Description / Notes
                </label>

                <textarea
                  id="expense-notes"
                  name="notes"
                  placeholder="Add an optional description..."
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="expense-form-actions">
                <button
                  type="button"
                  className="expense-cancel-btn"
                  onClick={() =>
                    !submitting && setShowModal(false)
                  }
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="expense-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2
                      size={17}
                      className="expenses-spinner"
                    />
                  ) : (
                    <Plus size={17} />
                  )}

                  {submitting
                    ? "Saving..."
                    : editingExpense
                      ? "Save Changes"
                      : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;
