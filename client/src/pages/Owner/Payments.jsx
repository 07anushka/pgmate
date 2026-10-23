import {
  useCallback,
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
  DoorOpen,
  Wallet,
} from "lucide-react";

import {
  getRentRecordsApi,
  getRentSummaryApi,
  getMyPaymentsApi,
  createPaymentApi,
  deletePaymentApi,
  collectVacatedDebtApi,
} from "../../services/api";

import MessageCard from "../../components/MessageCard";
import "./Payments.css";

const EMPTY_SUMMARY = {
  totalTenants: 0,
  paid: 0,
  pending: 0,
  overdue: 0,
  paidAmount: 0,
  pendingAmount: 0,
  overdueAmount: 0,
  debtCollected: 0,
  totalCollected: 0,
  paidOnTime: 0,
  paidLate: 0,
  totalLateDays: 0,
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const MONTHS = [
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

const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getActivePGId = () =>
  (
    localStorage.getItem("pgmate_active_pg") || ""
  ).trim();

function Payments() {
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(
    now.getMonth() + 1
  );

  const [selectedYear, setSelectedYear] = useState(
    now.getFullYear()
  );

  const [activePGId, setActivePGId] = useState(
    getActivePGId
  );

  const [rentRecords, setRentRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState("");
  const [collectingDebt, setCollectingDebt] = useState("");

  const [messageCard, setMessageCard] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [tenantToCollect, setTenantToCollect] = useState(null);

  const [collectionForm, setCollectionForm] = useState({
    amount: "",
    paymentMethod: "cash",
    notes: "",
  });

  const [form, setForm] = useState({
    tenantId: "",
    amount: "",
    paymentDate: getTodayDate(),
    paymentMethod: "cash",
    notes: "",
  });

  const years = Array.from(
    { length: 5 },
    (_, index) => now.getFullYear() - index
  );

  // =====================================================
  // RESET DATA
  // =====================================================

  const resetPaymentData = useCallback(() => {
    setRentRecords([]);
    setPayments([]);
    setSummary({ ...EMPTY_SUMMARY });
  }, []);

  // =====================================================
  // LOAD SELECTED PG DATA
  // =====================================================

  const loadPayments = useCallback(async () => {
    const pgId = getActivePGId();

    setActivePGId(pgId);
    setError("");

    if (!pgId || pgId.toLowerCase() === "all") {
      resetPaymentData();
      setError("Please select a PG to view payment details.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [
        rentResponse,
        summaryResponse,
        paymentsResponse,
      ] = await Promise.all([
        getRentRecordsApi(
          selectedMonth,
          selectedYear,
          pgId
        ),

        getRentSummaryApi(
          selectedMonth,
          selectedYear,
          pgId
        ),

        getMyPaymentsApi(
          pgId,
          "",
          selectedMonth,
          selectedYear
        ),
      ]);

      setRentRecords(
        rentResponse?.rentRecords ||
        rentResponse?.records ||
        []
      );

      setSummary({
        ...EMPTY_SUMMARY,
        ...(summaryResponse?.summary || {}),
      });

      setPayments(paymentsResponse?.payments || []);
    } catch (err) {
      console.error("Load payments error:", err);

      resetPaymentData();

      setError(
        err?.message || "Failed to load payment details."
      );
    } finally {
      setLoading(false);
    }
  }, [
    selectedMonth,
    selectedYear,
    activePGId,
    resetPaymentData,
  ]);

  // =====================================================
  // REFRESH ON MONTH, YEAR OR PG CHANGE
  // =====================================================

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    const handlePGChange = () => {
      const newPGId = getActivePGId();

      setActivePGId((previous) =>
        previous === newPGId ? previous : newPGId
      );
    };

    const handleStorage = (event) => {
      if (
        !event ||
        event.key === "pgmate_active_pg"
      ) {
        handlePGChange();
      }
    };

    window.addEventListener(
      "pgmate-pg-changed",
      handlePGChange
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "pgmate-pg-changed",
        handlePGChange
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  // =====================================================
  // TENANT / ROOM HELPERS
  // =====================================================

  const getTenantName = (record) =>
    record?.userId?.name ||
    record?.tenantId?.userId?.name ||
    record?.tenantId?.name ||
    record?.tenantName ||
    record?.name ||
    "Tenant name unavailable";

  const getTenantMobile = (record) =>
    record?.userId?.mobile ||
    record?.tenantId?.userId?.mobile ||
    record?.mobile ||
    "";

  const getTenantId = (record) => {
    const tenant = record?.tenantId;

    if (typeof tenant === "string") {
      return tenant;
    }

    return tenant?._id || record?.tenant?._id || "";
  };

  const getRoomNumber = (record) =>
    record?.roomId?.roomNumber ||
    record?.tenantId?.roomId?.roomNumber ||
    record?.bedId?.roomId?.roomNumber ||
    record?.tenantId?.bedId?.roomId?.roomNumber ||
    record?.bedId?.roomNumber ||
    record?.roomNumber ||
    "";

  const getBedNumber = (record) =>
    record?.bedId?.bedNumber ||
    record?.bedId?.bedName ||
    record?.tenantId?.bedId?.bedNumber ||
    record?.tenantId?.bedId?.bedName ||
    record?.bedNumber ||
    "";

  const getPropertyName = (record) =>
    record?.pgId?.name ||
    record?.tenantId?.pgId?.name ||
    "";

  const isTenantVacated = (record) => {
    const statuses = [
      record?.tenantStatus,
      record?.tenant?.status,
      record?.tenantId?.status,
      record?.tenantId?.tenantStatus,
    ];

    return (
      statuses.some(
        (status) =>
          String(status || "").toLowerCase() === "vacated"
      ) ||
      Boolean(
        record?.tenant?.vacatedAt ||
        record?.tenantId?.vacatedAt ||
        record?.tenantVacatedAt
      )
    );
  };

  // =====================================================
  // OUTSTANDING BALANCE
  // =====================================================

  const getTenantBalance = (record) => {
    const balanceFields = [
      record?.tenantId?.outstandingBalance,
      record?.outstandingBalance,
      record?.remainingBalance,
      record?.balanceDue,
      record?.amountDue,
    ];

    for (const value of balanceFields) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        const balance = Number(value);

        return Number.isFinite(balance)
          ? Math.max(0, balance)
          : null;
      }
    }

    return null;
  };

  // =====================================================
  // FILTER RENT RECORDS
  // =====================================================

  const filteredRecords = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return rentRecords.filter((record) => {
      const tenantName = getTenantName(record).toLowerCase();
      const mobile = getTenantMobile(record).toLowerCase();
      const pgName = getPropertyName(record).toLowerCase();

      const roomNumber = String(
        getRoomNumber(record)
      ).toLowerCase();

      const bedNumber = String(
        getBedNumber(record)
      ).toLowerCase();

      const matchesSearch =
        !searchValue ||
        tenantName.includes(searchValue) ||
        mobile.includes(searchValue) ||
        pgName.includes(searchValue) ||
        roomNumber.includes(searchValue) ||
        bedNumber.includes(searchValue);

      const vacated = isTenantVacated(record);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "vacated" && vacated) ||
        (statusFilter === "paid" &&
          !vacated &&
          record.status === "paid") ||
        (statusFilter === "pending" &&
          !vacated &&
          record.status === "pending") ||
        (statusFilter === "overdue" &&
          !vacated &&
          record.status === "overdue");

      return matchesSearch && matchesStatus;
    });
  }, [rentRecords, search, statusFilter]);

  // =====================================================
  // FILTER PAYMENT TRANSACTIONS
  // =====================================================

  const filteredPayments = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const tenantName = getTenantName(payment).toLowerCase();
      const mobile = getTenantMobile(payment).toLowerCase();
      const pgName = getPropertyName(payment).toLowerCase();

      const roomNumber = String(
        getRoomNumber(payment)
      ).toLowerCase();

      const bedNumber = String(
        getBedNumber(payment)
      ).toLowerCase();

      return (
        !searchValue ||
        tenantName.includes(searchValue) ||
        mobile.includes(searchValue) ||
        pgName.includes(searchValue) ||
        roomNumber.includes(searchValue) ||
        bedNumber.includes(searchValue)
      );
    });
  }, [payments, search]);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const notifyPaymentsChanged = () => {
    window.dispatchEvent(new Event("pgmate-payments-changed"));
  };

  // =====================================================
  // CREATE RENT PAYMENT
  // =====================================================

  const handleCreatePayment = async (event) => {
    event.preventDefault();

    const pgId = getActivePGId();

    if (!pgId || pgId.toLowerCase() === "all") {
      setMessageCard({
        type: "warning",
        title: "Select a PG",
        message: "Please select a PG before recording a payment.",
      });
      return;
    }

    if (!form.tenantId.trim()) {
      setMessageCard({
        type: "warning",
        title: "Tenant required",
        message: "Please enter the tenant ID.",
      });
      return;
    }

    const amount = Number(form.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.round(amount * 100) !== amount * 100
    ) {
      setMessageCard({
        type: "warning",
        title: "Valid amount required",
        message: "Enter an amount greater than zero with up to two decimal places.",
      });
      return;
    }

    if (!form.paymentDate) {
      setMessageCard({
        type: "warning",
        title: "Payment date required",
        message: "Please select the payment date.",
      });
      return;
    }

    if (form.notes.length > 1000) {
      setMessageCard({
        type: "warning",
        title: "Notes too long",
        message: "Notes cannot exceed 1000 characters.",
      });
      return;
    }

    try {
      setCreatingPayment(true);
      setError("");

      await createPaymentApi({
        tenantId: form.tenantId.trim(),
        pgId,
        amount,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        month: Number(selectedMonth),
        year: Number(selectedYear),
        notes: form.notes.trim(),
      });

      setShowAddPayment(false);

      setForm({
        tenantId: "",
        amount: "",
        paymentDate: getTodayDate(),
        paymentMethod: "cash",
        notes: "",
      });

      await loadPayments();

      setMessageCard({
        type: "success",
        title: "Payment recorded",
        message: "The rent payment was recorded successfully.",
      });
    } catch (err) {
      console.error("Create payment error:", err);

      setMessageCard({
        type: "error",
        title: "Payment failed",
        message:
          err?.message || "Failed to record payment.",
      });
    } finally {
      setCreatingPayment(false);
    }
  };

  // =====================================================
  // OPEN DEBT COLLECTION MODAL
  // =====================================================

  const openCollectionModal = (record) => {
    const balance = getTenantBalance(record);

    if (!isTenantVacated(record)) {
      setMessageCard({
        type: "warning",
        title: "Tenant is not vacated",
        message:
          "Debt collection is available for vacated tenants only.",
      });
      return;
    }

    if (balance === null || balance <= 0) {
      setMessageCard({
        type: "warning",
        title: "No outstanding balance",
        message:
          "No collectible outstanding balance was found for this tenant.",
      });
      return;
    }

    setError("");

    setCollectionForm({
      amount: String(balance),
      paymentMethod: "cash",
      notes: "",
    });

    setTenantToCollect(record);
  };

  // =====================================================
  // COLLECT VACATED TENANT DEBT
  // =====================================================

  const handleCollectDebt = async (event) => {
    event.preventDefault();

    if (!tenantToCollect || collectingDebt) return;

    const tenantId = getTenantId(tenantToCollect);
    const amount = Number(collectionForm.amount);
    const balance = getTenantBalance(tenantToCollect);

    if (!tenantId) {
      setError("Unable to identify this tenant.");
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.round(amount * 100) !== amount * 100
    ) {
      setError(
        "Enter a valid amount with up to two decimal places."
      );
      return;
    }

    if (
      balance === null ||
      balance <= 0 ||
      amount > balance
    ) {
      setError(
        "The collection amount exceeds the available balance."
      );
      return;
    }

    if (collectionForm.notes.length > 1000) {
      setError("Notes cannot exceed 1000 characters.");
      return;
    }

    try {
      setCollectingDebt(tenantId);
      setError("");

      await collectVacatedDebtApi(tenantId, {
        amount,
        paymentMethod: collectionForm.paymentMethod,
        notes: collectionForm.notes.trim(),
      });

      setTenantToCollect(null);

      setCollectionForm({
        amount: "",
        paymentMethod: "cash",
        notes: "",
      });

      await loadPayments();

      setMessageCard({
        type: "success",
        title: "Collection recorded",
        message:
          "The outstanding debt collection was recorded successfully.",
      });
    } catch (err) {
      console.error("Collection failed:", err);

      setMessageCard({
        type: "error",
        title: "Collection failed",
        message:
          err?.message ||
          "Collection could not be saved. Please refresh and try again.",
      });
    } finally {
      setCollectingDebt("");
    }
  };

  // =====================================================
  // DELETE PAYMENT
  // =====================================================

  const handleDeletePayment = (payment) => {
    setPaymentToDelete(payment);
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete?._id || deletingPayment) return;

    try {
      setDeletingPayment(paymentToDelete._id);
      setError("");

      await deletePaymentApi(paymentToDelete._id);

      setPaymentToDelete(null);

      await loadPayments();

      setMessageCard({
        type: "success",
        title: "Payment deleted",
        message:
          "The payment was deleted and rent details refreshed.",
      });
    } catch (err) {
      console.error("Delete payment error:", err);

      setPaymentToDelete(null);

      setMessageCard({
        type: "error",
        title: "Delete failed",
        message:
          err?.message || "Failed to delete payment.",
      });
    } finally {
      setDeletingPayment("");
    }
  };

  // =====================================================
  // FORMATTING
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const getStatusLabel = (record) => {
    if (isTenantVacated(record)) return "Vacated";

    if (record.status === "paid") {
      const daysLate = Number(record.daysLate) || 0;

      return daysLate > 0
        ? `Paid ${daysLate} Days Late`
        : "Paid On Time";
    }

    if (record.status === "overdue") return "Overdue";

    return "Pending";
  };

  const getStatusClass = (record) => {
    if (isTenantVacated(record)) return "vacated";
    if (record.status === "paid") return "paid";
    if (record.status === "overdue") return "overdue";

    return "pending";
  };

  const formatPaymentMethod = (method) => {
    if (!method) return "-";

    const found = PAYMENT_METHODS.find(
      (item) => item.value === method
    );

    return found?.label || method;
  };

  const renderRoomDetails = (record) => {
    const roomNumber = getRoomNumber(record);
    const bedNumber = getBedNumber(record);
    const propertyName = getPropertyName(record);

    return (
      <small className="payment-room-details">
        <DoorOpen
          size={13}
          style={{
            display: "inline",
            verticalAlign: "middle",
            marginRight: "4px",
          }}
        />

        {roomNumber
          ? `Room ${roomNumber}`
          : "Room not assigned"}

        {bedNumber ? ` · Bed ${bedNumber}` : ""}
        {propertyName ? ` · ${propertyName}` : ""}
      </small>
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

          <h3>Loading payments...</h3>
          <p>Please wait while we fetch the rent details.</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="payments-page">
      <div className="payments-page-header">
        <div>
          <p>Track and manage your tenants' monthly rent.</p>
        </div>

        <button
          className="payments-add-btn"
          disabled={!activePGId || activePGId === "all"}
          onClick={() => {
            setError("");
            setShowAddPayment(true);
          }}
        >
          <Plus size={17} />
          Record Payment
        </button>
      </div>

      {error && (
        <div className="payments-error">
          <AlertCircle size={17} />

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

      {/* RENT PERIOD */}

      <div className="payments-period-card">
        <div className="payments-period-title">
          <div className="payments-period-icon">
            <CalendarDays size={18} />
          </div>

          <div>
            <strong>Rent Period</strong>
            <span>
              View rent status for a specific month and year.
            </span>
          </div>
        </div>

        <div className="payments-period-selects">
          <div className="payments-period-select">
            <label htmlFor="payments-month">Month</label>

            <select
              id="payments-month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(Number(event.target.value))
              }
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div className="payments-period-select">
            <label htmlFor="payments-year">Year</label>

            <select
              id="payments-year"
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(Number(event.target.value))
              }
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}

      <div className="payments-stats">
        <div className="payment-stat-card">
          <div className="payment-stat-icon blue">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>Paid</span>
            <strong>{summary.paid}</strong>
            <small>
              {formatCurrency(summary.paidAmount)}
            </small>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon orange">
            <Clock3 size={21} />
          </div>

          <div>
            <span>Pending</span>
            <strong>{summary.pending}</strong>
            <small>
              {formatCurrency(summary.pendingAmount)}
            </small>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon red">
            <AlertCircle size={21} />
          </div>

          <div>
            <span>Overdue</span>
            <strong>{summary.overdue}</strong>
            <small>
              {formatCurrency(summary.overdueAmount)}
            </small>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon green">
            <IndianRupee size={21} />
          </div>

          <div>
            <span>Total Collected</span>

            <strong>
              {formatCurrency(summary.totalCollected)}
            </strong>

            <small>
              {summary.paidOnTime} on time ·{" "}
              {summary.paidLate} late
            </small>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER */}

      <div className="payments-toolbar">
        <div className="payments-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search tenant, PG, room or bed..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="payments-filter">
          <Filter size={17} />

          <select
            aria-label="Filter rent records by status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="all">All Tenants</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="vacated">Vacated</option>
          </select>
        </div>
      </div>

      {/* RENT RECORDS */}

      <div className="payments-card">
        <div className="payments-card-header">
          <div>
            <h2>
              {MONTHS[selectedMonth - 1]} {selectedYear} Rent
            </h2>

            <p>
              Monthly rent status, room numbers and outstanding balances.
            </p>
          </div>

          <div className="payment-count">
            {filteredRecords.length} Records
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="payments-empty">
            <div className="payments-empty-icon">
              <CreditCard size={27} />
            </div>

            <h3>No rent records found</h3>

            <p>
              There are no rent records matching your selected
              month and filters.
            </p>

            <button
              className="payments-empty-btn"
              disabled={!activePGId || activePGId === "all"}
              onClick={() => setShowAddPayment(true)}
            >
              <Plus size={17} />
              Record Payment
            </button>
          </div>
        ) : (
          <div className="payments-list">
            {filteredRecords.map((record) => {
              const tenantName = getTenantName(record);
              const mobile = getTenantMobile(record);
              const vacated = isTenantVacated(record);
              const statusClass = getStatusClass(record);
              const statusLabel = getStatusLabel(record);
              const balance = getTenantBalance(record);
              const tenantId = getTenantId(record);

              return (
                <div
                  className={`payment-row rent-record-row rent-${statusClass}`}
                  key={record._id}
                >
                  <div className="payment-tenant">
                    <div className="payment-avatar">
                      {tenantName.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h3>{tenantName}</h3>
                      <p>{mobile || " "}</p>

                      {renderRoomDetails(record)}

                      {vacated && (
                        <small className="vacated-tenant-label">
                          Vacated
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="payment-info">
                    <span>Monthly Rent</span>
                    <strong>
                      {formatCurrency(record.amount)}
                    </strong>
                  </div>

                  <div className="payment-info">
                    <span>Due Date</span>
                    <strong>
                      {formatDate(record.dueDate)}
                    </strong>
                  </div>

                  <div className="payment-info">
                    <span>Paid Date</span>
                    <strong>
                      {record.paidDate
                        ? formatDate(record.paidDate)
                        : "-"}
                    </strong>
                  </div>

                  <div className={`payment-status ${statusClass}`}>
                    {statusLabel}
                  </div>

                  <div className="payment-method">
                    <span>Method</span>
                    <strong>
                      {formatPaymentMethod(record.paymentMethod)}
                    </strong>
                  </div>

                  <div className="payment-info payment-balance-info">
                    <span>
                      {vacated ? "Final Amount Due" : "Balance Due"}
                    </span>

                    <strong
                      className={
                        balance === null
                          ? ""
                          : balance > 0
                            ? "balance-due"
                            : "balance-clear"
                      }
                    >
                      {balance === null
                        ? "Balance unavailable"
                        : balance > 0
                          ? formatCurrency(balance)
                          : "No balance due"}
                    </strong>
                  </div>

                  {vacated && balance !== null && balance > 0 && (
                    <div className="vacated-balance-notice">
                      <button
                        type="button"
                        className="payments-collect-btn"
                        disabled={
                          !tenantId ||
                          collectingDebt === tenantId
                        }
                        onClick={() =>
                          openCollectionModal(record)
                        }
                      >
                        {collectingDebt === tenantId ? (
                          <>
                            <Loader2
                              size={15}
                              className="delete-spinner"
                            />
                            Collecting...
                          </>
                        ) : (
                          <>
                            <Wallet size={15} />
                            Mark as Collected
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {!vacated &&
                    record.status === "paid" &&
                    Number(record.daysLate) > 0 && (
                      <div className="payment-late-info">
                        {record.daysLate} days late
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PAYMENT TRANSACTION HISTORY */}

      {filteredPayments.length > 0 && (
        <div className="payments-card payments-history-card">
          <div className="payments-card-header">
            <div>
              <h2>Payment Transactions</h2>

              <p>
                Actual payment entries recorded for this month.
              </p>
            </div>

            <div className="payment-count">
              {filteredPayments.length} Transactions
            </div>
          </div>

          <div className="payments-list">
            {filteredPayments.map((payment) => {
              const tenantName = getTenantName(payment);
              const mobile = getTenantMobile(payment);

              return (
                <div
                  className="payment-row transaction-row"
                  key={payment._id}
                >
                  <div className="payment-tenant">
                    <div className="payment-avatar">
                      {tenantName.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h3>{tenantName}</h3>
                      <p>{mobile || " "}</p>

                      {renderRoomDetails(payment)}
                    </div>
                  </div>

                  <div className="payment-info">
                    <span>Amount</span>
                    <strong>
                      {formatCurrency(payment.amount)}
                    </strong>
                  </div>

                  <div className="payment-info">
                    <span>Payment Date</span>
                    <strong>
                      {formatDate(payment.paymentDate)}
                    </strong>
                  </div>

                  <div className="payment-method">
                    <span>Method</span>
                    <strong>
                      {formatPaymentMethod(payment.paymentMethod)}
                    </strong>
                  </div>

                  <div
                    className={`payment-status ${payment.status || "paid"}`}
                  >
                    {payment.status || "paid"}
                  </div>

                  <button
                    type="button"
                    className="payment-delete-btn"
                    title="Delete payment"
                    aria-label={`Delete payment for ${tenantName}`}
                    disabled={deletingPayment === payment._id}
                    onClick={() =>
                      handleDeletePayment(payment)
                    }
                  >
                    {deletingPayment === payment._id ? (
                      <Loader2
                        size={16}
                        className="delete-spinner"
                      />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}

      {showAddPayment && (
        <div
          className="payment-modal-overlay"
          onClick={() => {
            if (!creatingPayment) {
              setShowAddPayment(false);
            }
          }}
        >
          <div
            className="payment-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payment-modal-header">
              <div>
                <h2>Record Payment</h2>

                <p>
                  Record rent for {MONTHS[selectedMonth - 1]}{" "}
                  {selectedYear}.
                </p>
              </div>

              <button
                type="button"
                className="payment-modal-close"
                disabled={creatingPayment}
                onClick={() => setShowAddPayment(false)}
                aria-label="Close payment form"
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="payment-form"
              onSubmit={handleCreatePayment}
            >
              <div className="payment-form-group">
                <label htmlFor="payment-tenant-id">
                  Tenant ID
                </label>

                <input
                  id="payment-tenant-id"
                  type="text"
                  name="tenantId"
                  value={form.tenantId}
                  onChange={handleChange}
                  placeholder="Enter tenant ID"
                  required
                />

                <small>
                  Use the tenant ID from the Tenants module.
                </small>
              </div>

              <div className="payment-form-row">
                <div className="payment-form-group">
                  <label htmlFor="payment-amount">
                    Amount
                  </label>

                  <div className="amount-input">
                    <IndianRupee size={16} />

                    <input
                      id="payment-amount"
                      type="number"
                      name="amount"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={handleChange}
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                </div>

                <div className="payment-form-group">
                  <label htmlFor="payment-date">
                    Payment Date
                  </label>

                  <input
                    id="payment-date"
                    type="date"
                    name="paymentDate"
                    value={form.paymentDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="payment-form-group">
                <label htmlFor="payment-method">
                  Payment Method
                </label>

                <select
                  id="payment-method"
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={handleChange}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option
                      key={method.value}
                      value={method.value}
                    >
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="payment-form-group">
                <label htmlFor="payment-notes">
                  Notes
                </label>

                <textarea
                  id="payment-notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Optional notes..."
                  rows="3"
                  maxLength={1000}
                />
              </div>

              <div className="payment-form-actions">
                <button
                  type="button"
                  className="payment-cancel-btn"
                  disabled={creatingPayment}
                  onClick={() => setShowAddPayment(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="payment-save-btn"
                  disabled={creatingPayment}
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
                      <CheckCircle2 size={17} />
                      Save Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLLECT VACATED TENANT DEBT MODAL */}

      {tenantToCollect && (
        <div
          className="payment-modal-overlay"
          onClick={() => {
            if (!collectingDebt) {
              setTenantToCollect(null);
            }
          }}
        >
          <div
            className="payment-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payment-modal-header">
              <div>
                <h2>Collect Outstanding Balance</h2>
                <p>{getTenantName(tenantToCollect)}</p>
              </div>

              <button
                type="button"
                className="payment-modal-close"
                disabled={Boolean(collectingDebt)}
                onClick={() => setTenantToCollect(null)}
                aria-label="Close collection form"
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="payment-form"
              onSubmit={handleCollectDebt}
            >
              <div className="payment-form-group">
                <label>Current Outstanding Balance</label>

                <strong>
                  {formatCurrency(
                    getTenantBalance(tenantToCollect)
                  )}
                </strong>
              </div>

              <div className="payment-form-group">
                <label htmlFor="collection-amount">
                  Amount Collected (₹)
                </label>

                <input
                  id="collection-amount"
                  type="number"
                  min="0.01"
                  max={
                    getTenantBalance(tenantToCollect) ?? undefined
                  }
                  step="0.01"
                  value={collectionForm.amount}
                  onChange={(event) =>
                    setCollectionForm((previous) => ({
                      ...previous,
                      amount: event.target.value,
                    }))
                  }
                  required
                />

                <small>
                  You can collect the full balance or a partial amount.
                </small>
              </div>

              <div className="payment-form-group">
                <label htmlFor="collection-method">
                  Payment Method
                </label>

                <select
                  id="collection-method"
                  value={collectionForm.paymentMethod}
                  onChange={(event) =>
                    setCollectionForm((previous) => ({
                      ...previous,
                      paymentMethod: event.target.value,
                    }))
                  }
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option
                      key={method.value}
                      value={method.value}
                    >
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="payment-form-group">
                <label htmlFor="collection-notes">
                  Notes
                </label>

                <textarea
                  id="collection-notes"
                  rows="3"
                  maxLength={1000}
                  value={collectionForm.notes}
                  onChange={(event) =>
                    setCollectionForm((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Optional collection notes..."
                />
              </div>

              <div className="payment-form-actions">
                <button
                  type="button"
                  className="payment-cancel-btn"
                  disabled={Boolean(collectingDebt)}
                  onClick={() => setTenantToCollect(null)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="payment-save-btn"
                  disabled={Boolean(collectingDebt)}
                >
                  {collectingDebt ? (
                    <>
                      <Loader2
                        size={17}
                        className="delete-spinner"
                      />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      Confirm Collection
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}

      {paymentToDelete && (
        <MessageCard
          type="confirm"
          title="Delete payment?"
          message="This will remove the payment transaction and update the corresponding rent record."
          onClose={() => {
            if (!deletingPayment) {
              setPaymentToDelete(null);
            }
          }}
          onConfirm={confirmDeletePayment}
          confirmText={
            deletingPayment ? "Deleting..." : "Delete Payment"
          }
          cancelText="Cancel"
        />
      )}

      {/* NOTIFICATION */}

      {messageCard && (
        <MessageCard
          type={messageCard.type}
          title={messageCard.title}
          message={messageCard.message}
          onClose={() => setMessageCard(null)}
        />
      )}
    </div>
  );
}

export default Payments;