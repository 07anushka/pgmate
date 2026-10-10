import {
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
  {
    value: "all",
    label: "All Categories",
  },
  {
    value: "maintenance",
    label: "Maintenance",
  },
  {
    value: "electricity",
    label: "Electricity",
  },
  {
    value: "water",
    label: "Water",
  },
  {
    value: "cleaning",
    label: "Cleaning",
  },
  {
    value: "food",
    label: "Food",
  },
  {
    value: "internet",
    label: "Internet",
  },
  {
    value: "room",
    label: "Room",
  },
  {
    value: "noise",
    label: "Noise",
  },
  {
    value: "security",
    label: "Security",
  },
  {
    value: "other",
    label: "Other",
  },
];


const priorities = [
  {
    value: "all",
    label: "All Priorities",
  },
  {
    value: "low",
    label: "Low",
  },
  {
    value: "medium",
    label: "Medium",
  },
  {
    value: "high",
    label: "High",
  },
  {
    value: "urgent",
    label: "Urgent",
  },
];


const statuses = [
  {
    value: "all",
    label: "All Status",
  },
  {
    value: "open",
    label: "Open",
  },
  {
    value: "in_progress",
    label: "In Progress",
  },
  {
    value: "resolved",
    label: "Resolved",
  },
  {
    value: "closed",
    label: "Closed",
  },
];


function Complaints() {
  const [complaints, setComplaints] =
    useState([]);

  const [tenants, setTenants] =
    useState([]);

  const [summary, setSummary] =
    useState({
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      urgent: 0,
      high: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [priorityFilter, setPriorityFilter] =
    useState("all");

  const [showAddComplaint, setShowAddComplaint] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState(null);

  const [form, setForm] = useState({
    tenantId: "",
    title: "",
    category: "maintenance",
    description: "",
    priority: "medium",
    notes: "",
  });


  // --------------------------------------------------
  // LOAD COMPLAINTS
  // --------------------------------------------------

  const loadComplaints = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        complaintsResponse,
        summaryResponse,
      ] = await Promise.all([
        getOwnerComplaintsApi(
          "",
          statusFilter,
          categoryFilter,
          priorityFilter
        ),
        getComplaintSummaryApi(""),
      ]);

      setComplaints(
        complaintsResponse.complaints ||
          []
      );

      setSummary(
        summaryResponse.summary || {
          total: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
          urgent: 0,
          high: 0,
        }
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to load complaints"
      );
    } finally {
      setLoading(false);
    }
  };


  const loadTenants = async () => {
    try {
      const response =
        await getComplaintTenantsApi("");

      setTenants(
        response.tenants || []
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to load tenants"
      );
    }
  };


  useEffect(() => {
    loadComplaints();
  }, [
    statusFilter,
    categoryFilter,
    priorityFilter,
  ]);


  useEffect(() => {
    loadTenants();
  }, []);


  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredComplaints =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return complaints;
      }

      return complaints.filter(
        (complaint) => {
          const title =
            complaint.title
              ?.toLowerCase() || "";

          const description =
            complaint.description
              ?.toLowerCase() || "";

          const category =
            complaint.category
              ?.toLowerCase() || "";

          const tenantName =
            complaint.tenantId
              ?.userId?.name
              ?.toLowerCase() || "";

          const pgName =
            complaint.pgId?.name
              ?.toLowerCase() || "";

          return (
            title.includes(query) ||
            description.includes(query) ||
            category.includes(query) ||
            tenantName.includes(query) ||
            pgName.includes(query)
          );
        }
      );
    }, [
      complaints,
      search,
    ]);


  // --------------------------------------------------
  // FORM
  // --------------------------------------------------

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  const resetForm = () => {
    setForm({
      tenantId: "",
      title: "",
      category: "maintenance",
      description: "",
      priority: "medium",
      notes: "",
    });
  };


  // --------------------------------------------------
  // ADD COMPLAINT
  // --------------------------------------------------

  const handleAddComplaint =
    async (event) => {
      event.preventDefault();

      if (
        !form.tenantId ||
        !form.title.trim() ||
        !form.description.trim()
      ) {
        setError(
          "Please fill all required fields."
        );

        return;
      }

      try {
        setSubmitting(true);
        setError("");

        const tenant =
          tenants.find(
            (item) =>
              item._id ===
              form.tenantId
          );

        if (!tenant) {
          throw new Error(
            "Selected tenant was not found."
          );
        }

        await createComplaintApi({
          pgId:
            tenant.pgId?._id ||
            tenant.pgId,

          tenantId:
            form.tenantId,

          title:
            form.title.trim(),

          category:
            form.category,

          description:
            form.description.trim(),

          priority:
            form.priority,

          notes:
            form.notes.trim(),
        });

        setShowAddComplaint(
          false
        );

        resetForm();

        await Promise.all([
          loadComplaints(),
          loadTenants(),
        ]);
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
            "Failed to create complaint"
        );
      } finally {
        setSubmitting(false);
      }
    };


  // --------------------------------------------------
  // UPDATE STATUS
  // --------------------------------------------------

  const handleStatusChange =
    async (
      complaintId,
      status
    ) => {
      try {
        setUpdatingId(
          complaintId
        );

        setError("");

        await updateComplaintApi(
          complaintId,
          { status }
        );

        await loadComplaints();
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
            "Failed to update complaint"
        );
      } finally {
        setUpdatingId(null);
      }
    };


  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  const handleDelete =
    async (complaintId) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this complaint?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setError("");

        await deleteComplaintApi(
          complaintId
        );

        await loadComplaints();
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
            "Failed to delete complaint"
        );
      }
    };


  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const formatDate = (date) => {
    if (!date) return "-";

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


  const getCategoryLabel = (
    value
  ) => {
    return (
      categories.find(
        (item) =>
          item.value === value
      )?.label || "Other"
    );
  };


  const getPriorityLabel = (
    value
  ) => {
    return (
      priorities.find(
        (item) =>
          item.value === value
      )?.label || "Medium"
    );
  };


  const getStatusLabel = (
    value
  ) => {
    return (
      statuses.find(
        (item) =>
          item.value === value
      )?.label || value
    );
  };


  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="complaints-page">

        <div className="complaints-loading-card">

          <div className="complaints-loading-icon">
            <Loader2
              size={24}
              className="complaints-spinner"
            />
          </div>

          <div>
            <h3>
              Loading complaints...
            </h3>

            <p>
              Fetching complaint records.
            </p>
          </div>

        </div>

      </div>
    );
  }


  return (
    <div className="complaints-page">

      {/* HEADER */}

      <div className="complaints-header">

        <div>
          <span className="complaints-eyebrow">
            SUPPORT
          </span>

          <p>
            Track and resolve tenant
            complaints and issues.
          </p>
        </div>

      </div>


      {/* ERROR */}

      {error && (
        <div className="complaints-error">

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


      {/* STATS */}

      <div className="complaints-stats">

        <div className="complaint-stat-card">

          <div className="complaint-stat-icon">
            <MessageSquareWarning
              size={20}
            />
          </div>

          <div>
            <span>
              Total
            </span>

            <strong>
              {summary.total}
            </strong>
          </div>

        </div>


        <div className="complaint-stat-card">

          <div className="complaint-stat-icon">
            <CircleDot size={20} />
          </div>

          <div>
            <span>
              Open
            </span>

            <strong>
              {summary.open}
            </strong>
          </div>

        </div>


        <div className="complaint-stat-card">

          <div className="complaint-stat-icon">
            <Clock3 size={20} />
          </div>

          <div>
            <span>
              In Progress
            </span>

            <strong>
              {summary.inProgress}
            </strong>
          </div>

        </div>


        <div className="complaint-stat-card">

          <div className="complaint-stat-icon">
            <CheckCircle2
              size={20}
            />
          </div>

          <div>
            <span>
              Resolved
            </span>

            <strong>
              {summary.resolved}
            </strong>
          </div>

        </div>


        <div className="complaint-stat-card complaint-stat-danger">

          <div className="complaint-stat-icon">
            <AlertTriangle
              size={20}
            />
          </div>

          <div>
            <span>
              Urgent
            </span>

            <strong>
              {summary.urgent}
            </strong>
          </div>

        </div>

      </div>


      {/* FILTERS */}

      <div className="complaints-toolbar">

        <div className="complaints-search">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search complaints..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

        </div>


        <div className="complaints-filters">

          <select
            value={
              statusFilter
            }
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            {statuses.map(
              (status) => (
                <option
                  key={
                    status.value
                  }
                  value={
                    status.value
                  }
                >
                  {
                    status.label
                  }
                </option>
              )
            )}
          </select>


          <select
            value={
              categoryFilter
            }
            onChange={(event) =>
              setCategoryFilter(
                event.target.value
              )
            }
          >
            {categories.map(
              (category) => (
                <option
                  key={
                    category.value
                  }
                  value={
                    category.value
                  }
                >
                  {
                    category.label
                  }
                </option>
              )
            )}
          </select>


          <select
            value={
              priorityFilter
            }
            onChange={(event) =>
              setPriorityFilter(
                event.target.value
              )
            }
          >
            {priorities.map(
              (priority) => (
                <option
                  key={
                    priority.value
                  }
                  value={
                    priority.value
                  }
                >
                  {
                    priority.label
                  }
                </option>
              )
            )}
          </select>

        </div>

      </div>


      {/* LIST */}

      <div className="complaints-list-card">

        <div className="complaints-list-header">

          <div>
            <h2>
              Complaint History
            </h2>

            <p>
              {
                filteredComplaints.length
              }{" "}
              records found
            </p>
          </div>

        </div>


        {filteredComplaints.length ===
        0 ? (
          <div className="complaints-empty">

            <div className="complaints-empty-icon">
              <MessageSquareWarning
                size={28}
              />
            </div>

            <h3>
              No complaints found
            </h3>

            <p>
              There are no complaints
              matching your current
              filters.
            </p>

            <button
              onClick={() =>
                setShowAddComplaint(
                  true
                )
              }
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
                  <th>
                    Complaint
                  </th>

                  <th>
                    Tenant
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Priority
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Date
                  </th>

                  <th></th>
                </tr>
              </thead>


              <tbody>

                {filteredComplaints.map(
                  (complaint) => (
                    <tr
                      key={
                        complaint._id
                      }
                    >

                      {/* COMPLAINT */}

                      <td>

                        <div className="complaint-title-cell">

                          <div className="complaint-row-icon">
                            <MessageSquareWarning
                              size={17}
                            />
                          </div>

                          <div>
                            <strong>
                              {
                                complaint.title
                              }
                            </strong>

                            <span>
                              {
                                complaint.description
                              }
                            </span>
                          </div>

                        </div>

                      </td>


                      {/* TENANT */}

                      <td>

                        <div className="complaint-tenant">

                          <strong>
                            {
                              complaint
                                .tenantId
                                ?.userId
                                ?.name ||
                              complaint
                                .userId
                                ?.name ||
                              "Unknown"
                            }
                          </strong>

                          <span>
                            {
                              complaint
                                .tenantId
                                ?.userId
                                ?.mobile ||
                              complaint
                                .userId
                                ?.mobile ||
                              ""
                            }
                          </span>

                        </div>

                      </td>


                      {/* CATEGORY */}

                      <td>

                        <span className="complaint-category">
                          {getCategoryLabel(
                            complaint.category
                          )}
                        </span>

                      </td>


                      {/* PRIORITY */}

                      <td>

                        <span
                          className={`complaint-priority priority-${complaint.priority}`}
                        >
                          {getPriorityLabel(
                            complaint.priority
                          )}
                        </span>

                      </td>


                      {/* STATUS */}

                      <td>

                        <select
                          className={`complaint-status status-${complaint.status}`}
                          value={
                            complaint.status
                          }
                          disabled={
                            updatingId ===
                            complaint._id
                          }
                          onChange={(
                            event
                          ) =>
                            handleStatusChange(
                              complaint._id,
                              event
                                .target
                                .value
                            )
                          }
                        >

                          {statuses
                            .filter(
                              (
                                item
                              ) =>
                                item.value !==
                                "all"
                            )
                            .map(
                              (
                                status
                              ) => (
                                <option
                                  key={
                                    status.value
                                  }
                                  value={
                                    status.value
                                  }
                                >
                                  {
                                    status.label
                                  }
                                </option>
                              )
                            )}

                        </select>

                      </td>


                      {/* DATE */}

                      <td>
                        {formatDate(
                          complaint.createdAt
                        )}
                      </td>


                      {/* DELETE */}

                      <td>

                        <button
                          className="complaint-delete-btn"
                          onClick={() =>
                            handleDelete(
                              complaint._id
                            )
                          }
                          title="Delete complaint"
                        >
                          <Trash2
                            size={17}
                          />
                        </button>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* ADD COMPLAINT MODAL */}

      {showAddComplaint && (
        <div
          className="complaint-modal-overlay"
          onMouseDown={() =>
            !submitting &&
            setShowAddComplaint(
              false
            )
          }
        >

          <div
            className="complaint-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="complaint-modal-header">

              <div>
                <h2>
                  Add Complaint
                </h2>

                <p>
                  Record a tenant complaint
                  or issue.
                </p>
              </div>

              <button
                onClick={() =>
                  !submitting &&
                  setShowAddComplaint(
                    false
                  )
                }
              >
                <X size={20} />
              </button>

            </div>


            <form
              className="complaint-form"
              onSubmit={
                handleAddComplaint
              }
            >

              {/* TENANT */}

              <div className="complaint-form-group">

                <label>
                  Tenant *
                </label>

                <select
                  name="tenantId"
                  value={
                    form.tenantId
                  }
                  onChange={
                    handleChange
                  }
                  required
                >

                  <option value="">
                    Select tenant
                  </option>

                  {tenants.map(
                    (tenant) => (
                      <option
                        key={
                          tenant._id
                        }
                        value={
                          tenant._id
                        }
                      >
                        {
                          tenant
                            .userId
                            ?.name
                        }
                        {" — "}
                        Room{" "}
                        {
                          tenant
                            .roomId
                            ?.roomNumber
                        }
                        {" / "}
                        Bed{" "}
                        {
                          tenant
                            .bedId
                            ?.bedNumber
                        }
                      </option>
                    )
                  )}

                </select>

              </div>


              {/* TITLE */}

              <div className="complaint-form-group">

                <label>
                  Complaint Title *
                </label>

                <input
                  name="title"
                  type="text"
                  placeholder="e.g. Bathroom tap is leaking"
                  value={
                    form.title
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>


              {/* CATEGORY + PRIORITY */}

              <div className="complaint-form-row">

                <div className="complaint-form-group">

                  <label>
                    Category
                  </label>

                  <select
                    name="category"
                    value={
                      form.category
                    }
                    onChange={
                      handleChange
                    }
                  >
                    {categories
                      .filter(
                        (
                          item
                        ) =>
                          item.value !==
                          "all"
                      )
                      .map(
                        (
                          category
                        ) => (
                          <option
                            key={
                              category.value
                            }
                            value={
                              category.value
                            }
                          >
                            {
                              category.label
                            }
                          </option>
                        )
                      )}
                  </select>

                </div>


                <div className="complaint-form-group">

                  <label>
                    Priority
                  </label>

                  <select
                    name="priority"
                    value={
                      form.priority
                    }
                    onChange={
                      handleChange
                    }
                  >
                    {priorities
                      .filter(
                        (
                          item
                        ) =>
                          item.value !==
                          "all"
                      )
                      .map(
                        (
                          priority
                        ) => (
                          <option
                            key={
                              priority.value
                            }
                            value={
                              priority.value
                            }
                          >
                            {
                              priority.label
                            }
                          </option>
                        )
                      )}
                  </select>

                </div>

              </div>


              {/* DESCRIPTION */}

              <div className="complaint-form-group">

                <label>
                  Description *
                </label>

                <textarea
                  name="description"
                  rows="4"
                  placeholder="Describe the issue..."
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>


              {/* NOTES */}

              <div className="complaint-form-group">

                <label>
                  Internal Notes
                </label>

                <textarea
                  name="notes"
                  rows="3"
                  placeholder="Optional notes for the owner..."
                  value={
                    form.notes
                  }
                  onChange={
                    handleChange
                  }
                />

              </div>


              {/* ACTIONS */}

              <div className="complaint-form-actions">

                <button
                  type="button"
                  className="complaint-cancel-btn"
                  onClick={() =>
                    setShowAddComplaint(
                      false
                    )
                  }
                  disabled={
                    submitting
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="complaint-submit-btn"
                  disabled={
                    submitting
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