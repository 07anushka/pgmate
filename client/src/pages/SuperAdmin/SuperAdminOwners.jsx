
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Search,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import {
  apiRequest,
  PLANS,
  today,
  dateInputValue,
  formatDate,
  getStatus,
  statusLabel,
} from "./superAdminUtils";

const blankForm = () => ({
  name: "",
  mobile: "",
  email: "",
  password: "",
  planName: "monthly",
  startDate: today(),
});

export default function SuperAdminOwners() {
  const { token } = useAuth();

  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load owners from the backend
  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("Please log in again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/owners", token);
      setOwners(Array.isArray(data.owners) ? data.owners : []);
    } catch (e) {
      setError(e.message || "Unable to load owners.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Search owners by name, mobile, or email
  const filtered = useMemo(
    () =>
      owners.filter((owner) =>
        `${owner.name || ""} ${owner.mobile || ""} ${
          owner.email || ""
        }`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [owners, search]
  );

  // Open create-owner modal
  const openCreate = () => {
    setEditing(null);
    setForm(blankForm());
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  // Open edit-owner modal
  const openEdit = (owner) => {
    setEditing(owner);
    setError("");
    setSuccess("");

    setForm({
      name: owner.name || "",
      mobile: owner.mobile || "",
      email: owner.email || "",
      password: "",
      planName: owner.subscriptionPlan || "monthly",
      startDate: dateInputValue(owner.subscriptionStartDate),
    });

    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditing(null);
    setForm(blankForm());
    setError("");
  };

  // Create or update owner
  const save = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = form.name.trim();
    const mobile = form.mobile.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || !mobile || !email || !form.startDate) {
      setError(
        "Name, mobile, email and start date are required."
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!editing && !form.password) {
      setError("Enter a temporary password.");
      return;
    }

    if (form.password && form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        mobile,
        email,
        planName: form.planName,
        startDate: form.startDate,
      };

      if (form.password) {
        payload.password = form.password;
      }

      await apiRequest(
        editing ? `/owners/${editing._id}` : "/owners",
        token,
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(
            editing
              ? payload
              : { ...payload, password: form.password }
          ),
        }
      );

      const wasEditing = Boolean(editing);

      setShowModal(false);
      setEditing(null);
      setForm(blankForm());

      setSuccess(
        wasEditing
          ? "Owner updated successfully."
          : "Owner created successfully."
      );

      await load();
    } catch (e) {
      setError(e.message || "Unable to save owner.");
    } finally {
      setSaving(false);
    }
  };

  // Delete owner
  const remove = async (owner) => {
    const confirmed = window.confirm(
      `Permanently delete owner ${owner.name} (${
        owner.mobile || "no mobile"
      })? This may affect related records.`
    );

    if (!confirmed) return;

    setBusyId(owner._id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/owners/${owner._id}`, token, {
        method: "DELETE",
      });

      setSuccess("Owner deleted successfully.");
      await load();
    } catch (e) {
      setError(e.message || "Unable to delete owner.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      {!showModal && error && (
        <div className="sa-alert sa-alert-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div
          className="sa-alert sa-alert-success"
          role="status"
        >
          {success}

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss message"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <section className="sa-panel">
        {/* Toolbar */}
        <div className="sa-toolbar">
          <label className="sa-search">
            <Search size={17} />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search owner name, mobile or email"
              aria-label="Search owners"
            />
          </label>

          <div className="sa-toolbar-actions">
            <span className="sa-muted">
              {filtered.length} owner
              {filtered.length === 1 ? "" : "s"}
            </span>

            {/* Restored Create Owner button */}
            <button
              type="button"
              className="create-owner-submit sa-create-owner-button"
              onClick={openCreate}
            >
              <Plus size={17} />
              Create Owner
            </button>

            {/* Refresh owner list */}
            <button
              type="button"
              className="edit-owner-icon"
              onClick={load}
              disabled={loading}
              title="Refresh owners"
              aria-label="Refresh owners"
            >
              <RefreshCw
                size={16}
                className={loading ? "sa-spin" : ""}
              />
            </button>
          </div>
        </div>

        {/* Owner table */}
        {loading ? (
          <div className="sa-empty">Loading owners…</div>
        ) : filtered.length === 0 ? (
          <div className="sa-empty">
            {search
              ? "No owners match your search."
              : "No owners found. Click Create Owner to add one."}
          </div>
        ) : (
          <div className="owner-table-wrapper">
            <table className="owner-table subscription-owner-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Start date</th>
                  <th>End date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((owner) => {
                  const status = getStatus(owner);

                  return (
                    <tr
                      key={owner._id}
                      className={
                        status === "expired"
                          ? "owner-row-expired"
                          : ""
                      }
                    >
                      <td className="owner-name">
                        {owner.name || "—"}
                      </td>

                      <td>{owner.mobile || "—"}</td>

                      <td>{owner.email || "Not added"}</td>

                      <td>
                        {PLANS.find(
                          (plan) =>
                            plan.value === owner.subscriptionPlan
                        )?.label ||
                          owner.subscriptionPlan ||
                          "—"}
                      </td>

                      <td>
                        {formatDate(owner.subscriptionStartDate)}
                      </td>

                      <td>
                        {formatDate(owner.subscriptionEndDate)}
                      </td>

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
                            title="Edit owner"
                            aria-label={`Edit ${owner.name}`}
                            onClick={() => openEdit(owner)}
                            disabled={busyId === owner._id}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            className="delete-owner-icon"
                            title="Delete owner"
                            aria-label={`Delete ${owner.name}`}
                            onClick={() => remove(owner)}
                            disabled={busyId === owner._id}
                          >
                            <Trash2 size={15} />
                          </button>
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

      {/* Create/Edit owner modal */}
      {showModal && (
        <div
          className="owner-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            className="owner-modal subscription-owner-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="owner-modal-title"
          >
            <div className="owner-modal-header">
              <div>
                <h2 id="owner-modal-title">
                  {editing ? "Edit owner" : "Create owner"}
                </h2>

                <p>
                  {editing
                    ? "Update owner and subscription details."
                    : "Create an owner account with a subscription."}
                </p>
              </div>

              <button
                type="button"
                className="close-modal-button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form className="owner-form" onSubmit={save}>
              <div className="owner-form-group">
                <label htmlFor="owner-name">Full name</label>

                <input
                  id="owner-name"
                  name="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                  disabled={saving}
                />
              </div>

              <div className="owner-form-group">
                <label htmlFor="owner-mobile">
                  Mobile number
                </label>

                <input
                  id="owner-mobile"
                  name="mobile"
                  type="tel"
                  value={form.mobile}
                  onChange={(event) =>
                    setForm({ ...form, mobile: event.target.value })
                  }
                  required
                  disabled={saving}
                />
              </div>

              <div className="owner-form-group">
                <label htmlFor="owner-email">Email address</label>

                <input
                  id="owner-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  disabled={saving}
                />
              </div>

              <div className="owner-form-group">
                <label htmlFor="owner-password">
                  {editing
                    ? "New password (optional)"
                    : "Temporary password"}
                </label>

                <input
                  id="owner-password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      password: event.target.value,
                    })
                  }
                  minLength={8}
                  required={!editing}
                  autoComplete="new-password"
                  disabled={saving}
                  placeholder={
                    editing
                      ? "Leave blank to keep current password"
                      : "At least 8 characters"
                  }
                />
              </div>

              <div className="owner-form-group">
                <label htmlFor="owner-plan">
                  Subscription plan
                </label>

                <select
                  id="owner-plan"
                  value={form.planName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      planName: event.target.value,
                    })
                  }
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
                  Subscription start date
                </label>

                <input
                  id="owner-start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      startDate: event.target.value,
                    })
                  }
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
                className="create-owner-submit"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Create owner"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
