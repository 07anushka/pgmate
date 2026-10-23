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

function Payments() {
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(
    now.getMonth() + 1
  );

  const [selectedYear, setSelectedYear] = useState(
    now.getFullYear()
  );

  const [rentRecords, setRentRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [collections, setCollections] = useState([]);

  const [summary, setSummary] = useState({
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
  });

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
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    notes: "",
  });

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

  const years = Array.from(
    { length: 5 },
    (_, index) => now.getFullYear() - index
  );

  // =====================================================
  // LOAD RENT AND PAYMENT DATA
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
        getRentRecordsApi(selectedMonth, selectedYear),
        getRentSummaryApi(selectedMonth, selectedYear),
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

      setPayments(paymentsResponse.payments || []);

      // Optional: if your backend returns collections in either
      // payment response, use them for a collection-history section.
      setCollections(
        paymentsResponse.collections ||
        rentResponse.collections ||
        []
      );
    } catch (err) {
      console.error("Load payments error:", err);

      setError(
        err.message || "Failed to load payment details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [selectedMonth, selectedYear]);

  // =====================================================
  // TENANT / ROOM HELPERS
  // =====================================================

  const getTenantName = (record) =>
    record.userId?.name ||
    record.tenantId?.userId?.name ||
    record.tenantId?.name ||
    record.tenantName ||
    record.name ||
    "Tenant name unavailable";

  const getTenantMobile = (record) =>
    record.userId?.mobile ||
    record.tenantId?.userId?.mobile ||
    record.mobile ||
    "";

  const getTenantId = (record) => {
    const tenant = record?.tenantId;

    if (typeof tenant === "string") {
      return tenant;
    }

    return tenant?._id || record?.tenant?._id || "";
  };

  const getRoomNumber = (record) =>
    record.roomId?.roomNumber ||
    record.tenantId?.roomId?.roomNumber ||
    record.bedId?.roomId?.roomNumber ||
    record.tenantId?.bedId?.roomId?.roomNumber ||
    record.bedId?.roomNumber ||
    record.roomNumber ||
    "";

  const getBedNumber = (record) =>
    record.bedId?.bedNumber ||
    record.tenantId?.bedId?.bedNumber ||
    "";

  const getPropertyName = (record) =>
    record.pgId?.name ||
    record.tenantId?.pgId?.name ||
    "";

  const isTenantVacated = (record) => {
    const statuses = [
      record.tenantStatus,
      record.tenant?.status,
      record.tenantId?.status,
      record.tenantId?.tenantStatus,
      record.userId?.status,
      record.tenantId?.userId?.status,
    ];

    return (
      statuses.some(
        (status) =>
          String(status || "").toLowerCase() === "vacated"
      ) ||
      Boolean(
        record.tenant?.vacatedAt ||
        record.tenantId?.vacatedAt ||
        record.tenantVacatedAt
      )
    );
  };

  // =====================================================
  // OUTSTANDING BALANCE
  // =====================================================

  const getTenantBalance = (record) => {
    const balanceFields = [
      record.tenantId?.outstandingBalance,
      record.outstandingBalance,
      record.remainingBalance,
      record.balanceDue,
      record.pendingAmount,
      record.amountDue,
    ];

    for (const value of balanceFields) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        return Math.max(0, Number(value) || 0);
      }
    }

    // A paid monthly rent record is not proof that all historical
    // debt has been settled. Do not infer a historical balance.
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
  // FORM CHANGE
  // =====================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // CREATE NORMAL RENT PAYMENT
  // =====================================================

  const handleCreatePayment = async (event) => {
    event.preventDefault();

    if (!form.tenantId.trim()) {
      setMessageCard({
        type: "warning",
        title: "Tenant required",
        message: "Please enter the tenant ID.",
      });
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setMessageCard({
        type: "warning",
        title: "Valid amount required",
        message: "Enter a payment amount greater than zero.",
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

    try {
      setCreatingPayment(true);
      setError("");

      await createPaymentApi({
        tenantId: form.tenantId.trim(),
        amount: Number(form.amount),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        month: Number(selectedMonth),
        year: Number(selectedYear),
        notes: form.notes,
      });

      setShowAddPayment(false);

      setForm({
        tenantId: "",
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
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
        message: err.message || "Failed to record payment.",
      });
    } finally {
      setCreatingPayment(false);
    }
  };

  // =====================================================
  // COLLECT VACATED TENANT'S OUTSTANDING DEBT
  // =====================================================

  const openCollectionModal = (record) => {
    const balance = getTenantBalance(record);

    if (!isTenantVacated(record)) {
      setMessageCard({
        type: "warning",
        title: "Tenant is not vacated",
        message: "Outstanding debt collection is available for vacated tenants only.",
      });
      return;
    }

    if (balance === null || balance <= 0) {
      setMessageCard({
        type: "warning",
        title: "No outstanding balance",
        message: "No collectible outstanding balance was found for this tenant.",
      });
      return;
    }

    setCollectionForm({
      amount: String(balance),
      paymentMethod: "cash",
      notes: "",
    });

    setTenantToCollect(record);
  };

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

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid collection amount.");
      return;
    }

    if (balance === null || balance <= 0 || amount > balance) {
      setError("The collection amount exceeds the available balance.");
      return;
    }

    try {
      setCollectingDebt(tenantId);
      setError("");

      await collectVacatedDebtApi(tenantId, {
        amount,
        paymentMethod: collectionForm.paymentMethod,
        notes: collectionForm.notes,
      });

      setTenantToCollect(null);

      setCollectionForm({
        amount: "",
        paymentMethod: "cash",
        notes: "",
      });

      await loadPayments();
    } catch (err) {
      console.error("Collection failed:", err);
      setError(
        err.message ||
        "Collection could not be saved. Please check the backend server."
      );
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
    if (!paymentToDelete?._id) return;

    try {
      setDeletingPayment(paymentToDelete._id);

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
        message: err.message || "Failed to delete payment.",
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

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

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

    const methods = {
      cash: "Cash",
      upi: "UPI",
      bank: "Bank Transfer",
      card: "Card",
      other: "Other",
    };

    return methods[method] || method;
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

          <button onClick={() => setError("")}>
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
            <label>Month</label>

            <select
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(Number(event.target.value))
              }
            >
              {months.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div className="payments-period-select">
            <label>Year</label>

            <select
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
            <strong>{summary.paid || 0}</strong>
            <small>{formatCurrency(summary.paidAmount)}</small>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon orange">
            <Clock3 size={21} />
          </div>

          <div>
            <span>Pending</span>
            <strong>{summary.pending || 0}</strong>
            <small>{formatCurrency(summary.pendingAmount)}</small>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon red">
            <AlertCircle size={21} />
          </div>

          <div>
            <span>Overdue</span>
            <strong>{summary.overdue || 0}</strong>
            <small>{formatCurrency(summary.overdueAmount)}</small>
          </div>
        </div>


        <div className="payment-stat-card">
          <div className="payment-stat-icon green">
            <IndianRupee size={21} />
          </div>

          <div>
            <span>Total Collected</span>

            <strong>
              {formatCurrency(
                summary.totalCollected ??
                (
                  Number(summary.paidAmount || 0) +
                  Number(summary.debtCollected || 0)
                )
              )}
            </strong>

            <small>
              {summary.paidOnTime || 0} on time ·{" "}
              {summary.paidLate || 0} late
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
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
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
              {months[selectedMonth - 1]} {selectedYear} Rent
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
                    <strong>{formatDate(record.dueDate)}</strong>
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
                        onClick={() => openCollectionModal(record)}
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

      {payments.length > 0 && (
        <div className="payments-card payments-history-card">
          <div className="payments-card-header">
            <div>
              <h2>Payment Transactions</h2>
              <p>
                Actual payment entries recorded for this month.
              </p>
            </div>

            <div className="payment-count">
              {payments.length} Transactions
            </div>
          </div>

          <div className="payments-list">
            {payments
              .filter((payment) => {
                const tenantName =
                  getTenantName(payment).toLowerCase();

                const mobile =
                  getTenantMobile(payment).toLowerCase();

                const searchValue = search.trim().toLowerCase();

                return (
                  !searchValue ||
                  tenantName.includes(searchValue) ||
                  mobile.includes(searchValue) ||
                  getPropertyName(payment)
                    .toLowerCase()
                    .includes(searchValue) ||
                  String(getRoomNumber(payment))
                    .toLowerCase()
                    .includes(searchValue) ||
                  String(getBedNumber(payment))
                    .toLowerCase()
                    .includes(searchValue)
                );
              })
              .map((payment) => {
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
                      className="payment-delete-btn"
                      title="Delete payment"
                      disabled={deletingPayment === payment._id}
                      onClick={() => handleDeletePayment(payment)}
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
            if (!creatingPayment) setShowAddPayment(false);
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
                  Record rent for {months[selectedMonth - 1]}{" "}
                  {selectedYear}.
                </p>
              </div>

              <button
                className="payment-modal-close"
                disabled={creatingPayment}
                onClick={() => setShowAddPayment(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="payment-form"
              onSubmit={handleCreatePayment}
            >
              <div className="payment-form-group">
                <label>Tenant ID</label>

                <input
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
                  <label>Amount</label>

                  <div className="amount-input">
                    <IndianRupee size={16} />

                    <input
                      type="number"
                      name="amount"
                      min="1"
                      step="0.01"
                      value={form.amount}
                      onChange={handleChange}
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                </div>

                <div className="payment-form-group">
                  <label>Payment Date</label>

                  <input
                    type="date"
                    name="paymentDate"
                    value={form.paymentDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="payment-form-group">
                <label>Payment Method</label>

                <select
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={handleChange}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="payment-form-group">
                <label>Notes</label>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Optional notes..."
                  rows="3"
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
                <label>Amount Collected (₹)</label>

                <input
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
                <label>Payment Method</label>

                <select
                  value={collectionForm.paymentMethod}
                  onChange={(event) =>
                    setCollectionForm((previous) => ({
                      ...previous,
                      paymentMethod: event.target.value,
                    }))
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="payment-form-group">
                <label>Notes</label>

                <textarea
                  rows="3"
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
          onClose={() => setPaymentToDelete(null)}
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