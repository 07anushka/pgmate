import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  MessageSquareWarning,
  Clock3,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Wrench,
  Droplets,
  Volume2,
  ShieldAlert,
  MoreHorizontal,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import "./TenantComplaints.css";

const API_URL = "http://localhost:5000/api";

const CATEGORIES = [
  "Maintenance",
  "Plumbing",
  "Electrical",
  "Cleaning",
  "Noise",
  "Security",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const getStatus = (complaint) =>
  String(complaint.status || "Pending").toLowerCase();

const getCategory = (complaint) =>
  complaint.category || complaint.type || "General";

const getTitle = (complaint) =>
  complaint.title || complaint.subject || "Complaint";

const getDescription = (complaint) =>
  complaint.description || complaint.message || "";

const getDate = (complaint) => {
  const value = complaint.createdAt || complaint.date;
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getCategoryIcon = (category) => {
  const value = category.toLowerCase();

  if (value.includes("plumb") || value.includes("water")) {
    return Droplets;
  }

  if (value.includes("maint") || value.includes("elect")) {
    return Wrench;
  }

  if (value.includes("noise")) return Volume2;
  if (value.includes("security")) return ShieldAlert;

  return MessageSquareWarning;
};

export default function TenantComplaints() {
  const { token } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingComplaintId, setEditingComplaintId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    category: "Maintenance",
    priority: "Medium",
    description: "",
  });

  const [successMessage, setSuccessMessage] = useState("");

  const fetchComplaints = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/complaints/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load complaints.");
      }

      const list = Array.isArray(data)
        ? data
        : data.complaints || data.data || [];

      setComplaints(list);
    } catch (err) {
      setError(err.message || "Unable to load complaints.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

const submitComplaint = async (event) => {
  event.preventDefault();

  if (!form.title.trim() || !form.description.trim()) {
    setError("Please enter a title and description.");
    return;
  }

  setSubmitting(true);
  setError("");
  setSuccessMessage("");

  const categoryMap = {
    Maintenance: "maintenance",
    Plumbing: "water",
    Electrical: "electricity",
    Cleaning: "cleaning",
    Noise: "noise",
    Security: "security",
    Other: "other",
  };

  const isEditing = Boolean(editingComplaintId);

  try {
    const response = await fetch(
      isEditing
        ? `${API_URL}/complaints/my/${editingComplaintId}`
        : `${API_URL}/complaints`,
      {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          category: categoryMap[form.category] || "other",
          priority: form.priority.toLowerCase(),
          description: form.description.trim(),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to save complaint.");
    }

    setSuccessMessage(
      data.message ||
        (isEditing ? "Complaint updated." : "Complaint submitted.")
    );

    setEditingComplaintId(null);
    setShowForm(false);

    setForm({
      title: "",
      category: "Maintenance",
      priority: "Medium",
      description: "",
    });

    await fetchComplaints();
  } catch (err) {
    setError(err.message || "Something went wrong.");
  } finally {
    setSubmitting(false);
  }
};

const handleEdit = (complaint) => {
  setEditingComplaintId(complaint._id);

  const categoryMap = {
    maintenance: "Maintenance",
    water: "Plumbing",
    electricity: "Electrical",
    cleaning: "Cleaning",
    noise: "Noise",
    security: "Security",
    other: "Other",
  };

  setForm({
    title: complaint.title || "",
    category: categoryMap[complaint.category] || "Other",
    priority:
      (complaint.priority || "medium").charAt(0).toUpperCase() +
      (complaint.priority || "medium").slice(1),
    description: complaint.description || "",
  });

  setError("");
  setSuccessMessage("");
  setShowForm(true);
};

const handleDelete = async (complaintId) => {
  if (!window.confirm("Permanently delete this complaint?")) {
    return;
  }

  setError("");
  setSuccessMessage("");

  try {
    const response = await fetch(
      `${API_URL}/complaints/my/${complaintId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete complaint.");
    }

    setComplaints((previous) =>
      previous.filter((item) => item._id !== complaintId)
    );

    setSuccessMessage(data.message || "Complaint deleted successfully.");
  } catch (err) {
    setError(err.message || "Failed to delete complaint.");
  }
};


  const pendingCount = complaints.filter((complaint) => {
    const status = getStatus(complaint);
    return !["resolved", "closed", "completed"].includes(status);
  }).length;

  const resolvedCount = complaints.filter((complaint) => {
    const status = getStatus(complaint);
    return ["resolved", "closed", "completed"].includes(status);
  }).length;

  return (
    <div className="tc-page">
      {successMessage && (
        <div className="tc-message tc-success-message">
          <CheckCircle2 size={17} />
          <span>{successMessage}</span>
          <button
            type="button"
            aria-label="Dismiss success message"
            onClick={() => setSuccessMessage("")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="tc-message tc-error-message">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button
            type="button"
            aria-label="Dismiss error message"
            onClick={() => setError("")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {!loading && complaints.length > 0 && (
        <div className="tc-stats">
          <div className="tc-stat-card">
            <div className="tc-stat-icon">
              <MessageSquareWarning size={20} />
            </div>
            <div>
              <strong>{complaints.length}</strong>
              <span>Total complaints</span>
            </div>
          </div>

          <div className="tc-stat-card">
            <div className="tc-stat-icon tc-pending-icon">
              <Clock3 size={20} />
            </div>
            <div>
              <strong>{pendingCount}</strong>
              <span>In progress</span>
            </div>
          </div>

          <div className="tc-stat-card">
            <div className="tc-stat-icon tc-resolved-icon">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <strong>{resolvedCount}</strong>
              <span>Resolved</span>
            </div>
          </div>
        </div>
      )}

      <section className="tc-panel">
        {loading ? (
          <div className="tc-loading">
            <span className="tc-spinner" />
            <p>Loading your complaints...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="tc-empty-state">
            <div className="tc-empty-illustration">
              <div className="tc-illustration-orbit tc-orbit-one" />
              <div className="tc-illustration-orbit tc-orbit-two" />

              <div className="tc-illustration-plant">
                <span />
                <span />
                <span />
                <div />
              </div>

              <div className="tc-illustration-person">
                <div className="tc-person-hair" />
                <div className="tc-person-face">
                  <i />
                  <i />
                  <span />
                </div>
                <div className="tc-person-body" />
                <div className="tc-person-laptop">
                  <div />
                </div>
              </div>

              <div className="tc-illustration-paper">
                <div className="tc-paper-alert">!</div>
                <span />
                <span />
              </div>

              <div className="tc-illustration-dot tc-dot-one" />
              <div className="tc-illustration-dot tc-dot-two" />
            </div>

            <h2>No complaints</h2>
            <p>You haven't submitted any complaints yet.</p>

            <button
              type="button"
              className="tc-primary-btn tc-empty-btn"
              onClick={() => {
                setError("");
                setShowForm(true);
              }}
            >
              <Plus size={18} />
              Submit Complaint
            </button>
          </div>
        ) : (
          <div className="tc-complaints-list">
            <div className="tc-list-heading">
              <div>
                <h2>Your Complaints</h2>
                
              </div>

              <div className="tc-heading-actions">
  <span className="tc-count-badge">
    {complaints.length}{" "}
    {complaints.length === 1 ? "complaint" : "complaints"}
  </span>

  <button
    type="button"
    className="tc-primary-btn"
    onClick={() => {
      setEditingComplaintId(null);
      setForm({
        title: "",
        category: "Maintenance",
        priority: "Medium",
        description: "",
      });
      setError("");
      setShowForm(true);
    }}
  >
    <Plus size={16} />
    Add Complaint
  </button>
</div>
            </div>

            {complaints.map((complaint, index) => {
              const CategoryIcon = getCategoryIcon(getCategory(complaint));
              const status = getStatus(complaint);

              return (
                <article
                  className="tc-complaint-card"
                  key={complaint._id || complaint.id || index}
                >
                  <div className="tc-complaint-icon">
                    <CategoryIcon size={20} />
                  </div>

                  <div className="tc-complaint-content">
                    <div className="tc-complaint-topline">
                      <span className="tc-category">
                        {getCategory(complaint)}
                      </span>

                      <div className="tc-complaint-actions">
  <button
    type="button"
    className="tc-edit-btn"
    onClick={() => handleEdit(complaint)}
  >
    Edit
  </button>

  <button
    type="button"
    className="tc-delete-btn"
    onClick={() => handleDelete(complaint._id)}
  >
    Delete
  </button>
</div>
                    </div>

                    <h3>{getTitle(complaint)}</h3>
                    <p>{getDescription(complaint)}</p>

                    <div className="tc-complaint-meta">
                      <span>
                        <Clock3 size={13} />
                        {getDate(complaint) || "Recently submitted"}
                      </span>

                      {complaint.priority && (
                        <span
                          className={`tc-priority tc-priority-${String(
                            complaint.priority
                          ).toLowerCase()}`}
                        >
                          {complaint.priority} priority
                        </span>
                      )}
                    </div>
                  </div>

                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="tc-footer-note">
        <AlertCircle size={16} />
        <p>
          Need help? Submit a complaint and your PG management can review it.
        </p>
      </div>

      {showForm && (
        <div
          className="tc-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setShowForm(false);
            }
          }}
        >
          <section
            className="tc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tc-form-title"
          >
            <div className="tc-modal-header">
              <div>
                <span className="tc-eyebrow">PG SUPPORT</span>
                <h2 id="tc-form-title">
  {editingComplaintId ? "Edit complaint" : "Submit a complaint"}
</h2>
                <p>Tell us what's wrong so it can be addressed.</p>
              </div>

              <button
                type="button"
                className="tc-modal-close"
                aria-label="Close complaint form"
                disabled={submitting}
                onClick={() => setShowForm(false)}
              >
                <X size={19} />
              </button>
            </div>

            <form className="tc-form" onSubmit={submitComplaint}>
              <label>
                Complaint title
                <input
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  placeholder="e.g. Bathroom tap leaking"
                  maxLength={120}
                  required
                />
              </label>

              <div className="tc-form-row">
                <label>
                  Category
                  <select
                    name="category"
                    value={form.category}
                    onChange={updateField}
                    required
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Priority
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={updateField}
                    required
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  placeholder="Explain the issue and where it is happening..."
                  rows={4}
                  maxLength={2000}
                  required
                />
              </label>

              <div className="tc-form-actions">
                <button
                  type="button"
                  className="tc-secondary-btn"
                  disabled={submitting}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tc-primary-btn"
                  disabled={submitting}
                >
                  <Send size={15} />
                  {submitting
  ? "Saving..."
  : editingComplaintId
    ? "Save changes"
    : "Submit complaint"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
