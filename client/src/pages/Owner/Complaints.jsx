import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Plus,
  Search,
  MessageSquareWarning,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  CircleDot,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

import {
  getOwnerComplaintsApi,
  getComplaintSummaryApi,
  getComplaintTenantsApi,
  createComplaintApi,
  updateComplaintApi,
  deleteComplaintApi,
} from "../../services/api";

import "./Complaints.css";

const categories = [
  { value: "all", label: "All Categories" },
  { value: "maintenance", label: "Maintenance" },
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "cleaning", label: "Cleaning" },
  { value: "food", label: "Food" },
  { value: "internet", label: "Internet" },
  { value: "room", label: "Room" },
  { value: "noise", label: "Noise" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

const priorities = [
  { value: "all", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const statuses = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const EMPTY_SUMMARY = {
  total: 0,
  open: 0,
  inProgress: 0,
  resolved: 0,
  closed: 0,
  urgent: 0,
  high: 0,
};

const EMPTY_FORM = {
  tenantId: "",
  title: "",
  category: "maintenance",
  description: "",
  priority: "medium",
  notes: "",
};

const getActivePGId = () => {
  const pgId = localStorage.getItem("pgmate_active_pg");

  if (!pgId || pgId === "all") {
    return "";
  }

  return pgId;
};

const getId = (value) => {
  if (!value) return "";
  return typeof value === "object" ? value._id || "" : value;
};

function Complaints() {
  const [activePGId, setActivePGId] = useState(getActivePGId);

  const [complaints, setComplaints] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [showAddComplaint, setShowAddComplaint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  // --------------------------------------------------
  // HANDLE ACTIVE PG CHANGES
  // --------------------------------------------------

  useEffect(() => {
    const handlePGChange = () => {
      setActivePGId(getActivePGId());
    };

    window.addEventListener("pgmate-pg-changed", handlePGChange);
    window.addEventListener("storage", handlePGChange);

    // Read the latest selected PG when the page mounts.
    handlePGChange();

    return () => {
      window.removeEventListener("pgmate-pg-changed", handlePGChange);
      window.removeEventListener("storage", handlePGChange);
    };
  }, []);

  // --------------------------------------------------
  // LOAD COMPLAINTS AND SUMMARY FOR SELECTED PG
  // --------------------------------------------------

  const loadComplaints = useCallback(async () => {
    const pgId = getActivePGId();

    if (!pgId) {
      setComplaints([]);
      setSummary(EMPTY_SUMMARY);
      setTenants([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [complaintsResponse, summaryResponse] = await Promise.all([
        getOwnerComplaintsApi(
          pgId,
          statusFilter,
          categoryFilter,
          priorityFilter
        ),
        // Summary intentionally does not use list filters.
        getComplaintSummaryApi(pgId),
      ]);

      // Avoid showing stale results if the user switches PGs mid-request.
      if (getActivePGId() !== pgId) return;

      setComplaints(complaintsResponse.complaints || []);
      setSummary({
        ...EMPTY_SUMMARY,
        ...(summaryResponse.summary || {}),
      });
    } catch (err) {
      console.error("Load complaints error:", err);
      setComplaints([]);
      setSummary(EMPTY_SUMMARY);
      setError(err.message || "Failed to load complaints.");
    } finally {
      if (getActivePGId() === pgId) {
        setLoading(false);
      }
    }
  }, [statusFilter, categoryFilter, priorityFilter]);

  // --------------------------------------------------
  // LOAD ACTIVE TENANTS FOR SELECTED PG
  // --------------------------------------------------

  const loadTenants = useCallback(async () => {
    const pgId = getActivePGId();

    if (!pgId) {
      setTenants([]);
      setTenantsLoading(false);
      return;
    }

    setTenantsLoading(true);

    try {
      const response = await getComplaintTenantsApi(pgId);

      if (getActivePGId() !== pgId) return;

      setTenants(response.tenants || []);
    } catch (err) {
      console.error("Load complaint tenants error:", err);

      if (getActivePGId() === pgId) {
        setTenants([]);
        setError(err.message || "Failed to load active tenants.");
      }
    } finally {
      if (getActivePGId() === pgId) {
        setTenantsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints, activePGId]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants, activePGId]);

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return complaints;

    return complaints.filter((complaint) => {
      const title = complaint.title?.toLowerCase() || "";
      const description = complaint.description?.toLowerCase() || "";
      const category = complaint.category?.toLowerCase() || "";
      const tenantName =
        complaint.tenantId?.userId?.name?.toLowerCase() ||
        complaint.userId?.name?.toLowerCase() ||
        "";
      const mobile =
        complaint.tenantId?.userId?.mobile ||
        complaint.userId?.mobile ||
        "";
      const pgName = complaint.pgId?.name?.toLowerCase() || "";

      return (
        title.includes(query) ||
        description.includes(query) ||
        category.includes(query) ||
        tenantName.includes(query) ||
        mobile.includes(query) ||
        pgName.includes(query)
      );
    });
  }, [complaints, search]);

  // --------------------------------------------------
  // FORM HELPERS
  // --------------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
  };

  const closeAddModal = () => {
    if (submitting) return;

    setShowAddComplaint(false);
    setError("");
    resetForm();
  };

  // --------------------------------------------------
  // CREATE COMPLAINT
  // --------------------------------------------------

  const handleAddComplaint = async (event) => {
    event.preventDefault();

    const pgId = getActivePGId();

    if (!pgId) {
      setError("Please select a PG before adding a complaint.");
      return;
    }

    if (
      !form.tenantId ||
      !form.title.trim() ||
      !form.description.trim()
    ) {
      setError("Please fill all required fields.");
      return;
    }

    const selectedTenant = tenants.find(
      (tenant) => tenant._id === form.tenantId
    );

    if (!selectedTenant) {
      setError("Please select a valid active tenant.");
      return;
    }

    // Extra frontend guard; the backend independently verifies ownership.
    if (getId(selectedTenant.pgId) !== pgId) {
      setError("The selected tenant does not belong to the active PG.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createComplaintApi({
        pgId,
        tenantId: form.tenantId,
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        priority: form.priority,
        notes: form.notes.trim(),
      });

      setShowAddComplaint(false);
      resetForm();

      await Promise.all([loadComplaints(), loadTenants()]);
    } catch (err) {
      console.error("Create complaint error:", err);
      setError(err.message || "Failed to create complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // UPDATE STATUS
  // --------------------------------------------------

  const handleStatusChange = async (complaintId, status) => {
    const previousComplaint = complaints.find(
      (item) => item._id === complaintId
    );

    if (!previousComplaint) return;

    try {
      setUpdatingId(complaintId);
      setError("");

      // Update the visible row immediately.
      setComplaints((previous) =>
        previous.map((item) =>
          item._id === complaintId ? { ...item, status } : item
        )
      );

      await updateComplaintApi(complaintId, { status });

      await loadComplaints();
    } catch (err) {
      console.error("Update complaint status error:", err);

      // Restore the previous status if the API fails.
      setComplaints((previous) =>
        previous.map((item) =>
          item._id === complaintId
            ? { ...item, status: previousComplaint.status }
            : item
        )
      );

      setError(err.message || "Failed to update complaint.");
    } finally {
      setUpdatingId(null);
    }
  };

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  const handleDelete = async (complaintId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this complaint? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingId(complaintId);
      setError("");

      await deleteComplaintApi(complaintId);

      await loadComplaints();
    } catch (err) {
      console.error("Delete complaint error:", err);
      setError(err.message || "Failed to delete complaint.");
    } finally {
      setDeletingId(null);
    }
  };

  // --------------------------------------------------
  // DISPLAY HELPERS
  // --------------------------------------------------

  const formatDate = (date) => {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getCategoryLabel = (value) =>
    categories.find((item) => item.value === value)?.label || "Other";

  const getPriorityLabel = (value) =>
    priorities.find((item) => item.value === value)?.label || "Medium";

  const getStatusLabel = (value) =>
    statuses.find((item) => item.value === value)?.label || value;

  // --------------------------------------------------
  // NO PG SELECTED
  // --------------------------------------------------

  if (!activePGId) {
    return (
      <div className="complaints-page">
        <div className="complaints-header">
          <div>
            <span className="complaints-eyebrow">SUPPORT</span>
            <p>Track and resolve tenant complaints and issues.</p>
          </div>
        </div>

        <div className="complaints-empty">
          <div className="complaints-empty-icon">
            <MessageSquareWarning size={28} />
          </div>

          <h3>Select a PG first</h3>
          <p>
            Choose a property from your PG selector to view its complaints,
            summary counts, and tenants.
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="complaints-page">
        <div className="complaints-loading-card">
          <div className="complaints-loading-icon">
            <Loader2 size={24} className="complaints-spinner" />
          </div>

          <div>
            <h3>Loading complaints...</h3>
            <p>Fetching complaints for the selected PG.</p>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // MAIN PAGE
  // --------------------------------------------------

  return (
    <div className="complaints-page">
      {/* HEADER */}
      <div className="complaints-header">
        <div>
          <span className="complaints-eyebrow">SUPPORT</span>
          <p>Track and resolve tenant complaints and issues.</p>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="complaints-error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="complaints-stats">
        <div className="complaint-stat-card">
          <div className="complaint-stat-icon">
            <MessageSquareWarning size={20} />
          </div>
          <div>
            <span>Total</span>
            <strong>{summary.total}</strong>
          </div>
        </div>

        <div className="complaint-stat-card">
          <div className="complaint-stat-icon">
            <CircleDot size={20} />
          </div>
          <div>
            <span>Open</span>
            <strong>{summary.open}</strong>
          </div>
        </div>

        <div className="complaint-stat-card">
          <div className="complaint-stat-icon">
            <Clock3 size={20} />
          </div>
          <div>
            <span>In Progress</span>
            <strong>{summary.inProgress}</strong>
          </div>
        </div>

        <div className="complaint-stat-card">
          <div className="complaint-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span>Resolved</span>
            <strong>{summary.resolved}</strong>
          </div>
        </div>

        <div className="complaint-stat-card complaint-stat-danger">
          <div className="complaint-stat-icon">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span>Urgent</span>
            <strong>{summary.urgent}</strong>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="complaints-toolbar">
        <div className="complaints-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search complaints..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="complaints-filters">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
          >
            {priorities.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* COMPLAINT LIST */}
      <div className="complaints-list-card">
        <div className="complaints-list-header">
          <div>
            <h2>Complaint History</h2>
            <p>{filteredComplaints.length} records found</p>
          </div>
        </div>

        {filteredComplaints.length === 0 ? (
          <div className="complaints-empty">
            <div className="complaints-empty-icon">
              <MessageSquareWarning size={28} />
            </div>

            <h3>No complaints found</h3>

            <p>
              No complaints match the current PG and filters.
            </p>

            <button
              type="button"
              onClick={() => {
                setError("");
                setShowAddComplaint(true);
              }}
            >
              <Plus size={17} />
              Add Complaint
            </button>
          </div>
        ) : (
          <div className="complaints-table-wrapper">
            <table className="complaints-table">
              <thead>
                <tr>
                  <th>Complaint</th>
                  <th>Tenant</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {filteredComplaints.map((complaint) => {
                  const tenantName =
                    complaint.tenantId?.userId?.name ||
                    complaint.userId?.name ||
                    "Unknown";

                  const tenantMobile =
                    complaint.tenantId?.userId?.mobile ||
                    complaint.userId?.mobile ||
                    "";

                  return (
                    <tr key={complaint._id}>
                      <td>
                        <div className="complaint-title-cell">
                          <div className="complaint-row-icon">
                            <MessageSquareWarning size={17} />
                          </div>

                          <div>
                            <strong>{complaint.title}</strong>
                            <span>{complaint.description}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="complaint-tenant">
                          <strong>{tenantName}</strong>
                          <span>{tenantMobile}</span>
                        </div>
                      </td>

                      <td>
                        <span className="complaint-category">
                          {getCategoryLabel(complaint.category)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`complaint-priority priority-${complaint.priority}`}
                        >
                          {getPriorityLabel(complaint.priority)}
                        </span>
                      </td>

                      <td>
                        <select
                          aria-label={`Status for ${complaint.title}`}
                          className={`complaint-status status-${complaint.status}`}
                          value={complaint.status}
                          disabled={
                            updatingId === complaint._id ||
                            deletingId === complaint._id
                          }
                          onChange={(event) =>
                            handleStatusChange(
                              complaint._id,
                              event.target.value
                            )
                          }
                        >
                          {statuses
                            .filter((item) => item.value !== "all")
                            .map((status) => (
                              <option
                                key={status.value}
                                value={status.value}
                              >
                                {getStatusLabel(status.value)}
                              </option>
                            ))}
                        </select>

                        {updatingId === complaint._id && (
                          <Loader2
                            size={14}
                            className="complaints-spinner"
                          />
                        )}
                      </td>

                      <td>{formatDate(complaint.createdAt)}</td>

                      <td>
                        <button
                          type="button"
                          className="complaint-delete-btn"
                          title="Delete complaint"
                          aria-label={`Delete ${complaint.title}`}
                          disabled={
                            deletingId === complaint._id ||
                            updatingId === complaint._id
                          }
                          onClick={() => handleDelete(complaint._id)}
                        >
                          {deletingId === complaint._id ? (
                            <Loader2
                              size={17}
                              className="complaints-spinner"
                            />
                          ) : (
                            <Trash2 size={17} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD COMPLAINT MODAL */}
      {showAddComplaint && (
        <div
          className="complaint-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAddModal();
            }
          }}
        >
          <div
            className="complaint-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="complaint-modal-header">
              <div>
                <h2>Add Complaint</h2>
                <p>Record an issue for a tenant in this PG.</p>
              </div>

              <button
                type="button"
                aria-label="Close complaint form"
                disabled={submitting}
                onClick={closeAddModal}
              >
                <X size={20} />
              </button>
            </div>

            <form className="complaint-form" onSubmit={handleAddComplaint}>
              {/* TENANT */}
              <div className="complaint-form-group">
                <label htmlFor="complaint-tenant">Tenant *</label>

                <select
                  id="complaint-tenant"
                  name="tenantId"
                  value={form.tenantId}
                  onChange={handleChange}
                  required
                  disabled={submitting || tenantsLoading}
                >
                  <option value="">
                    {tenantsLoading
                      ? "Loading tenants..."
                      : "Select tenant"}
                  </option>

                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.userId?.name || "Unnamed tenant"}
                      {" — Room "}
                      {tenant.roomId?.roomNumber || "-"}
                      {" / Bed "}
                      {tenant.bedId?.bedNumber || "-"}
                    </option>
                  ))}
                </select>

                {!tenantsLoading && tenants.length === 0 && (
                  <span>
                    No active tenants found in this PG.
                  </span>
                )}
              </div>

              {/* TITLE */}
              <div className="complaint-form-group">
                <label htmlFor="complaint-title">Complaint Title *</label>

                <input
                  id="complaint-title"
                  name="title"
                  type="text"
                  maxLength={150}
                  placeholder="e.g. Bathroom tap is leaking"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* CATEGORY AND PRIORITY */}
              <div className="complaint-form-row">
                <div className="complaint-form-group">
                  <label htmlFor="complaint-category">Category</label>

                  <select
                    id="complaint-category"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    {categories
                      .filter((item) => item.value !== "all")
                      .map((category) => (
                        <option
                          key={category.value}
                          value={category.value}
                        >
                          {category.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="complaint-form-group">
                  <label htmlFor="complaint-priority">Priority</label>

                  <select
                    id="complaint-priority"
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                  >
                    {priorities
                      .filter((item) => item.value !== "all")
                      .map((priority) => (
                        <option
                          key={priority.value}
                          value={priority.value}
                        >
                          {priority.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div className="complaint-form-group">
                <label htmlFor="complaint-description">
                  Description *
                </label>

                <textarea
                  id="complaint-description"
                  name="description"
                  rows="4"
                  maxLength={5000}
                  placeholder="Describe the issue..."
                  value={form.description}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* INTERNAL NOTES */}
              <div className="complaint-form-group">
                <label htmlFor="complaint-notes">Internal Notes</label>

                <textarea
                  id="complaint-notes"
                  name="notes"
                  rows="3"
                  maxLength={3000}
                  placeholder="Optional notes for the owner..."
                  value={form.notes}
                  onChange={handleChange}
                />
              </div>

              {/* ACTIONS */}
              <div className="complaint-form-actions">
                <button
                  type="button"
                  className="complaint-cancel-btn"
                  onClick={closeAddModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="complaint-submit-btn"
                  disabled={
                    submitting ||
                    tenantsLoading ||
                    tenants.length === 0
                  }
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="complaints-spinner"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Add Complaint
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

export default Complaints;