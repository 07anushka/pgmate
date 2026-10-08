import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Search,
  Receipt,
  Trash2,
  X,
  Wallet,
  CalendarDays,
  TrendingDown,
  PieChart,
  Loader2,
} from "lucide-react";

import {
  getMyExpensesApi,
  getExpenseSummaryApi,
  createExpenseApi,
  deleteExpenseApi,
} from "../../services/api";

import "./Expenses.css";


const categories = [
  { value: "all", label: "All Categories" },
  { value: "rent", label: "Rent" },
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "maintenance", label: "Maintenance" },
  { value: "food", label: "Food" },
  { value: "salary", label: "Salary" },
  { value: "internet", label: "Internet" },
  { value: "cleaning", label: "Cleaning" },
  { value: "supplies", label: "Supplies" },
  { value: "other", label: "Other" },
];


const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];


function Expenses() {
  const [expenses, setExpenses] = useState([]);

  const [summary, setSummary] = useState({
    totalExpenses: 0,
    expenseCount: 0,
    monthlyTotal: 0,
    monthlyCount: 0,
    categoryTotals: {},
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [showAddExpense, setShowAddExpense] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "maintenance",
    amount: "",
    expenseDate: new Date()
      .toISOString()
      .split("T")[0],
    paymentMethod: "cash",
    notes: "",
  });


  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        expensesResponse,
        summaryResponse,
      ] = await Promise.all([
        getMyExpensesApi("", categoryFilter),
        getExpenseSummaryApi(""),
      ]);

      setExpenses(
        expensesResponse.expenses || []
      );

      setSummary(
        summaryResponse.summary || {
          totalExpenses: 0,
          expenseCount: 0,
          monthlyTotal: 0,
          monthlyCount: 0,
          categoryTotals: {},
        }
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to load expenses"
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadExpenses();
  }, [categoryFilter]);


  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredExpenses = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return expenses;
    }

    return expenses.filter((expense) => {
      const title =
        expense.title?.toLowerCase() || "";

      const category =
        expense.category?.toLowerCase() || "";

      const pgName =
        expense.pgId?.name?.toLowerCase() || "";

      return (
        title.includes(query) ||
        category.includes(query) ||
        pgName.includes(query)
      );
    });
  }, [expenses, search]);


  // --------------------------------------------------
  // FORM HANDLING
  // --------------------------------------------------

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  const resetForm = () => {
    setForm({
      title: "",
      category: "maintenance",
      amount: "",
      expenseDate: new Date()
        .toISOString()
        .split("T")[0],
      paymentMethod: "cash",
      notes: "",
    });
  };


  // --------------------------------------------------
  // ADD EXPENSE
  // --------------------------------------------------

  const handleAddExpense = async (
    event
  ) => {
    event.preventDefault();

    if (
      !form.title.trim() ||
      !form.amount ||
      !form.expenseDate
    ) {
      setError(
        "Please fill all required fields."
      );

      return;
    }

    try {
      setSubmitting(true);
      setError("");

      /*
       * For now this uses the owner's first PG.
       * Once PG switcher is connected,
       * pass the selected pgId here.
       */

      const savedPgId =
        localStorage.getItem(
          "pgmate_selected_pg"
        );

      if (!savedPgId) {
        setError(
          "Please select a PG before adding an expense."
        );

        setSubmitting(false);

        return;
      }

      await createExpenseApi({
        pgId: savedPgId,
        title: form.title.trim(),
        category: form.category,
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        paymentMethod:
          form.paymentMethod,
        notes: form.notes.trim(),
      });

      setShowAddExpense(false);

      resetForm();

      await loadExpenses();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to add expense"
      );
    } finally {
      setSubmitting(false);
    }
  };


  // --------------------------------------------------
  // DELETE EXPENSE
  // --------------------------------------------------

  const handleDelete = async (
    expenseId
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteExpenseApi(expenseId);

      await loadExpenses();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to delete expense"
      );
    }
  };


  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const formatAmount = (amount) => {
    return `₹${Number(
      amount || 0
    ).toLocaleString("en-IN")}`;
  };


  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };


  const getCategoryLabel = (
    category
  ) => {
    const found = categories.find(
      (item) =>
        item.value === category
    );

    return found?.label || "Other";
  };


  const getPaymentMethodLabel = (
    method
  ) => {
    const found =
      paymentMethods.find(
        (item) =>
          item.value === method
      );

    return found?.label || "Other";
  };


  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="expenses-page">
        <div className="expenses-loading-card">
          <div className="expenses-loading-icon">
            <Loader2
              size={24}
              className="expenses-spinner"
            />
          </div>

          <div>
            <h3>Loading expenses...</h3>

            <p>
              Fetching your expense records.
            </p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="expenses-page">

      {/* HEADER */}

      <div className="expenses-header">

        <div>
          <span className="expenses-eyebrow">
            FINANCE
          </span>

          <h1>Expenses</h1>

          <p>
            Track your PG operating expenses
            and spending.
          </p>
        </div>

        <button
          className="expenses-add-btn"
          onClick={() =>
            setShowAddExpense(true)
          }
        >
          <Plus size={18} />

          Add Expense
        </button>

      </div>


      {/* ERROR */}

      {error && (
        <div className="expenses-error">
          {error}

          <button
            onClick={() =>
              setError("")
            }
          >
            <X size={16} />
          </button>
        </div>
      )}


      {/* SUMMARY */}

      <div className="expenses-stats">

        <div className="expense-stat-card">

          <div className="expense-stat-icon">
            <TrendingDown
              size={20}
            />
          </div>

          <div>
            <span>
              Total Expenses
            </span>

            <strong>
              {formatAmount(
                summary.totalExpenses
              )}
            </strong>
          </div>

        </div>


        <div className="expense-stat-card">

          <div className="expense-stat-icon">
            <CalendarDays
              size={20}
            />
          </div>

          <div>
            <span>
              This Month
            </span>

            <strong>
              {formatAmount(
                summary.monthlyTotal
              )}
            </strong>
          </div>

        </div>


        <div className="expense-stat-card">

          <div className="expense-stat-icon">
            <Receipt size={20} />
          </div>

          <div>
            <span>
              Total Records
            </span>

            <strong>
              {summary.expenseCount}
            </strong>
          </div>

        </div>


        <div className="expense-stat-card">

          <div className="expense-stat-icon">
            <PieChart size={20} />
          </div>

          <div>
            <span>
              Monthly Records
            </span>

            <strong>
              {summary.monthlyCount}
            </strong>
          </div>

        </div>

      </div>


      {/* TOOLBAR */}

      <div className="expenses-toolbar">

        <div className="expenses-search">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

        </div>


        <select
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(
              event.target.value
            )
          }
          className="expenses-filter"
        >
          {categories.map(
            (category) => (
              <option
                key={category.value}
                value={category.value}
              >
                {category.label}
              </option>
            )
          )}
        </select>

      </div>


      {/* EXPENSE LIST */}

      <div className="expenses-list-card">

        <div className="expenses-list-header">
          <div>
            <h2>Expense History</h2>

            <p>
              {filteredExpenses.length}{" "}
              records found
            </p>
          </div>
        </div>


        {filteredExpenses.length === 0 ? (
          <div className="expenses-empty">

            <div className="expenses-empty-icon">
              <Wallet size={28} />
            </div>

            <h3>
              No expenses found
            </h3>

            <p>
              Start tracking your PG
              expenses by adding one.
            </p>

            <button
              onClick={() =>
                setShowAddExpense(true)
              }
            >
              <Plus size={17} />

              Add Expense
            </button>

          </div>
        ) : (

          <div className="expenses-table-wrapper">

            <table className="expenses-table">

              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Category</th>
                  <th>PG</th>
                  <th>Date</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>

                {filteredExpenses.map(
                  (expense) => (
                    <tr
                      key={
                        expense._id
                      }
                    >

                      <td>
                        <div className="expense-title-cell">

                          <div className="expense-row-icon">
                            <Receipt
                              size={17}
                            />
                          </div>

                          <div>
                            <strong>
                              {
                                expense.title
                              }
                            </strong>

                            {expense.notes && (
                              <span>
                                {
                                  expense.notes
                                }
                              </span>
                            )}
                          </div>

                        </div>
                      </td>


                      <td>
                        <span className="expense-category">
                          {getCategoryLabel(
                            expense.category
                          )}
                        </span>
                      </td>


                      <td>
                        <span className="expense-pg">
                          {
                            expense.pgId
                              ?.name ||
                            "-"
                          }
                        </span>
                      </td>


                      <td>
                        {formatDate(
                          expense.expenseDate
                        )}
                      </td>


                      <td>
                        <span className="expense-payment">
                          {getPaymentMethodLabel(
                            expense.paymentMethod
                          )}
                        </span>
                      </td>


                      <td>
                        <strong className="expense-amount">
                          {formatAmount(
                            expense.amount
                          )}
                        </strong>
                      </td>


                      <td>
                        <button
                          className="expense-delete-btn"
                          onClick={() =>
                            handleDelete(
                              expense._id
                            )
                          }
                          title="Delete expense"
                        >
                          <Trash2
                            size={17}
                          />
                        </button>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* ADD EXPENSE MODAL */}

      {showAddExpense && (
        <div
          className="expense-modal-overlay"
          onMouseDown={() =>
            !submitting &&
            setShowAddExpense(false)
          }
        >

          <div
            className="expense-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="expense-modal-header">

              <div>
                <h2>
                  Add Expense
                </h2>

                <p>
                  Record a new PG expense.
                </p>
              </div>

              <button
                onClick={() =>
                  !submitting &&
                  setShowAddExpense(false)
                }
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={
                handleAddExpense
              }
              className="expense-form"
            >

              <div className="expense-form-group">

                <label>
                  Expense Title *
                </label>

                <input
                  name="title"
                  type="text"
                  placeholder="e.g. Electricity bill"
                  value={form.title}
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>


              <div className="expense-form-row">

                <div className="expense-form-group">

                  <label>
                    Category *
                  </label>

                  <select
                    name="category"
                    value={
                      form.category
                    }
                    onChange={
                      handleChange
                    }
                  >
                    {categories
                      .filter(
                        (item) =>
                          item.value !==
                          "all"
                      )
                      .map(
                        (category) => (
                          <option
                            key={
                              category.value
                            }
                            value={
                              category.value
                            }
                          >
                            {
                              category.label
                            }
                          </option>
                        )
                      )}
                  </select>

                </div>


                <div className="expense-form-group">

                  <label>
                    Amount *
                  </label>

                  <div className="amount-input">

                    <span>₹</span>

                    <input
                      name="amount"
                      type="number"
                      min="1"
                      placeholder="0"
                      value={
                        form.amount
                      }
                      onChange={
                        handleChange
                      }
                      required
                    />

                  </div>

                </div>

              </div>


              <div className="expense-form-row">

                <div className="expense-form-group">

                  <label>
                    Expense Date *
                  </label>

                  <input
                    name="expenseDate"
                    type="date"
                    value={
                      form.expenseDate
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>


                <div className="expense-form-group">

                  <label>
                    Payment Method
                  </label>

                  <select
                    name="paymentMethod"
                    value={
                      form.paymentMethod
                    }
                    onChange={
                      handleChange
                    }
                  >
                    {paymentMethods.map(
                      (method) => (
                        <option
                          key={
                            method.value
                          }
                          value={
                            method.value
                          }
                        >
                          {
                            method.label
                          }
                        </option>
                      )
                    )}
                  </select>

                </div>

              </div>


              <div className="expense-form-group">

                <label>
                  Notes
                </label>

                <textarea
                  name="notes"
                  placeholder="Optional notes..."
                  rows="3"
                  value={
                    form.notes
                  }
                  onChange={
                    handleChange
                  }
                />

              </div>


              <div className="expense-form-actions">

                <button
                  type="button"
                  className="expense-cancel-btn"
                  onClick={() =>
                    setShowAddExpense(
                      false
                    )
                  }
                  disabled={
                    submitting
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="expense-submit-btn"
                  disabled={
                    submitting
                  }
                >

                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="expenses-spinner"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus
                        size={17}
                      />

                      Add Expense
                    </>
                  )}

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