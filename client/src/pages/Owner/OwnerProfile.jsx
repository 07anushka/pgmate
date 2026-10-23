
import { useEffect, useState } from "react";
import {
  User,
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  X,
  Check,
  LoaderCircle,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import {
  getMyPGsApi,
  createPGApi,
  updatePGApi,
  deletePGApi,
  updateMyProfileApi,
  verifyCurrentPasswordApi,
  changePasswordApi,
} from "../../services/api";

import "./OwnerProfile.css";

const emptyForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  contactNumber: "",
  description: "",
};

function OwnerProfile() {
  const { user, updateUser } = useAuth();

  const [pgs, setPgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPG, setEditingPG] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profileDetails, setProfileDetails] = useState({
    name: user?.name || "",
    mobile: user?.mobile || "",
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    setProfileDetails({
      name: user?.name || "",
      mobile: user?.mobile || "",
    });
  }, [user?.name, user?.mobile]);

  const loadPGs = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getMyPGsApi();

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load PGs.");
      }

      const loadedPGs = result.pgs || [];
      setPgs(loadedPGs);

      const selectedPG = localStorage.getItem("pgmate_active_pg");
      const selectedExists = loadedPGs.some(
        (pg) => String(pg._id) === String(selectedPG)
      );

      if (loadedPGs.length > 0 && (!selectedPG || !selectedExists)) {
        localStorage.setItem("pgmate_active_pg", loadedPGs[0]._id);
      }

      if (loadedPGs.length === 0) {
        localStorage.removeItem("pgmate_active_pg");
      }
    } catch (err) {
      setError(err.message || "Failed to load PGs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPGs();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const openAddModal = () => {
    setEditingPG(null);
    setForm({ ...emptyForm });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (pg) => {
    setEditingPG(pg);
    setForm({
      name: pg.name || "",
      address: pg.address || "",
      city: pg.city || "",
      state: pg.state || "",
      contactNumber: pg.contactNumber || "",
      description: pg.description || "",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingPG(null);
    setForm({ ...emptyForm });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.name.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.contactNumber.trim()
    ) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      setSaving(true);

      const result = editingPG
        ? await updatePGApi(editingPG._id, form)
        : await createPGApi(form);

      if (!result?.success) {
        throw new Error(result?.message || "Failed to save PG.");
      }

      const savedPG = result.pg;

      if (savedPG?._id) {
        const activePG = localStorage.getItem("pgmate_active_pg");

        if (!activePG || (editingPG && activePG === String(editingPG._id))) {
          localStorage.setItem("pgmate_active_pg", savedPG._id);
        }
      }

      setSuccess(
        editingPG ? "PG updated successfully." : "PG added successfully."
      );

      await loadPGs();

      window.setTimeout(() => {
        setShowModal(false);
        setEditingPG(null);
        setForm({ ...emptyForm });
      }, 700);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // Only digits are accepted; typing beyond 10 digits is prevented.
  const handleProfileMobileChange = (event) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 10);

    setProfileDetails((previous) => ({
      ...previous,
      mobile: digits,
    }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    const cleanName = profileDetails.name.trim();
    const cleanMobile = profileDetails.mobile;

    if (!cleanName) {
      setProfileError("Please enter your name.");
      return;
    }

    if (!/^\d{10}$/.test(cleanMobile)) {
      setProfileError("Mobile number must contain exactly 10 digits.");
      return;
    }

    try {
      setSavingProfile(true);

      const result = await updateMyProfileApi({
        name: cleanName,
        mobile: cleanMobile,
      });

      if (!result?.success) {
        throw new Error(result?.message || "Unable to update profile.");
      }

      const updatedUser = {
        ...user,
        ...(result.user || {}),
        name: result.user?.name || cleanName,
        mobile: result.user?.mobile || cleanMobile,
      };

      updateUser(updatedUser);

      setProfileDetails({
        name: updatedUser.name,
        mobile: updatedUser.mobile,
      });

      setEditingProfile(false);
      setProfileSuccess("Profile updated successfully.");
    } catch (err) {
      setProfileError(err.message || "Unable to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const cancelProfileEdit = () => {
    setEditingProfile(false);
    setProfileError("");
    setProfileSuccess("");
    setProfileDetails({
      name: user?.name || "",
      mobile: user?.mobile || "",
    });
  };

  const resetPasswordFlow = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordVerified(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handleVerifyCurrentPassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Enter your current password first.");
      return;
    }

    try {
      setVerifyingPassword(true);

      const result = await verifyCurrentPasswordApi(currentPassword);

      if (!result?.success) {
        throw new Error(
          result?.message || "Current password could not be verified."
        );
      }

      setPasswordVerified(true);
      setPasswordSuccess(
        "Current password verified. You can now choose a new password."
      );
    } catch (err) {
      setPasswordVerified(false);
      setPasswordError(
        err.message || "Current password verification failed."
      );
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordVerified) {
      setPasswordError("Verify your current password first.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError(
        "Choose a password different from your current password."
      );
      return;
    }

    try {
      setChangingPassword(true);

      const result = await changePasswordApi({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!result?.success) {
        throw new Error(result?.message || "Unable to change password.");
      }

      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordVerified(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      setPasswordError(err.message || "Unable to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const selectPG = (pgId) => {
    localStorage.setItem("pgmate_active_pg", pgId);

    // Notify the rest of the app that the active PG changed.
    window.dispatchEvent(
      new CustomEvent("activePGChanged", {
        detail: { pgId },
      })
    );

    // Refresh the page so all PG-specific data reloads.
    window.location.reload();
  };

  const handleDelete = async (pg) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${pg.name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const result = await deletePGApi(pg._id);

      if (!result?.success) {
        throw new Error(result?.message || "Failed to delete PG.");
      }

      if (
        localStorage.getItem("pgmate_active_pg") === String(pg._id)
      ) {
        localStorage.removeItem("pgmate_active_pg");
      }

      await loadPGs();
      setSuccess("PG deleted successfully.");
      window.setTimeout(() => setSuccess(""), 1800);
    } catch (err) {
      setError(err.message || "Failed to delete PG.");
    }
  };

  const selectedPG = localStorage.getItem("pgmate_active_pg");

  return (
    <div className="owner-profile-page">
      <div className="profile-header">
        <div>
          <p className="profile-eyebrow"><User size={20} /> Account & Property</p>
          <h1>Owner Information</h1>
          <p>Your PGmate account details.</p>
        </div>

        <button className="add-pg-btn" onClick={openAddModal} type="button">
          <Plus size={18} />
          Add PG
        </button>
      </div>

      {error && (
        <div className="profile-alert error" role="alert">{error}</div>
      )}

      {success && (
        <div className="profile-alert success" role="status">
          <Check size={17} />
          {success}
        </div>
      )}

      <section className="profile-section">
        <div className="owner-info-card owner-profile-edit-card">
          <div className="profile-owner-avatar">
            {(profileDetails.name || "O").charAt(0).toUpperCase()}
          </div>

          {!editingProfile ? (
            <>
              <div className="owner-info">
                <h3>{profileDetails.name || "Owner"}</h3>
                <p>{profileDetails.mobile || "No mobile number"}</p>
                <span>Owner Account</span>
              </div>

              <button
                type="button"
                className="profile-edit-account-btn"
                onClick={() => {
                  setProfileDetails({
                    name: user?.name || "",
                    mobile: user?.mobile || "",
                  });
                  setProfileError("");
                  setProfileSuccess("");
                  setEditingProfile(true);
                }}
              >
                <Pencil size={15} />
                Edit Profile
              </button>
            </>
          ) : (
            <form className="account-edit-form" onSubmit={handleProfileSave}>
              <div className="form-group">
                <label htmlFor="ownerProfileName">Full Name *</label>
                <input
                  id="ownerProfileName"
                  name="name"
                  type="text"
                  value={profileDetails.name}
                  onChange={(event) =>
                    setProfileDetails((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Enter your name"
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="ownerProfileMobile">Mobile Number *</label>
                <input
                  id="ownerProfileMobile"
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  value={profileDetails.mobile}
                  onChange={handleProfileMobileChange}
                  placeholder="Enter 10-digit mobile number"
                  required
                />
                <small className="profile-field-hint">
                  Enter exactly 10 digits. Letters and extra digits are not accepted.
                </small>
              </div>

              {profileError && (
                <div className="form-error" role="alert">{profileError}</div>
              )}

              <div className="account-edit-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={cancelProfileEdit}
                  disabled={savingProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <><LoaderCircle size={16} className="spin" /> Saving...</>
                  ) : (
                    <><Check size={16} /> Save Profile</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {profileSuccess && (
          <div className="profile-alert success account-feedback">
            <Check size={16} /> {profileSuccess}
          </div>
        )}

        {!editingProfile && profileError && (
          <div className="profile-alert error account-feedback">
            {profileError}
          </div>
        )}
      </section>

      <section className="profile-section password-section">

        <div className="password-card">
          <div className="password-card-intro">
            <div className="password-shield-icon">
              <ShieldCheck size={23} />
            </div>
            <div>
              <h3>Change your password</h3>
              <p>For your security, we’ll first verify your current password.</p>
            </div>
          </div>

          <form
            className="password-form"
            onSubmit={
              passwordVerified
                ? handleChangePassword
                : handleVerifyCurrentPassword
            }
          >
            <div className="form-group password-input-group">
              <label htmlFor="currentPassword">Current Password *</label>
              <div className="password-input-wrap">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setPasswordError("");
                    setPasswordSuccess("");

                    if (passwordVerified) {
                      setPasswordVerified(false);
                      setNewPassword("");
                      setConfirmPassword("");
                    }
                  }}
                  placeholder="Enter your current password"
                  required
                />
                <button
                  type="button"
                  className="password-visibility-btn"
                  aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                  onClick={() => setShowCurrentPassword((visible) => !visible)}
                >
                  {showCurrentPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {!passwordVerified ? (
              <button
                type="submit"
                className="verify-password-btn"
                disabled={verifyingPassword || !currentPassword}
              >
                {verifyingPassword ? (
                  <><LoaderCircle size={16} className="spin" /> Verifying...</>
                ) : (
                  <><ShieldCheck size={16} /> Verify Current Password</>
                )}
              </button>
            ) : (
              <div className="password-verified-banner">
                <Check size={16} />
                Current password verified
                <button
                  type="button"
                  className="password-reverify-btn"
                  onClick={() => {
                    setPasswordVerified(false);
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError("");
                    setPasswordSuccess("");
                  }}
                >
                  Verify again
                </button>
              </div>
            )}

            {passwordVerified && (
              <div className="password-new-fields">
                <div className="form-group password-input-group">
                  <label htmlFor="newPassword">New Password *</label>
                  <div className="password-input-wrap">
                    <input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      required
                    />
                    <button
                      type="button"
                      className="password-visibility-btn"
                      aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                      onClick={() => setShowNewPassword((visible) => !visible)}
                    >
                      {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <small className="profile-field-hint">Use at least 8 characters.</small>
                </div>

                <div className="form-group password-input-group">
                  <label htmlFor="confirmPassword">Confirm New Password *</label>
                  <div className="password-input-wrap">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter your new password"
                      required
                    />
                    <button
                      type="button"
                      className="password-visibility-btn"
                      aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                      onClick={() => setShowConfirmPassword((visible) => !visible)}
                    >
                      {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="password-change-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={resetPasswordFlow}
                    disabled={changingPassword}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="save-btn"
                    disabled={changingPassword || !newPassword || !confirmPassword}
                  >
                    {changingPassword ? (
                      <><LoaderCircle size={16} className="spin" /> Changing...</>
                    ) : (
                      <><ShieldCheck size={16} /> Change Password</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {passwordError && (
              <div className="form-error password-feedback" role="alert">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="password-success-message" role="status">
                <Check size={16} /> {passwordSuccess}
              </div>
            )}
          </form>
        </div>
      </section>

      <section className="profile-section">
        <div className="section-heading">
          <div className="section-icon"><Building2 size={20} /></div>
          <div>
            <h2>My PGs</h2>
            <p>Add and manage your properties</p>
          </div>
        </div>

        {loading ? (
          <div className="profile-loading-grid">
            {[1, 2].map((item) => (
              <div className="profile-loading-card" key={item}>
                <div className="loading-line large" />
                <div className="loading-line" />
                <div className="loading-line short" />
              </div>
            ))}
          </div>
        ) : pgs.length === 0 ? (
          <div className="empty-pg">
            <div className="empty-pg-icon"><Building2 size={30} /></div>
            <h3>No PG added yet</h3>
            <p>Add your first PG to start managing rooms, tenants and payments.</p>
            <button type="button" onClick={openAddModal}>
              <Plus size={17} /> Add Your First PG
            </button>
          </div>
        ) : (
          <div className="pg-grid">
            {pgs.map((pg) => {
              const isSelected = String(selectedPG) === String(pg._id);

              return (
                <div
                  className={`pg-card ${isSelected ? "selected" : ""}`}
                  key={pg._id}
                >
                  <div className="pg-card-top">
                    <div className="pg-card-icon"><Building2 size={22} /></div>
                    {isSelected && (
                      <span className="active-badge">
                        <Check size={13} /> Active
                      </span>
                    )}
                  </div>

                  <h3>{pg.name}</h3>

                  <div className="pg-detail">
                    <MapPin size={16} />
                    <span>{pg.address}, {pg.city}, {pg.state}</span>
                  </div>

                  <div className="pg-detail">
                    <Phone size={16} />
                    <span>{pg.contactNumber}</span>
                  </div>

                  {pg.description && <p className="pg-description">{pg.description}</p>}

                  <div className="pg-actions">
                    {!isSelected && (
                      <button
                        type="button"
                        className="select-pg"
                        onClick={() => selectPG(pg._id)}
                      >
                        <Check size={16} /> Select
                      </button>
                    )}
                    <button
                      type="button"
                      className="edit-pg"
                      onClick={() => openEditModal(pg)}
                    >
                      <Pencil size={16} /> Edit
                    </button>
                    <button
                      type="button"
                      className="delete-pg"
                      onClick={() => handleDelete(pg)}
                      aria-label={`Delete ${pg.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showModal && (
        <div
          className="pg-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="pg-modal">
            <div className="modal-header">
              <div>
                <h2>{editingPG ? "Edit PG" : "Add New PG"}</h2>
                <p>
                  {editingPG ? "Update your PG details." : "Enter your property details."}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form className="pg-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="pgName">PG Name *</label>
                <input
                  id="pgName"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Green View PG"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="pgAddress">Address *</label>
                <textarea
                  id="pgAddress"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Full property address"
                  rows={3}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="pgCity">City *</label>
                  <input
                    id="pgCity"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Bengaluru"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pgState">State *</label>
                  <input
                    id="pgState"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="Karnataka"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="pgContactNumber">Contact Number *</label>
                <input
                  id="pgContactNumber"
                  name="contactNumber"
                  value={form.contactNumber}
                  onChange={handleChange}
                  placeholder="PG contact number"
                  inputMode="numeric"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="pgDescription">Description</label>
                <textarea
                  id="pgDescription"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Short description about your PG"
                  rows={3}
                />
              </div>

              {error && <div className="form-error" role="alert">{error}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? (
                    <><LoaderCircle size={17} className="spin" /> Saving...</>
                  ) : (
                    <><Check size={17} /> {editingPG ? "Update PG" : "Add PG"}</>
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

export default OwnerProfile;
