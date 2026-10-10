import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CreditCard,
  IndianRupee,
  Search,
  Filter,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Plus,
  X,
  Loader2,
  Trash2,
  CalendarDays,
} from "lucide-react";

import {
  getRentRecordsApi,
  getRentSummaryApi,
  getMyPaymentsApi,
  createPaymentApi,
  deletePaymentApi,
} from "../../services/api";

import MessageCard from "../../components/MessageCard";

import "./Payments.css";

function Payments() {
  // =====================================================
  // DATE
  // =====================================================

  const now = new Date();

  const [selectedMonth, setSelectedMonth] =
    useState(now.getMonth() + 1);

  const [selectedYear, setSelectedYear] =
    useState(now.getFullYear());

  // =====================================================
  // DATA
  // =====================================================

  const [rentRecords, setRentRecords] =
    useState([]);

  const [payments, setPayments] =
    useState([]);

  const [summary, setSummary] =
    useState({
      totalTenants: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      paidOnTime: 0,
      paidLate: 0,
      totalLateDays: 0,
    });

  // =====================================================
  // UI
  // =====================================================

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [showAddPayment, setShowAddPayment] =
    useState(false);

  const [creatingPayment, setCreatingPayment] =
    useState(false);

  const [deletingPayment, setDeletingPayment] =
    useState("");

  const [messageCard, setMessageCard] =
    useState(null);

  const [paymentToDelete, setPaymentToDelete] =
    useState(null);

  // =====================================================
  // FORM
  // =====================================================

  const [form, setForm] =
    useState({
      tenantId: "",
      amount: "",
      paymentDate: new Date()
        .toISOString()
        .split("T")[0],
      paymentMethod: "cash",
      notes: "",
    });

  // =====================================================
  // MONTHS
  // =====================================================

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // =====================================================
  // YEARS
  // =====================================================

  const years = Array.from(
    { length: 5 },
    (_, index) =>
      now.getFullYear() - index
  );

  // =====================================================
  // LOAD RENT DATA
  // =====================================================

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        rentResponse,
        summaryResponse,
        paymentsResponse,
      ] = await Promise.all([
        getRentRecordsApi(
          selectedMonth,
          selectedYear
        ),

        getRentSummaryApi(
          selectedMonth,
          selectedYear
        ),

        getMyPaymentsApi(
          "",
          "",
          selectedMonth,
          selectedYear
        ),
      ]);

      setRentRecords(
        rentResponse.rentRecords ||
          rentResponse.records ||
          []
      );

      setSummary(
        summaryResponse.summary || {
          totalTenants: 0,
          paid: 0,
          pending: 0,
          overdue: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          paidOnTime: 0,
          paidLate: 0,
          totalLateDays: 0,
        }
      );

      setPayments(
        paymentsResponse.payments ||
          []
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to load payment details."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD WHEN MONTH / YEAR CHANGES
  // =====================================================

  useEffect(() => {
    loadPayments();
  }, [
    selectedMonth,
    selectedYear,
  ]);

  // =====================================================
  // FILTER RENT RECORDS
  // =====================================================

  const filteredRecords = useMemo(() => {
    const searchValue =
      search
        .trim()
        .toLowerCase();

    return rentRecords.filter(
      (record) => {
        const tenantName =
          record.userId?.name ||
          record.tenantId?.userId
            ?.name ||
          record.tenantId?.name ||
          "";

        const mobile =
          record.userId?.mobile ||
          record.tenantId?.userId
            ?.mobile ||
          "";

        const pgName =
          record.pgId?.name ||
          "";

        const matchesSearch =
          !searchValue ||
          tenantName
            .toLowerCase()
            .includes(
              searchValue
            ) ||
          mobile
            .toLowerCase()
            .includes(
              searchValue
            ) ||
          pgName
            .toLowerCase()
            .includes(
              searchValue
            );

        const matchesStatus =
          statusFilter === "all" ||
          record.status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    rentRecords,
    search,
    statusFilter,
  ]);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // CREATE PAYMENT
  // =====================================================

  const handleCreatePayment =
    async (e) => {
      e.preventDefault();

      if (!form.tenantId) {
        setMessageCard({
          type: "warning",
          title: "Tenant required",
          message:
            "Please enter the tenant ID.",
        });
        return;
      }

      if (!form.amount) {
        setMessageCard({
          type: "warning",
          title: "Amount required",
          message:
            "Please enter the payment amount.",
        });
        return;
      }

      if (!form.paymentDate) {
        setMessageCard({
          type: "warning",
          title: "Payment date required",
          message:
            "Please select the payment date.",
        });
        return;
      }

      try {
        setCreatingPayment(true);
        setError("");

        await createPaymentApi({
          tenantId:
            form.tenantId,

          amount:
            Number(form.amount),

          paymentDate:
            form.paymentDate,

          paymentMethod:
            form.paymentMethod,

          month:
            Number(selectedMonth),

          year:
            Number(selectedYear),

          notes:
            form.notes,
        });

        setShowAddPayment(false);

        setForm({
          tenantId: "",
          amount: "",
          paymentDate:
            new Date()
              .toISOString()
              .split("T")[0],
          paymentMethod: "cash",
          notes: "",
        });

        await loadPayments();

        setMessageCard({
          type: "success",
          title: "Payment recorded",
          message:
            "The rent payment has been recorded successfully.",
        });
      } catch (err) {
        console.error(err);

        setMessageCard({
          type: "error",
          title: "Payment failed",
          message:
            err.message ||
            "Failed to record payment.",
        });
      } finally {
        setCreatingPayment(false);
      }
    };

  // =====================================================
  // DELETE PAYMENT - CONFIRM
  // =====================================================

  const handleDeletePayment =
    (payment) => {
      setPaymentToDelete(payment);
    };

  // =====================================================
  // DELETE PAYMENT
  // =====================================================

  const confirmDeletePayment =
    async () => {
      if (!paymentToDelete?._id) {
        return;
      }

      try {
        setDeletingPayment(
          paymentToDelete._id
        );

        await deletePaymentApi(
          paymentToDelete._id
        );

        await loadPayments();

        setPaymentToDelete(null);

        setMessageCard({
          type: "success",
          title: "Payment deleted",
          message:
            "The payment record has been deleted and the rent status has been updated.",
        });
      } catch (err) {
        console.error(err);

        setPaymentToDelete(null);

        setMessageCard({
          type: "error",
          title: "Delete failed",
          message:
            err.message ||
            "Failed to delete payment.",
        });
      } finally {
        setDeletingPayment("");
      }
    };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(
      date
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // =====================================================
  // FORMAT STATUS
  // =====================================================

  const getStatusLabel = (
    record
  ) => {
    if (
      record.status === "paid"
    ) {
      const daysLate =
        Number(
          record.daysLate
        ) || 0;

      if (daysLate > 0) {
        return `Paid ${daysLate} Days Late`;
      }

      return "Paid On Time";
    }

    if (
      record.status ===
      "overdue"
    ) {
      return "Overdue";
    }

    return "Pending";
  };

  // =====================================================
  // STATUS CLASS
  // =====================================================

  const getStatusClass = (
    record
  ) => {
    if (
      record.status === "paid"
    ) {
      return "paid";
    }

    if (
      record.status ===
      "overdue"
    ) {
      return "overdue";
    }

    return "pending";
  };

  // =====================================================
  // PAYMENT METHOD
  // =====================================================

  const formatPaymentMethod =
    (method) => {
      if (!method) {
        return "-";
      }

      const methods = {
        cash: "Cash",
        upi: "UPI",
        bank: "Bank Transfer",
        card: "Card",
        other: "Other",
      };

      return (
        methods[method] ||
        method
      );
    };

  // =====================================================
  // GET TENANT NAME
  // =====================================================

  const getTenantName =
    (record) => {
      return (
        record.userId?.name ||
        record.tenantId?.userId
          ?.name ||
        record.tenantId?.name ||
        "Unknown Tenant"
      );
    };

  // =====================================================
  // GET TENANT MOBILE
  // =====================================================

  const getTenantMobile =
    (record) => {
      return (
        record.userId?.mobile ||
        record.tenantId?.userId
          ?.mobile ||
        ""
      );
    };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="payments-page">
        <div className="payments-loading-card">
          <div className="payments-spinner">
            <Loader2 size={28} />
          </div>

          <h3>
            Loading payments...
          </h3>

          <p>
            Please wait while we fetch
            the rent details.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="payments-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="payments-page-header">

        <div>
                   <p>
            Track and manage your
            tenants' monthly rent.
          </p>
        </div>

        <button
          className="payments-add-btn"
          onClick={() => {
            setError("");
            setShowAddPayment(true);
          }}
        >
          <Plus size={17} />

          Record Payment
        </button>

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="payments-error">

          <AlertCircle size={17} />

          <span>
            {error}
          </span>

          <button
            onClick={() =>
              setError("")
            }
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* =================================================
          MONTH / YEAR
      ================================================= */}

      <div className="payments-period-card">

        <div className="payments-period-title">

          <div className="payments-period-icon">
            <CalendarDays size={18} />
          </div>

          <div>
            <strong>
              Rent Period
            </strong>

            <span>
              View rent status for a
              specific month and year.
            </span>
          </div>

        </div>

        <div className="payments-period-selects">

          <div className="payments-period-select">

            <label>
              Month
            </label>

            <select
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(
                  Number(
                    e.target.value
                  )
                )
              }
            >
              {months.map(
                (month, index) => (
                  <option
                    key={month}
                    value={index + 1}
                  >
                    {month}
                  </option>
                )
              )}
            </select>

          </div>

          <div className="payments-period-select">

            <label>
              Year
            </label>

            <select
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(
                  Number(
                    e.target.value
                  )
                )
              }
            >
              {years.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}
            </select>

          </div>

        </div>

      </div>

      {/* =================================================
          STATS
      ================================================= */}

      <div className="payments-stats">

        {/* PAID */}

        <div className="payment-stat-card">

          <div className="payment-stat-icon blue">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>
              Paid
            </span>

            <strong>
              {summary.paid || 0}
            </strong>

            <small>
              ₹
              {Number(
                summary.paidAmount ||
                  0
              ).toLocaleString(
                "en-IN"
              )}
            </small>
          </div>

        </div>

        {/* PENDING */}

        <div className="payment-stat-card">

          <div className="payment-stat-icon orange">
            <Clock3 size={21} />
          </div>

          <div>
            <span>
              Pending
            </span>

            <strong>
              {summary.pending || 0}
            </strong>

            <small>
              ₹
              {Number(
                summary.pendingAmount ||
                  0
              ).toLocaleString(
                "en-IN"
              )}
            </small>
          </div>

        </div>

        {/* OVERDUE */}

        <div className="payment-stat-card">

          <div className="payment-stat-icon red">
            <AlertCircle size={21} />
          </div>

          <div>
            <span>
              Overdue
            </span>

            <strong>
              {summary.overdue || 0}
            </strong>

            <small>
              ₹
              {Number(
                summary.overdueAmount ||
                  0
              ).toLocaleString(
                "en-IN"
              )}
            </small>
          </div>

        </div>

        {/* TOTAL COLLECTED */}

        <div className="payment-stat-card">

          <div className="payment-stat-icon green">
            <IndianRupee size={21} />
          </div>

          <div>
            <span>
              Total Collected
            </span>

            <strong>
              ₹
              {Number(
                summary.paidAmount ||
                  0
              ).toLocaleString(
                "en-IN"
              )}
            </strong>

            <small>
              {summary.paidOnTime ||
                0}{" "}
              on time ·{" "}
              {summary.paidLate ||
                0}{" "}
              late
            </small>
          </div>

        </div>

      </div>

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="payments-toolbar">

        <div className="payments-search">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search tenant or PG..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

        </div>

        <div className="payments-filter">

          <Filter size={17} />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
          >
            <option value="all">
              All Tenants
            </option>

            <option value="paid">
              Paid
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="overdue">
              Overdue
            </option>
          </select>

        </div>

      </div>

      {/* =================================================
          RENT RECORD CARD
      ================================================= */}

      <div className="payments-card">

        <div className="payments-card-header">

          <div>
            <h2>
              {months[
                selectedMonth - 1
              ]}{" "}
              {selectedYear} Rent
            </h2>

            <p>
              Monthly rent status for
              your tenants.
            </p>
          </div>

          <div className="payment-count">
            {filteredRecords.length}{" "}
            Tenants
          </div>

        </div>

        {/* =================================================
            EMPTY
        ================================================= */}

        {filteredRecords.length ===
        0 ? (
          <div className="payments-empty">

            <div className="payments-empty-icon">
              <CreditCard size={27} />
            </div>

            <h3>
              No rent records found
            </h3>

            <p>
              There are no rent records
              matching your selected
              month and filters.
            </p>

            <button
              className="payments-empty-btn"
              onClick={() => {
                setError("");
                setShowAddPayment(true);
              }}
            >
              <Plus size={17} />

              Record Payment
            </button>

          </div>
        ) : (

          /* =================================================
             RENT RECORD LIST
          ================================================= */

          <div className="payments-list">

            {filteredRecords.map(
              (record) => {

                const tenantName =
                  getTenantName(
                    record
                  );

                const mobile =
                  getTenantMobile(
                    record
                  );

                const statusClass =
                  getStatusClass(
                    record
                  );

                const statusLabel =
                  getStatusLabel(
                    record
                  );

                return (
                  <div
                    className="payment-row rent-record-row"
                    key={
                      record._id
                    }
                  >

                    {/* TENANT */}

                    <div className="payment-tenant">

                      <div className="payment-avatar">
                        {tenantName
                          .charAt(
                            0
                          )
                          .toUpperCase()}
                      </div>

                      <div>

                        <h3>
                          {tenantName}
                        </h3>

                        <p>
                          {mobile}
                        </p>

                        {record
                          .pgId
                          ?.name && (
                          <small>
                            {
                              record
                                .pgId
                                .name
                            }
                          </small>
                        )}

                      </div>

                    </div>

                    {/* RENT */}

                    <div className="payment-info">

                      <span>
                        Rent
                      </span>

                      <strong>
                        ₹
                        {Number(
                          record.amount ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>

                    {/* DUE DATE */}

                    <div className="payment-info">

                      <span>
                        Due Date
                      </span>

                      <strong>
                        {formatDate(
                          record.dueDate
                        )}
                      </strong>

                    </div>

                    {/* PAID DATE */}

                    <div className="payment-info">

                      <span>
                        Paid Date
                      </span>

                      <strong>
                        {record.paidDate
                          ? formatDate(
                              record.paidDate
                            )
                          : "-"}
                      </strong>

                    </div>

                    {/* STATUS */}

                    <div
                      className={`payment-status ${statusClass}`}
                    >
                      {statusLabel}
                    </div>

                    {/* METHOD */}

                    <div className="payment-method">

                      <span>
                        Method
                      </span>

                      <strong>
                        {formatPaymentMethod(
                          record.paymentMethod
                        )}
                      </strong>

                    </div>

                    {/* LATE DAYS */}

                    {record.status ===
                      "paid" &&
                      Number(
                        record.daysLate
                      ) > 0 && (
                        <div className="payment-late-info">
                          {record.daysLate}{" "}
                          days late
                        </div>
                      )}

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>

      {/* =================================================
          PAYMENT TRANSACTION HISTORY
      ================================================= */}

      {payments.length > 0 && (
        <div className="payments-card payments-history-card">

          <div className="payments-card-header">

            <div>
              <h2>
                Payment Transactions
              </h2>

              <p>
                Actual payment entries
                recorded for this month.
              </p>
            </div>

            <div className="payment-count">
              {payments.length}{" "}
              Transactions
            </div>

          </div>

          <div className="payments-list">

            {payments
              .filter((payment) => {
                const tenantName =
                  payment.userId
                    ?.name ||
                  payment.tenantId
                    ?.userId
                    ?.name ||
                  "";

                const mobile =
                  payment.userId
                    ?.mobile ||
                  payment.tenantId
                    ?.userId
                    ?.mobile ||
                  "";

                const searchValue =
                  search
                    .trim()
                    .toLowerCase();

                return (
                  !searchValue ||
                  tenantName
                    .toLowerCase()
                    .includes(
                      searchValue
                    ) ||
                  mobile
                    .toLowerCase()
                    .includes(
                      searchValue
                    )
                );
              })
              .map((payment) => {

                const tenantName =
                  payment.userId
                    ?.name ||
                  payment.tenantId
                    ?.userId
                    ?.name ||
                  "Unknown Tenant";

                const mobile =
                  payment.userId
                    ?.mobile ||
                  payment.tenantId
                    ?.userId
                    ?.mobile ||
                  "";

                return (
                  <div
                    className="payment-row transaction-row"
                    key={
                      payment._id
                    }
                  >

                    <div className="payment-tenant">

                      <div className="payment-avatar">
                        {tenantName
                          .charAt(
                            0
                          )
                          .toUpperCase()}
                      </div>

                      <div>

                        <h3>
                          {tenantName}
                        </h3>

                        <p>
                          {mobile}
                        </p>

                      </div>

                    </div>

                    <div className="payment-info">

                      <span>
                        Amount
                      </span>

                      <strong>
                        ₹
                        {Number(
                          payment.amount ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>

                    <div className="payment-info">

                      <span>
                        Payment Date
                      </span>

                      <strong>
                        {formatDate(
                          payment.paymentDate
                        )}
                      </strong>

                    </div>

                    <div className="payment-method">

                      <span>
                        Method
                      </span>

                      <strong>
                        {formatPaymentMethod(
                          payment.paymentMethod
                        )}
                      </strong>

                    </div>

                    <div
                      className={`payment-status ${
                        payment.status ||
                        "paid"
                      }`}
                    >
                      {payment.status ||
                        "paid"}
                    </div>

                    <button
                      className="payment-delete-btn"
                      title="Delete payment"
                      disabled={
                        deletingPayment ===
                        payment._id
                      }
                      onClick={() =>
                        handleDeletePayment(
                          payment
                        )
                      }
                    >
                      {deletingPayment ===
                      payment._id ? (
                        <Loader2
                          size={16}
                          className="delete-spinner"
                        />
                      ) : (
                        <Trash2
                          size={16}
                        />
                      )}
                    </button>

                  </div>
                );
              })}

          </div>

        </div>
      )}

      {/* =================================================
          ADD PAYMENT MODAL
      ================================================= */}

      {showAddPayment && (
        <div
          className="payment-modal-overlay"
          onClick={() => {
            if (
              !creatingPayment
            ) {
              setShowAddPayment(
                false
              );
            }
          }}
        >

          <div
            className="payment-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="payment-modal-header">

              <div>
                <h2>
                  Record Payment
                </h2>

                <p>
                  Record rent for{" "}
                  {
                    months[
                      selectedMonth -
                        1
                    ]
                  }{" "}
                  {selectedYear}.
                </p>
              </div>

              <button
                className="payment-modal-close"
                disabled={
                  creatingPayment
                }
                onClick={() =>
                  setShowAddPayment(
                    false
                  )
                }
              >
                <X size={20} />
              </button>

            </div>

            <form
              className="payment-form"
              onSubmit={
                handleCreatePayment
              }
            >

              {/* TENANT */}

              <div className="payment-form-group">

                <label>
                  Tenant ID
                </label>

                <input
                  type="text"
                  name="tenantId"
                  value={
                    form.tenantId
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter tenant ID"
                  required
                />

                <small>
                  Use the tenant ID from
                  the Tenants module.
                </small>

              </div>

              {/* AMOUNT + DATE */}

              <div className="payment-form-row">

                <div className="payment-form-group">

                  <label>
                    Amount
                  </label>

                  <div className="amount-input">

                    <IndianRupee
                      size={16}
                    />

                    <input
                      type="number"
                      name="amount"
                      min="1"
                      value={
                        form.amount
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Enter amount"
                      required
                    />

                  </div>

                </div>

                <div className="payment-form-group">

                  <label>
                    Payment Date
                  </label>

                  <input
                    type="date"
                    name="paymentDate"
                    value={
                      form.paymentDate
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>

              </div>

              {/* METHOD */}

              <div className="payment-form-group">

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

                  <option value="cash">
                    Cash
                  </option>

                  <option value="upi">
                    UPI
                  </option>

                  <option value="bank">
                    Bank Transfer
                  </option>

                  <option value="card">
                    Card
                  </option>

                  <option value="other">
                    Other
                  </option>

                </select>

              </div>

              {/* NOTES */}

              <div className="payment-form-group">

                <label>
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={
                    form.notes
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Optional notes..."
                  rows="3"
                />

              </div>

              {/* ACTIONS */}

              <div className="payment-form-actions">

                <button
                  type="button"
                  className="payment-cancel-btn"
                  disabled={
                    creatingPayment
                  }
                  onClick={() =>
                    setShowAddPayment(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="payment-save-btn"
                  disabled={
                    creatingPayment
                  }
                >

                  {creatingPayment ? (
                    <>
                      <Loader2
                        size={17}
                        className="delete-spinner"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={17}
                      />

                      Save Payment
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =================================================
          DELETE CONFIRMATION
      ================================================= */}

      {paymentToDelete && (
        <MessageCard
          type="confirm"
          title="Delete payment?"
          message="This will remove the payment transaction and update the corresponding rent record."
          onClose={() =>
            setPaymentToDelete(
              null
            )
          }
          onConfirm={
            confirmDeletePayment
          }
          confirmText={
            deletingPayment
              ? "Deleting..."
              : "Delete Payment"
          }
          cancelText="Cancel"
        />
      )}

      {/* =================================================
          MESSAGE CARD
      ================================================= */}

      {messageCard && (
        <MessageCard
          type={
            messageCard.type
          }
          title={
            messageCard.title
          }
          message={
            messageCard.message
          }
          onClose={() =>
            setMessageCard(null)
          }
        />
      )}

    </div>
  );
}

export default Payments;