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
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import {
  getMyPGsApi,
  createPGApi,
  updatePGApi,
  deletePGApi,
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
  const { user } = useAuth();

  const [pgs, setPgs] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] =
    useState(false);

  const [editingPG, setEditingPG] =
    useState(null);

  const [form, setForm] =
    useState(emptyForm);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  // =====================================================
  // LOAD PGs
  // =====================================================

  const loadPGs = async () => {
    try {
      setLoading(true);
      setError("");

      const result =
        await getMyPGsApi();

      if (!result.success) {
        throw new Error(
          result.message ||
            "Failed to load PGs"
        );
      }

      const loadedPGs =
        result.pgs || [];

      setPgs(loadedPGs);

      // Set first PG automatically
      const selectedPG =
        localStorage.getItem(
          "pgmate_active_pg"
        );

      const selectedExists =
        loadedPGs.some(
          (pg) =>
            String(pg._id) ===
            String(selectedPG)
        );

      if (
        loadedPGs.length > 0 &&
        (!selectedPG || !selectedExists)
      ) {
        localStorage.setItem(
          "pgmate_active_pg",
          loadedPGs[0]._id
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Failed to load PGs"
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadPGs();
  }, []);


  // =====================================================
  // FORM
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  const openAddModal = () => {
    setEditingPG(null);
    setForm(emptyForm);
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
      contactNumber:
        pg.contactNumber || "",
      description:
        pg.description || "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };


  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingPG(null);
    setForm(emptyForm);
  };


  // =====================================================
  // SAVE PG
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.name.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.contactNumber.trim()
    ) {
      setError(
        "Please fill all required fields."
      );

      return;
    }

    try {
      setSaving(true);

      let result;

      if (editingPG) {
        result = await updatePGApi(
          editingPG._id,
          form
        );
      } else {
        result = await createPGApi(
          form
        );
      }

      if (!result.success) {
        throw new Error(
          result.message ||
            "Failed to save PG"
        );
      }

      const savedPG = result.pg;

      // If creating first PG, select it
      if (!editingPG) {
        const currentSelected =
          localStorage.getItem(
            "pgmate_active_pg"
          );

        if (!currentSelected) {
          localStorage.setItem(
            "pgmate_active_pg",
            savedPG._id
          );
        }
      }

      // If editing currently selected PG
      if (
        editingPG &&
        localStorage.getItem(
          "pgmate_active_pg"
        ) === String(editingPG._id)
      ) {
        localStorage.setItem(
          "pgmate_active_pg",
          savedPG._id
        );
      }

      setSuccess(
        editingPG
          ? "PG updated successfully."
          : "PG added successfully."
      );

      await loadPGs();

      setTimeout(() => {
        setShowModal(false);
        setEditingPG(null);
        setForm(emptyForm);
        setSuccess("");
      }, 700);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };


  // =====================================================
  // SELECT PG
  // =====================================================

  const selectPG = (pgId) => {
    localStorage.setItem(
      "pgmate_active_pg",
      pgId
    );

    setSuccess(
      "PG switched successfully."
    );

    setTimeout(() => {
      setSuccess("");
    }, 1800);
  };


  // =====================================================
  // DELETE PG
  // =====================================================

  const handleDelete = async (pg) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${pg.name}"?`
      );

    if (!confirmed) return;

    try {
      setError("");

      const result =
        await deletePGApi(
          pg._id
        );

      if (!result.success) {
        throw new Error(
          result.message ||
            "Failed to delete PG"
        );
      }

      const selectedPG =
        localStorage.getItem(
          "pgmate_active_pg"
        );

      if (
        String(selectedPG) ===
        String(pg._id)
      ) {
        localStorage.removeItem(
          "pgmate_active_pg"
        );
      }

      await loadPGs();

      setSuccess(
        "PG deleted successfully."
      );

      setTimeout(() => {
        setSuccess("");
      }, 1800);
    } catch (err) {
      setError(
        err.message ||
          "Failed to delete PG"
      );
    }
  };


  const selectedPG =
    localStorage.getItem(
      "pgmate_active_pg"  
    );


  return (
    <div className="owner-profile">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="profile-header">

        <div>
          <p className="profile-eyebrow">
            Account & Property
          </p>

          <h1>Profile</h1>

          <p>
            Manage your owner account
            and PG properties.
          </p>
        </div>

        <button
          className="add-pg-btn"
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add PG
        </button>

      </div>


      {/* =================================================
          ALERTS
      ================================================= */}

      {error && (
        <div className="profile-alert error">
          {error}
        </div>
      )}

      {success && (
        <div className="profile-alert success">
          <Check size={17} />
          {success}
        </div>
      )}


      {/* =================================================
          OWNER INFO
      ================================================= */}

      <section className="profile-section">

        <div className="section-heading">
          <div className="section-icon">
            <User size={20} />
          </div>

          <div>
            <h2>Owner Information</h2>
            <p>
              Your PGmate account details
            </p>
          </div>
        </div>


        <div className="owner-info-card">

          <div className="owner-avatar">
            {user?.name
              ?.charAt(0)
              ?.toUpperCase() || "O"}
          </div>

          <div className="owner-info">

            <h3>
              {user?.name ||
                "Owner"}
            </h3>

            <p>
              {user?.mobile ||
                "No mobile number"}
            </p>

            <span>
              Owner Account
            </span>

          </div>

        </div>

      </section>


      {/* =================================================
          PG SECTION
      ================================================= */}

      <section className="profile-section">

        <div className="section-heading">

          <div className="section-icon">
            <Building2 size={20} />
          </div>

          <div>
            <h2>My PGs</h2>

            <p>
              Add and manage your
              properties
            </p>
          </div>

        </div>


        {loading ? (

          <div className="profile-loading-grid">

            <div className="profile-loading-card">
              <div className="loading-line large" />
              <div className="loading-line" />
              <div className="loading-line short" />
            </div>

            <div className="profile-loading-card">
              <div className="loading-line large" />
              <div className="loading-line" />
              <div className="loading-line short" />
            </div>

          </div>

        ) : pgs.length === 0 ? (

          <div className="empty-pg">

            <div className="empty-pg-icon">
              <Building2 size={30} />
            </div>

            <h3>
              No PG added yet
            </h3>

            <p>
              Add your first PG to
              start managing rooms,
              tenants and payments.
            </p>

            <button
              onClick={openAddModal}
            >
              <Plus size={17} />
              Add Your First PG
            </button>

          </div>

        ) : (

          <div className="pg-grid">

            {pgs.map((pg) => {

              const isSelected =
                String(
                  selectedPG
                ) ===
                String(pg._id);

              return (
                <div
                  className={`pg-card ${
                    isSelected
                      ? "selected"
                      : ""
                  }`}
                  key={pg._id}
                >

                  <div className="pg-card-top">

                    <div className="pg-card-icon">
                      <Building2
                        size={22}
                      />
                    </div>

                    {isSelected && (
                      <span className="active-badge">
                        <Check
                          size={13}
                        />
                        Active
                      </span>
                    )}

                  </div>


                  <h3>
                    {pg.name}
                  </h3>


                  <div className="pg-detail">
                    <MapPin size={16} />

                    <span>
                      {pg.address},{" "}
                      {pg.city},{" "}
                      {pg.state}
                    </span>
                  </div>


                  <div className="pg-detail">
                    <Phone size={16} />

                    <span>
                      {pg.contactNumber}
                    </span>
                  </div>


                  {pg.description && (
                    <p className="pg-description">
                      {pg.description}
                    </p>
                  )}


                  <div className="pg-actions">

                    {!isSelected && (
                      <button
                        className="select-pg"
                        onClick={() =>
                          selectPG(
                            pg._id
                          )
                        }
                      >
                        <Check size={16} />
                        Select
                      </button>
                    )}

                    <button
                      className="edit-pg"
                      onClick={() =>
                        openEditModal(pg)
                      }
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                    <button
                      className="delete-pg"
                      onClick={() =>
                        handleDelete(pg)
                      }
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


      {/* =================================================
          MODAL
      ================================================= */}

      {showModal && (
        <div
          className="pg-modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="pg-modal">

            <div className="modal-header">

              <div>
                <h2>
                  {editingPG
                    ? "Edit PG"
                    : "Add New PG"}
                </h2>

                <p>
                  {editingPG
                    ? "Update your PG details."
                    : "Enter your property details."}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                <X size={20} />
              </button>

            </div>


            <form
              className="pg-form"
              onSubmit={handleSubmit}
            >

              <div className="form-group">
                <label>
                  PG Name *
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Green View PG"
                  required
                />
              </div>


              <div className="form-group">
                <label>
                  Address *
                </label>

                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Full property address"
                  rows="3"
                  required
                />
              </div>


              <div className="form-row">

                <div className="form-group">
                  <label>
                    City *
                  </label>

                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Bengaluru"
                    required
                  />
                </div>


                <div className="form-group">
                  <label>
                    State *
                  </label>

                  <input
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="Karnataka"
                    required
                  />
                </div>

              </div>


              <div className="form-group">
                <label>
                  Contact Number *
                </label>

                <input
                  name="contactNumber"
                  value={
                    form.contactNumber
                  }
                  onChange={handleChange}
                  placeholder="PG contact number"
                  inputMode="numeric"
                  required
                />
              </div>


              <div className="form-group">
                <label>
                  Description
                </label>

                <textarea
                  name="description"
                  value={
                    form.description
                  }
                  onChange={handleChange}
                  placeholder="Short description about your PG"
                  rows="3"
                />
              </div>


              {error && (
                <div className="form-error">
                  {error}
                </div>
              )}


              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-btn"
                  disabled={saving}
                >

                  {saving ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="spin"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={17} />

                      {editingPG
                        ? "Update PG"
                        : "Add PG"}
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

export default OwnerProfile;