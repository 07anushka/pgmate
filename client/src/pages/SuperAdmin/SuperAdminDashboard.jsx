
import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  LayoutDashboard,
  Users,
  LogOut,
  Plus,
  X,
  ShieldCheck,
  Clock,
  AlertTriangle,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./SuperAdminDashboard.css";

const API_URL = "http://localhost:5000/api";

const PLANS = [
  { value: "monthly", label: "Monthly (1 month)" },
  { value: "quarterly", label: "Quarterly (3 months)" },
  { value: "half-yearly", label: "Half-yearly (6 months)" },
  { value: "yearly", label: "Yearly (12 months)" },
];

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const dateInputValue = (value) => {
  if (!value) return today();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return today();

  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const getStatus = (owner) => {
  if (owner.subscriptionStatus) return owner.subscriptionStatus;

  if (!owner.subscriptionStartDate || !owner.subscriptionEndDate) {
    return "expired";
  }

  const start = new Date(owner.subscriptionStartDate);
  const end = new Date(owner.subscriptionEndDate);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "expired";
  }

  if (start > now) return "pending";
  if (end <= now) return "expired";

  const days = Math.ceil((end - now) / 86400000);
  return days <= 5 ? "expiring-soon" : "active";
};

const statusLabel = (status) =>
  ({
    active: "Active",
    "expiring-soon": "Expiring Soon",
    expired: "Expired",
    pending: "Pending",
  })[status] || status;

const emptyForm = () => ({
  name: "",
  mobile: "",
  password: "",
  planName: "monthly",
  startDate: today(),
});

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [owners, setOwners] = useState([]);
  const [summary, setSummary] = useState({
    totalOwners: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    pending: 0,
  });

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [reactivatingId, setReactivatingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState(emptyForm);

  const fetchOwners = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("Please log in to access the Super Admin dashboard.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/owners`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load owners.");
      }

      const list = data.owners || [];
      setOwners(list);

      setSummary(
        data.summary || {
          totalOwners: list.length,
          active: list.filter((owner) => getStatus(owner) === "active").length,
          expiringSoon: list.filter(
            (owner) => getStatus(owner) === "expiring-soon"
          ).length,
          expired: list.filter((owner) => getStatus(owner) === "expired").length,
          pending: list.filter((owner) => getStatus(owner) === "pending").length,
        }
      );
    } catch (err) {
      setError(err.message || "Failed to load owners.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingOwner(null);
    setFormData(emptyForm());
    setError("");
  };

  const openCreateModal = () => {
    setError("");
    setSuccess("");
    setEditingOwner(null);
    setFormData(emptyForm());
    setShowModal(true);
  };

  const openEditModal = (owner) => {
    setError("");
    setSuccess("");
    setEditingOwner(owner);

    setFormData({
      name: owner.name || "",
      mobile: owner.mobile || "",
      password: "",
      planName: owner.subscriptionPlan || "monthly",
      startDate: dateInputValue(owner.subscriptionStartDate),
    });

    setShowModal(true);
  };

  const handleSaveOwner = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !formData.name.trim() ||
      !formData.mobile.trim() ||
      !formData.startDate
    ) {
      setError("Please fill in the name, mobile number and start date.");
      return;
    }

    if (!editingOwner && !formData.password) {
      setError("Please enter a temporary password.");
      return;
    }

    if (formData.password && formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    try {
      setSaving(true);

      const isEditing = Boolean(editingOwner);
      const url = isEditing
        ? `${API_URL}/owners/${editingOwner._id}`
        : `${API_URL}/owners`;

      const payload = {
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        planName: formData.planName,
        startDate: formData.startDate,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          isEditing
            ? payload
            : { ...payload, password: formData.password }
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (isEditing ? "Failed to update owner." : "Failed to create owner.")
        );
      }

      setShowModal(false);
      setEditingOwner(null);
      setFormData(emptyForm());

      setSuccess(
        isEditing
          ? "Owner updated successfully."
          : "Owner created successfully."
      );

      await fetchOwners();
    } catch (err) {
      setError(err.message || "Unable to save owner.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOwner = async (owner) => {
    const confirmed = window.confirm(
      `Delete the owner account for ${owner.name} (${owner.mobile})?\n\nDeletion may affect related PGs, tenants, rooms and payment records. Continue only if you intend to permanently delete this account.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      setDeletingId(owner._id);

      const response = await fetch(`${API_URL}/owners/${owner._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete owner.");
      }

      setSuccess(`Owner ${owner.name} deleted successfully.`);
      await fetchOwners();
    } catch (err) {
      setError(err.message || "Failed to delete owner.");
    } finally {
      setDeletingId("");
    }
  };

  const handleReactivate = async (owner) => {
    const selectedPlan = window.prompt(
      `Select a subscription plan for ${owner.name}:\nmonthly, quarterly, half-yearly, yearly`,
      owner.subscriptionPlan || "monthly"
    );

    if (selectedPlan === null) return;

    const planName = selectedPlan.trim().toLowerCase();

    if (!PLANS.some((plan) => plan.value === planName)) {
      setError("Invalid plan selected.");
      return;
    }

    if (!window.confirm(`Reactivate the ${planName} plan for ${owner.name}?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      setReactivatingId(owner._id);

      const response = await fetch(
        `${API_URL}/owners/${owner._id}/reactivate`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planName }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reactivate subscription.");
      }

      setSuccess(`Subscription reactivated for ${owner.name}.`);
      await fetchOwners();
    } catch (err) {
      setError(err.message || "Failed to reactivate subscription.");
    } finally {
      setReactivatingId("");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const expiringOwners = owners.filter(
    (owner) => getStatus(owner) === "expiring-soon"
  );

  return (
    <div className="super-admin-page">
      <aside className="super-admin-sidebar">
        <div className="super-admin-brand">
          <div className="super-admin-brand-icon">
            <Building2 size={22} />
          </div>

          <div className="super-admin-brand-text">
            <strong>PGmate</strong>
            <span>Super Admin</span>
          </div>
        </div>

        <nav className="super-admin-nav">
          <button className="active" type="button">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("owners-section")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <Users size={18} />
            <span>Owners</span>
          </button>
        </nav>

        <div className="super-admin-sidebar-bottom">
          <button
            className="super-admin-logout"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="super-admin-main">
        <header className="super-admin-topbar">
          <div className="super-admin-topbar-title">
            <h1>Dashboard</h1>
            <p>Manage owners and subscriptions</p>
          </div>

          <div className="super-admin-user">
            <div className="super-admin-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>

            <div className="super-admin-user-info">
              <strong>{user?.name || "Administrator"}</strong>
              <span>Super Administrator</span>
            </div>
          </div>
        </header>

        <section className="super-admin-content">
          {error && !showModal && (
            <div className="owner-form-error dashboard-message" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="dashboard-success" role="status">
              <span>{success}</span>
              <button
                type="button"
                onClick={() => setSuccess("")}
                aria-label="Dismiss message"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <div className="super-admin-stats">
            <div className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                <Users size={22} />
              </div>
              <div>
                <h3>{summary.totalOwners}</h3>
                <p>Total Owners</p>
              </div>
            </div>

            <div className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3>{summary.active}</h3>
                <p>Active Subscriptions</p>
              </div>
            </div>

            <div className="super-admin-stat-card">
              <div className="super-admin-stat-icon warning-stat-icon">
                <Clock size={22} />
              </div>
              <div>
                <h3>{summary.expiringSoon}</h3>
                <p>Expiring Within 5 Days</p>
              </div>
            </div>

            <div className="super-admin-stat-card">
              <div className="super-admin-stat-icon expired-stat-icon">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3>{summary.expired}</h3>
                <p>Expired Subscriptions</p>
              </div>
            </div>
          </div>

          {expiringOwners.length > 0 && (
            <section className="subscription-alert">
              <div className="subscription-alert-heading">
                <AlertTriangle size={20} />
                <div>
                  <strong>Subscriptions expiring soon</strong>
                  <p>
                    {expiringOwners.length} owner
                    {expiringOwners.length === 1 ? "" : "s"} have subscriptions
                    ending within five days.
                  </p>
                </div>
              </div>

              <ul>
                {expiringOwners.map((owner) => (
                  <li key={owner._id}>
                    <span>{owner.name}</span>
                    <span>Ends {formatDate(owner.subscriptionEndDate)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="super-admin-section" id="owners-section">
            <div className="super-admin-section-header">
              <div>
                <h2>Owners &amp; Subscriptions</h2>
                <p>Manage owner accounts and subscription access</p>
              </div>

              <div className="owner-header-actions">
                <button
                  type="button"
                  className="refresh-owners-button"
                  onClick={fetchOwners}
                  disabled={loading}
                  aria-label="Refresh owners"
                  title="Refresh owners"
                >
                  <RefreshCw size={16} />
                </button>

                <button
                  type="button"
                  className="add-owner-button"
                  onClick={openCreateModal}
                >
                  <Plus size={17} />
                  Add Owner
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">Loading owners...</div>
            ) : owners.length === 0 ? (
              <div className="empty-owners">
                <Users size={30} />
                <div>No owners created yet.</div>
              </div>
            ) : (
              <div className="owner-table-wrapper">
                <table className="owner-table subscription-owner-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Mobile</th>
                      <th>Plan</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {owners.map((owner) => {
                      const status = getStatus(owner);
                      const busy =
                        deletingId === owner._id ||
                        reactivatingId === owner._id;

                      return (
                        <tr
                          key={owner._id}
                          className={
                            status === "expired" ? "owner-row-expired" : ""
                          }
                        >
                          <td className="owner-name">{owner.name}</td>
                          <td className="owner-mobile">{owner.mobile}</td>

                          <td>
                            {PLANS.find(
                              (plan) => plan.value === owner.subscriptionPlan
                            )?.label || owner.subscriptionPlan || "—"}
                          </td>

                          <td>{formatDate(owner.subscriptionStartDate)}</td>
                          <td>{formatDate(owner.subscriptionEndDate)}</td>

                          <td>
                            <span
                              className={`subscription-status status-${status}`}
                            >
                              {statusLabel(status)}
                            </span>
                          </td>

                          <td>
                            <div className="owner-row-actions">
                              <button
                                type="button"
                                className="edit-owner-icon"
                                onClick={() => openEditModal(owner)}
                                disabled={busy || saving}
                                title={`Edit ${owner.name}`}
                                aria-label={`Edit ${owner.name}`}
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                className="delete-owner-icon"
                                onClick={() => handleDeleteOwner(owner)}
                                disabled={busy || saving}
                                title={`Delete ${owner.name}`}
                                aria-label={`Delete ${owner.name}`}
                              >
                                <Trash2 size={15} />
                              </button>

                              {status === "expired" && (
                                <button
                                  type="button"
                                  className="reactivate-button"
                                  disabled={busy || saving}
                                  onClick={() => handleReactivate(owner)}
                                  title={`Reactivate ${owner.name}`}
                                >
                                  <RefreshCw size={14} />
                                  {reactivatingId === owner._id
                                    ? "Activating..."
                                    : "Reactivate"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </main>

      {showModal && (
        <div
          className="owner-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              closeModal();
            }
          }}
        >
          <div className="owner-modal subscription-owner-modal">
            <div className="owner-modal-header">
              <div>
                <h2>{editingOwner ? "Edit Owner" : "Create Owner"}</h2>
                <p>
                  {editingOwner
                    ? "Update owner details and subscription."
                    : "Add an owner account and assign a subscription."}
                </p>
              </div>

              <button
                type="button"
                className="close-modal-button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form className="owner-form" onSubmit={handleSaveOwner}>
              <div className="owner-form-group">
                <label htmlFor="owner-name">Full Name</label>
                <input
                  id="owner-name"
                  name="name"
                  type="text"
                  placeholder="Enter owner's name"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                  disabled={saving}
                />
              </div>

              <div className="owner-form-group">
                <label htmlFor="owner-mobile">Mobile Number</label>
                <input
                  id="owner-mobile"
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter mobile number"
                  value={formData.mobile}
                  onChange={handleChange}
                  autoComplete="tel"
                  required
                  disabled={saving}
                />
              </div>

              <div className="owner-form-group">
                <label htmlFor="owner-password">
                  {editingOwner
                    ? "New Password (optional)"
                    : "Temporary Password"}
                </label>
                <input
                  id="owner-password"
                  name="password"
                  type="password"
                  placeholder={
                    editingOwner
                      ? "Leave blank to keep current password"
                      : "At least 8 characters"
                  }
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={8}
                  required={!editingOwner}
                  disabled={saving}
                />
              </div>

              <div className="owner-form-group">
                <label htmlFor="owner-plan">Subscription Plan</label>
                <select
                  id="owner-plan"
                  name="planName"
                  value={formData.planName}
                  onChange={handleChange}
                  required
                  disabled={saving}
                >
                  {PLANS.map((plan) => (
                    <option key={plan.value} value={plan.value}>
                      {plan.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="owner-form-group">
                <label htmlFor="owner-start-date">
                  Subscription Start Date
                </label>
                <input
                  id="owner-start-date"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>

              {error && (
                <div className="owner-form-error" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="create-owner-submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingOwner
                    ? "Save Changes"
                    : "Create Owner"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminDashboard;
