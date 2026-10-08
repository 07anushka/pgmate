import { useEffect, useState } from "react";

import {
  Building2,
  LayoutDashboard,
  Users,
  LogOut,
  Plus,
  X,
  ShieldCheck,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

import "./SuperAdminDashboard.css";


const API_URL = "http://localhost:5000/api";


function SuperAdminDashboard() {

  const navigate = useNavigate();

  const {
    user,
    token,
    logout,
  } = useAuth();


  const [owners, setOwners] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    password: "",
  });


  // ==========================================
  // FETCH OWNERS
  // ==========================================

  const fetchOwners = async () => {

    try {

      setLoading(true);

      const response = await fetch(
        `${API_URL}/owners`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );


      const data = await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to fetch owners"
        );

      }


      setOwners(data.owners || []);

    } catch (error) {

      console.error(
        "Fetch owners error:",
        error
      );

      setError(error.message);

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    if (token) {
      fetchOwners();
    }

  }, [token]);


  // ==========================================
  // FORM INPUT
  // ==========================================

  const handleChange = (event) => {

    const {
      name,
      value,
    } = event.target;


    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

  };


  // ==========================================
  // CREATE OWNER
  // ==========================================

  const handleCreateOwner = async (
    event
  ) => {

    event.preventDefault();

    setError("");


    if (
      !formData.name ||
      !formData.mobile ||
      !formData.password
    ) {

      setError(
        "Please fill all fields."
      );

      return;

    }


    try {

      setCreating(true);


      const response = await fetch(
        `${API_URL}/owners`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify(
            formData
          ),
        }
      );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to create owner"
        );

      }


      // Add new owner immediately
      setOwners((previous) => [
        data.owner,
        ...previous,
      ]);


      // Reset form
      setFormData({
        name: "",
        mobile: "",
        password: "",
      });


      setShowModal(false);


    } catch (error) {

      console.error(
        "Create owner error:",
        error
      );

      setError(error.message);

    } finally {

      setCreating(false);

    }

  };


  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {

    logout();

    navigate("/login");

  };


  return (

    <div className="super-admin-page">


      {/* ======================================
          SIDEBAR
      ====================================== */}

      <aside className="super-admin-sidebar">


        <div className="super-admin-brand">

          <div className="super-admin-brand-icon">

            <Building2 size={22} />

          </div>


          <div className="super-admin-brand-text">

            <strong>PGmate</strong>

            <span>
              Super Admin
            </span>

          </div>

        </div>


        <nav className="super-admin-nav">

          <button
            className="active"
          >

            <LayoutDashboard
              size={18}
            />

            <span>
              Dashboard
            </span>

          </button>


          <button>

            <Users size={18} />

            <span>
              Owners
            </span>

          </button>

        </nav>


        <div className="super-admin-sidebar-bottom">

          <button
            className="super-admin-logout"
            onClick={handleLogout}
          >

            <LogOut size={18} />

            <span>
              Logout
            </span>

          </button>

        </div>

      </aside>


      {/* ======================================
          MAIN
      ====================================== */}

      <main className="super-admin-main">


        {/* TOPBAR */}

        <header className="super-admin-topbar">

          <div className="super-admin-topbar-title">

            <h1>
              Dashboard
            </h1>

            <p>
              Manage your PGmate owners
            </p>

          </div>


          <div className="super-admin-user">

            <div className="super-admin-avatar">

              {user?.name
                ?.charAt(0)
                ?.toUpperCase() || "A"}

            </div>


            <div className="super-admin-user-info">

              <strong>
                {user?.name}
              </strong>

              <span>
                Super Administrator
              </span>

            </div>

          </div>

        </header>


        {/* CONTENT */}

        <section className="super-admin-content">


          {/* ====================================
              STATS
          ==================================== */}

          <div className="super-admin-stats">


            <div className="super-admin-stat-card">

              <div className="super-admin-stat-icon">

                <Users size={22} />

              </div>


              <div>

                <h3>
                  {owners.length}
                </h3>

                <p>
                  Total Owners
                </p>

              </div>

            </div>


            <div className="super-admin-stat-card">

              <div className="super-admin-stat-icon">

                <Building2 size={22} />

              </div>


              <div>

                <h3>
                  {owners.length}
                </h3>

                <p>
                  Active Owners
                </p>

              </div>

            </div>


            <div className="super-admin-stat-card">

              <div className="super-admin-stat-icon">

                <ShieldCheck size={22} />

              </div>


              <div>

                <h3>
                  Active
                </h3>

                <p>
                  System Status
                </p>

              </div>

            </div>

          </div>


          {/* ====================================
              OWNERS
          ==================================== */}

          <section className="super-admin-section">


            <div className="super-admin-section-header">

              <div>

                <h2>
                  Owners
                </h2>

                <p>
                  Manage all PG owners
                </p>

              </div>


              <button
                className="add-owner-button"
                onClick={() => {
                  setError("");
                  setShowModal(true);
                }}
              >

                <Plus size={17} />

                Add Owner

              </button>

            </div>


            {/* Error */}

            {error && !showModal && (

              <div
                className="owner-form-error"
                style={{
                  margin: "18px 24px 0",
                }}
              >
                {error}
              </div>

            )}


            {/* Loading */}

            {loading ? (

              <div className="loading-state">

                Loading owners...

              </div>

            ) : owners.length === 0 ? (

              <div className="empty-owners">

                <Users size={30} />

                <div>
                  No owners created yet.
                </div>

              </div>

            ) : (

              <div className="owner-table-wrapper">

                <table className="owner-table">

                  <thead>

                    <tr>

                      <th>
                        Name
                      </th>

                      <th>
                        Mobile
                      </th>

                      <th>
                        Role
                      </th>

                      <th>
                        Created
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {owners.map((owner) => (

                      <tr key={owner._id}>

                        <td className="owner-name">
                          {owner.name}
                        </td>

                        <td className="owner-mobile">
                          {owner.mobile}
                        </td>

                        <td>

                          <span className="owner-role">
                            Owner
                          </span>

                        </td>

                        <td className="owner-mobile">

                          {owner.createdAt
                            ? new Date(
                                owner.createdAt
                              ).toLocaleDateString()
                            : "-"}

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </section>

        </section>

      </main>


      {/* ======================================
          CREATE OWNER MODAL
      ====================================== */}

      {showModal && (

        <div
          className="owner-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              setShowModal(false);

            }

          }}
        >

          <div className="owner-modal">


            <div className="owner-modal-header">

              <div>

                <h2>
                  Create Owner
                </h2>

                <p>
                  Add a new PG owner to PGmate.
                </p>

              </div>


              <button
                className="close-modal-button"
                onClick={() =>
                  setShowModal(false)
                }
              >

                <X size={18} />

              </button>

            </div>


            <form
              className="owner-form"
              onSubmit={handleCreateOwner}
            >


              <div className="owner-form-group">

                <label htmlFor="owner-name">
                  Full Name
                </label>

                <input
                  id="owner-name"
                  name="name"
                  type="text"
                  placeholder="Enter owner's name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={creating}
                />

              </div>


              <div className="owner-form-group">

                <label htmlFor="owner-mobile">
                  Mobile Number
                </label>

                <input
                  id="owner-mobile"
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter mobile number"
                  value={formData.mobile}
                  onChange={handleChange}
                  disabled={creating}
                />

              </div>


              <div className="owner-form-group">

                <label htmlFor="owner-password">
                  Temporary Password
                </label>

                <input
                  id="owner-password"
                  name="password"
                  type="password"
                  placeholder="Create temporary password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={creating}
                />

              </div>


              {error && (

                <div className="owner-form-error">
                  {error}
                </div>

              )}


              <button
                type="submit"
                className="create-owner-submit"
                disabled={creating}
              >

                {creating
                  ? "Creating Owner..."
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