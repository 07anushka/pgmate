
import { useMemo, useState } from "react";
import { X, Trash2 } from "lucide-react";
import {
  Search,
  Bell,
  Wrench,
  CalendarDays,
  Info,
  AlertTriangle,
  Megaphone,
  ChevronDown,
  Clock3,
} from "lucide-react";
import "./TenantNotices.css";
import { useAuth } from "../../context/AuthContext";

const getCategory = (notice) =>
  notice.category || notice.type || notice.noticeType || "General";

const getPriority = (notice) =>
  String(notice.priority || notice.urgency || notice.severity || "normal")
    .toLowerCase();

const getTitle = (notice) =>
  notice.title || notice.subject || notice.heading || "PG Announcement";

const getDescription = (notice) =>
  notice.description ||
  notice.message ||
  notice.content ||
  notice.body ||
  "";

const getDate = (notice) => {
  const value =
    notice.createdAt || notice.publishedAt || notice.date || notice.updatedAt;

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
  const value = String(category).toLowerCase();

  if (value.includes("maint")) return Wrench;
  if (value.includes("event")) return CalendarDays;
  if (value.includes("urgent") || value.includes("emergency")) {
    return AlertTriangle;
  }
  if (value.includes("announcement")) return Megaphone;

  return Bell;
};

const isUrgent = (notice) => {
  const priority = getPriority(notice);

  return (
    priority.includes("urgent") ||
    priority.includes("high") ||
    priority.includes("critical") ||
    priority.includes("emergency")
  );
};

export default function TenantNotices({
  notices = [],
  loading = false,
}) {
  const { token } = useAuth();

  const [search, setSearch] = useState("");
  const [clearedIds, setClearedIds] = useState([]);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const noticeList = useMemo(() => {
    if (Array.isArray(notices)) return notices;
    if (Array.isArray(notices?.data)) return notices.data;
    if (Array.isArray(notices?.notices)) return notices.notices;
    return [];
  }, [notices]);


const clearNotice = async (notice, index) => {
  const id = notice._id || notice.id;

  if (!id || !token) {
    console.error("Missing notice ID or authentication token.");
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:5000/api/notices/my/${id}/dismiss`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not dismiss notice.");
    }

    setClearedIds((previous) =>
      previous.includes(id) ? previous : [...previous, id]
    );
  } catch (error) {
    console.error("Dismiss notice error:", error);
    alert(error.message || "Could not dismiss notice.");
  }
};

const clearAllNotices = async () => {
  for (const notice of [...filteredNotices]) {
    await clearNotice(notice);
  }
};


  const categories = useMemo(
    () => [
      ...new Set(noticeList.map(getCategory).filter(Boolean)),
    ],
    [noticeList]
  );

  const urgentCount = noticeList.filter(isUrgent).length;

  const filteredNotices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...noticeList]
  .filter((notice, index) => {
    const id = notice._id || notice.id || `notice-${index}`;
    return !clearedIds.includes(id);
  })
      .filter((notice) => {
        const matchesSearch = [
          getTitle(notice),
          getDescription(notice),
          getCategory(notice),
        ].some((value) =>
          String(value).toLowerCase().includes(query)
        );

        const matchesCategory =
          categoryFilter === "all" ||
          getCategory(notice).toLowerCase() ===
            categoryFilter.toLowerCase();

        const matchesPriority =
          priorityFilter === "all" ||
          (priorityFilter === "urgent" && isUrgent(notice)) ||
          (priorityFilter === "normal" && !isUrgent(notice));

        return matchesSearch && matchesCategory && matchesPriority;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.publishedAt || b.date || 0) -
          new Date(a.createdAt || a.publishedAt || a.date || 0)
      );
    }, [
        noticeList,
        search,
        categoryFilter,
        priorityFilter,
        clearedIds,
      ]);

  return (
    <div className="tn-page">

      <main className="tn-content">
        <div className="tn-heading">
          <div>
            <span className="tn-eyebrow">PG UPDATES</span>
            <h2>Notices</h2>
            <p>Important updates and announcements from your PG.</p>
          </div>

          <div className="tn-total-card">
            <div className="tn-total-icon">
              <Bell size={23} />
            </div>
            <div>
              <strong>{noticeList.length}</strong>
              <span>Total notices</span>
            </div>
          </div>
        </div>

        {urgentCount > 0 && (
          <section className="tn-alert-banner">
            <div className="tn-alert-icon">
              <AlertTriangle size={22} />
            </div>
            <div className="tn-alert-copy">
              <strong>
                {urgentCount} important {urgentCount === 1 ? "notice" : "notices"}
              </strong>
              <p>Review the highlighted announcements below.</p>
            </div>
            <span className="tn-alert-label">Important</span>
          </section>
        )}

        <section className="tn-notices-panel">
<div className="tn-panel-heading">
  <div>
    <h3>All Notices</h3>
    <p>Updates shared by your PG management</p>
  </div>

  <div className="tn-panel-actions">
    <span className="tn-result-count">
      {filteredNotices.length} shown
    </span>

    <button
      type="button"
      className="tn-clear-all"
      onClick={clearAllNotices}
      disabled={filteredNotices.length === 0}
    >
      <Trash2 size={14} />
      Clear All
    </button>
  </div>
</div>


          <div className="tn-toolbar">
            <label className="tn-search">
              <Search size={18} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notices..."
              />
            </label>

            <label className="tn-select-wrap">
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </label>

            <label className="tn-select-wrap tn-priority-select">
              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="all">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="normal">General</option>
              </select>
              <ChevronDown size={16} />
            </label>
          </div>

          {loading ? (
            <div className="tn-empty">
              Loading notices...
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="tn-empty">
              <div className="tn-empty-icon">
                <Info size={26} />
              </div>
              <h4>No notices found</h4>
              <p>
                {noticeList.length === 0
                  ? "New announcements from your PG will appear here."
                  : "Try another search term or filter."}
              </p>
            </div>
          ) : (
            <div className="tn-list">
              {filteredNotices.map((notice, index) => {
                const category = getCategory(notice);
                const CategoryIcon = getCategoryIcon(category);
                const urgent = isUrgent(notice);

                return (
                  <article
                    className={`tn-notice-card ${
                      urgent ? "tn-notice-urgent" : ""
                    }`}
                    key={notice._id || notice.id || index}
                  >

<button
      type="button"
      className="tn-dismiss"
      aria-label={`Clear ${getTitle(notice)}`}
      title="Clear notice"
      onClick={() =>
        clearNotice(
          notice,
          noticeList.findIndex(
            (item) =>
              (item._id || item.id) === (notice._id || notice.id)
          )
        )
      }
    >
      <X size={16} />
    </button>
                    <div className={`tn-notice-icon ${
                      urgent ? "tn-icon-urgent" : ""
                    }`}>
                      <CategoryIcon size={22} strokeWidth={1.8} />
                    </div>

                    <div className="tn-notice-body">
                      <div className="tn-notice-meta">
                        <span className="tn-category">{category}</span>
                        {urgent && (
                          <span className="tn-urgent-badge">Urgent</span>
                        )}
                      </div>

                      <h4>{getTitle(notice)}</h4>

                      <p className="tn-description">
                        {getDescription(notice)}
                      </p>

                      <div className="tn-date">
                        <Clock3 size={13} />
                        <span>
                          {getDate(notice)
                            ? `Published ${getDate(notice)}`
                            : "PG announcement"}
                        </span>
                      </div>
                    </div>

                    {urgent && (
                      <div className="tn-side-indicator">
                        <span />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <div className="tn-footer-note">
            <Info size={17} />
            <p>Keep checking this page for the latest PG announcements.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
