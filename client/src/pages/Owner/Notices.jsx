import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Plus,
  Search,
  Bell,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  CalendarDays,
  Pencil,
  Trash2,
  X,
  Loader2,
  Megaphone,
} from "lucide-react";

import {
  getMyNoticesApi,
  getNoticeSummaryApi,
  createNoticeApi,
  updateNoticeApi,
  deleteNoticeApi,
} from "../../services/api";

import "./Notices.css";


const noticeTypes = [
  {
    value: "all",
    label: "All Types",
  },
  {
    value: "general",
    label: "General",
  },
  {
    value: "maintenance",
    label: "Maintenance",
  },
  {
    value: "payment",
    label: "Payment",
  },
  {
    value: "food",
    label: "Food",
  },
  {
    value: "event",
    label: "Event",
  },
  {
    value: "emergency",
    label: "Emergency",
  },
  {
    value: "rules",
    label: "Rules",
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


const audiences = [
  {
    value: "all",
    label: "Everyone",
  },
  {
    value: "tenants",
    label: "Tenants",
  },
];


const statuses = [
  {
    value: "all",
    label: "All Status",
  },
  {
    value: "active",
    label: "Active",
  },
  {
    value: "expired",
    label: "Expired",
  },
  {
    value: "draft",
    label: "Draft",
  },
];


const emptyForm = {
  title: "",
  description: "",
  noticeType: "general",
  priority: "medium",
  audience: "all",
  publishDate: new Date()
    .toISOString()
    .split("T")[0],
  expiryDate: "",
  isPublished: true,
};


function Notices() {
  const [notices, setNotices] =
    useState([]);

  const [summary, setSummary] =
    useState({
      total: 0,
      published: 0,
      active: 0,
      expired: 0,
      urgent: 0,
      high: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [priorityFilter, setPriorityFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [showModal, setShowModal] =
    useState(false);

  const [editingNotice, setEditingNotice] =
    useState(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [form, setForm] =
    useState(emptyForm);


  // --------------------------------------------------
  // LOAD
  // --------------------------------------------------

  const loadNotices = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        noticesResponse,
        summaryResponse,
      ] = await Promise.all([
        getMyNoticesApi(
          "",
          typeFilter,
          priorityFilter,
          "",
          statusFilter
        ),
        getNoticeSummaryApi(""),
      ]);

      setNotices(
        noticesResponse.notices ||
          []
      );

      setSummary(
        summaryResponse.summary || {
          total: 0,
          published: 0,
          active: 0,
          expired: 0,
          urgent: 0,
          high: 0,
        }
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to load notices"
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadNotices();
  }, [
    typeFilter,
    priorityFilter,
    statusFilter,
  ]);


  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredNotices =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return notices;
      }

      return notices.filter(
        (notice) => {
          const title =
            notice.title
              ?.toLowerCase() ||
            "";

          const description =
            notice.description
              ?.toLowerCase() ||
            "";

          const type =
            notice.noticeType
              ?.toLowerCase() ||
            "";

          return (
            title.includes(query) ||
            description.includes(query) ||
            type.includes(query)
          );
        }
      );
    }, [
      notices,
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
      type,
      checked,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };


  const openAddModal = () => {
    setEditingNotice(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };


  const openEditModal = (
    notice
  ) => {
    setEditingNotice(notice);

    setForm({
      title:
        notice.title || "",
      description:
        notice.description ||
        "",
      noticeType:
        notice.noticeType ||
        "general",
      priority:
        notice.priority ||
        "medium",
      audience:
        notice.audience ||
        "all",
      publishDate:
        notice.publishDate
          ? new Date(
              notice.publishDate
            )
              .toISOString()
              .split("T")[0]
          : new Date()
              .toISOString()
              .split("T")[0],
      expiryDate:
        notice.expiryDate
          ? new Date(
              notice.expiryDate
            )
              .toISOString()
              .split("T")[0]
          : "",
      isPublished:
        notice.isPublished !==
        false,
    });

    setError("");
    setShowModal(true);
  };


  const closeModal = () => {
    if (submitting) {
      return;
    }

    setShowModal(false);
    setEditingNotice(null);
    setForm(emptyForm);
  };


  // --------------------------------------------------
  // SAVE
  // --------------------------------------------------

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.publishDate
    ) {
      setError(
        "Please fill all required fields."
      );

      return;
    }

    if (
      form.expiryDate &&
      form.expiryDate <
        form.publishDate
    ) {
      setError(
        "Expiry date cannot be before publish date."
      );

      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const pgId =
        localStorage.getItem("pgmate_active_pg")

      if (!pgId) {
        setError(
          "Please select a PG before creating a notice."
        );

        setSubmitting(false);

        return;
      }

      const payload = {
        pgId,
        title:
          form.title.trim(),
        description:
          form.description.trim(),
        noticeType:
          form.noticeType,
        priority:
          form.priority,
        audience:
          form.audience,
        publishDate:
          form.publishDate,
        expiryDate:
          form.expiryDate || null,
        isPublished:
          form.isPublished,
      };

      if (editingNotice) {
        await updateNoticeApi(
          editingNotice._id,
          payload
        );
      } else {
        await createNoticeApi(
          payload
        );
      }

      closeModal();

      await loadNotices();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to save notice"
      );
    } finally {
      setSubmitting(false);
    }
  };


  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  const handleDelete = async (
    noticeId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this notice?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(noticeId);
      setError("");

      await deleteNoticeApi(
        noticeId
      );

      await loadNotices();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to delete notice"
      );
    } finally {
      setDeletingId(null);
    }
  };


  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

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


  const getTypeLabel = (
    type
  ) => {
    return (
      noticeTypes.find(
        (item) =>
          item.value === type
      )?.label || "General"
    );
  };


  const getPriorityLabel = (
    priority
  ) => {
    return (
      priorities.find(
        (item) =>
          item.value ===
          priority
      )?.label || "Medium"
    );
  };


  const getAudienceLabel = (
    audience
  ) => {
    return audience ===
      "tenants"
      ? "Tenants"
      : "Everyone";
  };


  const getNoticeStatus = (
    notice
  ) => {
    if (!notice.isPublished) {
      return "draft";
    }

    if (
      notice.expiryDate &&
      new Date(
        notice.expiryDate
      ) < new Date()
    ) {
      return "expired";
    }

    return "active";
  };


  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="notices-page">

        <div className="notices-loading-card">

          <div className="notices-loading-icon">
            <Loader2
              size={24}
              className="notices-spinner"
            />
          </div>

          <div>
            <h3>
              Loading notices...
            </h3>

            <p>
              Fetching your PG notices.
            </p>
          </div>

        </div>

      </div>
    );
  }


  return (
    <div className="notices-page">

      {/* HEADER */}

      <div className="notices-header">

        <div>
          <span className="notices-eyebrow">
            ANNOUNCEMENTS
          </span>

          <h1>
            Notices
          </h1>

          <p>
            Share important updates and
            announcements with tenants.
          </p>
        </div>

        <button
          className="notice-add-btn"
          onClick={
            openAddModal
          }
        >
          <Plus size={18} />

          Create Notice
        </button>

      </div>


      {/* ERROR */}

      {error && (
        <div className="notices-error">

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

      <div className="notices-stats">

        <div className="notice-stat-card">

          <div className="notice-stat-icon">
            <Bell size={20} />
          </div>

          <div>
            <span>
              Total Notices
            </span>

            <strong>
              {summary.total}
            </strong>
          </div>

        </div>


        <div className="notice-stat-card">

          <div className="notice-stat-icon">
            <Megaphone
              size={20}
            />
          </div>

          <div>
            <span>
              Active
            </span>

            <strong>
              {summary.active}
            </strong>
          </div>

        </div>


        <div className="notice-stat-card">

          <div className="notice-stat-icon">
            <CalendarDays
              size={20}
            />
          </div>

          <div>
            <span>
              Expired
            </span>

            <strong>
              {summary.expired}
            </strong>
          </div>

        </div>


        <div className="notice-stat-card notice-stat-danger">

          <div className="notice-stat-icon">
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


      {/* TOOLBAR */}

      <div className="notices-toolbar">

        <div className="notices-search">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search notices..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

        </div>


        <div className="notices-filters">

          <select
            value={
              typeFilter
            }
            onChange={(event) =>
              setTypeFilter(
                event.target.value
              )
            }
          >
            {noticeTypes.map(
              (type) => (
                <option
                  key={
                    type.value
                  }
                  value={
                    type.value
                  }
                >
                  {
                    type.label
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

        </div>

      </div>


      {/* NOTICE LIST */}

      <div className="notices-list-card">

        <div className="notices-list-header">

          <div>
            <h2>
              Notice Board
            </h2>

            <p>
              {
                filteredNotices.length
              }{" "}
              notices found
            </p>
          </div>

        </div>


        {filteredNotices.length ===
        0 ? (
          <div className="notices-empty">

            <div className="notices-empty-icon">
              <Bell size={28} />
            </div>

            <h3>
              No notices found
            </h3>

            <p>
              Create a notice to share
              important updates with
              tenants.
            </p>

            <button
              onClick={
                openAddModal
              }
            >
              <Plus size={17} />

              Create Notice
            </button>

          </div>
        ) : (

          <div className="notice-cards">

            {filteredNotices.map(
              (notice) => {
                const noticeStatus =
                  getNoticeStatus(
                    notice
                  );

                return (
                  <div
                    className="notice-card"
                    key={
                      notice._id
                    }
                  >

                    <div className="notice-card-top">

                      <div className="notice-card-icon">
                        <Bell
                          size={19}
                        />
                      </div>

                      <div className="notice-card-actions">

                        <button
                          onClick={() =>
                            openEditModal(
                              notice
                            )
                          }
                          title="Edit notice"
                        >
                          <Pencil
                            size={16}
                          />
                        </button>

                        <button
                          className="notice-delete-btn"
                          onClick={() =>
                            handleDelete(
                              notice._id
                            )
                          }
                          disabled={
                            deletingId ===
                            notice._id
                          }
                          title="Delete notice"
                        >
                          {deletingId ===
                          notice._id ? (
                            <Loader2
                              size={16}
                              className="notices-spinner"
                            />
                          ) : (
                            <Trash2
                              size={16}
                            />
                          )}
                        </button>

                      </div>

                    </div>


                    <div className="notice-card-content">

                      <div className="notice-title-row">

                        <h3>
                          {
                            notice.title
                          }
                        </h3>

                        <span
                          className={`notice-priority priority-${notice.priority}`}
                        >
                          {getPriorityLabel(
                            notice.priority
                          )}
                        </span>

                      </div>


                      <div className="notice-meta">

                        <span>
                          {getTypeLabel(
                            notice.noticeType
                          )}
                        </span>

                        <span>
                          {getAudienceLabel(
                            notice.audience
                          )}
                        </span>

                      </div>


                      <p className="notice-description">
                        {
                          notice.description
                        }
                      </p>

                    </div>


                    <div className="notice-card-bottom">

                      <div className="notice-dates">

                        <span>
                          Published{" "}
                          {formatDate(
                            notice.publishDate
                          )}
                        </span>

                        {notice.expiryDate && (
                          <span>
                            Expires{" "}
                            {formatDate(
                              notice.expiryDate
                            )}
                          </span>
                        )}

                      </div>


                      <span
                        className={`notice-status status-${noticeStatus}`}
                      >
                        {noticeStatus ===
                        "active" ? (
                          <>
                            <CheckCircle2
                              size={13}
                            />

                            Active
                          </>
                        ) : noticeStatus ===
                          "expired" ? (
                          <>
                            <Clock3
                              size={13}
                            />

                            Expired
                          </>
                        ) : (
                          <>
                            <Bell
                              size={13}
                            />

                            Draft
                          </>
                        )}
                      </span>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>


      {/* MODAL */}

      {showModal && (
        <div
          className="notice-modal-overlay"
          onMouseDown={
            closeModal
          }
        >

          <div
            className="notice-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="notice-modal-header">

              <div>
                <h2>
                  {editingNotice
                    ? "Edit Notice"
                    : "Create Notice"}
                </h2>

                <p>
                  {editingNotice
                    ? "Update this announcement."
                    : "Create an announcement for your PG."}
                </p>
              </div>

              <button
                onClick={
                  closeModal
                }
                disabled={
                  submitting
                }
              >
                <X size={20} />
              </button>

            </div>


            <form
              className="notice-form"
              onSubmit={
                handleSubmit
              }
            >

              {/* TITLE */}

              <div className="notice-form-group">

                <label>
                  Notice Title *
                </label>

                <input
                  name="title"
                  type="text"
                  placeholder="e.g. Electricity maintenance tomorrow"
                  value={
                    form.title
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>


              {/* TYPE + PRIORITY */}

              <div className="notice-form-row">

                <div className="notice-form-group">

                  <label>
                    Notice Type
                  </label>

                  <select
                    name="noticeType"
                    value={
                      form.noticeType
                    }
                    onChange={
                      handleChange
                    }
                  >
                    {noticeTypes
                      .filter(
                        (
                          item
                        ) =>
                          item.value !==
                          "all"
                      )
                      .map(
                        (
                          type
                        ) => (
                          <option
                            key={
                              type.value
                            }
                            value={
                              type.value
                            }
                          >
                            {
                              type.label
                            }
                          </option>
                        )
                      )}
                  </select>

                </div>


                <div className="notice-form-group">

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


              {/* AUDIENCE */}

              <div className="notice-form-group">

                <label>
                  Audience
                </label>

                <select
                  name="audience"
                  value={
                    form.audience
                  }
                  onChange={
                    handleChange
                  }
                >
                  <option value="all">
                    Everyone
                  </option>

                  <option value="tenants">
                    Tenants Only
                  </option>
                </select>

              </div>


              {/* DESCRIPTION */}

              <div className="notice-form-group">

                <label>
                  Description *
                </label>

                <textarea
                  name="description"
                  rows="5"
                  placeholder="Write your announcement..."
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>


              {/* DATES */}

              <div className="notice-form-row">

                <div className="notice-form-group">

                  <label>
                    Publish Date *
                  </label>

                  <input
                    name="publishDate"
                    type="date"
                    value={
                      form.publishDate
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>


                <div className="notice-form-group">

                  <label>
                    Expiry Date
                  </label>

                  <input
                    name="expiryDate"
                    type="date"
                    value={
                      form.expiryDate
                    }
                    min={
                      form.publishDate
                    }
                    onChange={
                      handleChange
                    }
                  />

                </div>

              </div>


              {/* PUBLISH */}

              <div className="notice-publish-check">

                <label>
                  <input
                    type="checkbox"
                    name="isPublished"
                    checked={
                      form.isPublished
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <span>
                    Publish this notice
                    immediately
                  </span>
                </label>

              </div>


              {/* ACTIONS */}

              <div className="notice-form-actions">

                <button
                  type="button"
                  className="notice-cancel-btn"
                  onClick={
                    closeModal
                  }
                  disabled={
                    submitting
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="notice-submit-btn"
                  disabled={
                    submitting
                  }
                >

                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="notices-spinner"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />

                      {editingNotice
                        ? "Save Changes"
                        : "Create Notice"}
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

export default Notices;