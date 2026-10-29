
import { useCallback, useEffect, useState } from "react";
import {
  Save,
  ShieldCheck,
  UserRound,
  Bell,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "./superAdminUtils";

const DEFAULT_NOTIFICATIONS = {
  expiry: true,
  newOwner: true,
  platform: false,
};

const DEFAULT_PLATFORM = {
  defaultSubscriptionPlan: "monthly",
  maintenanceMode: false,
};

export default function SuperAdminSettings() {
  const { user, token, updateUser } = useAuth();

  const [tab, setTab] = useState("profile");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState(
    DEFAULT_NOTIFICATIONS
  );
  const [platform, setPlatform] = useState(DEFAULT_PLATFORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const apiRequest = useCallback(
    async (method, body) => {
      const response = await fetch(
        `${API_URL}/super-admin/settings`,
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to process settings."
        );
      }

      return data;
    },
    [token]
  );

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      setError(false);

      try {
        const data = await apiRequest("GET");

        if (!active) return;

        setDisplayName(data.profile?.name || user?.name || "");
        setEmail(data.profile?.email || user?.email || "");
        setNotifications({
          ...DEFAULT_NOTIFICATIONS,
          ...data.notifications,
        });
        setPlatform({
          ...DEFAULT_PLATFORM,
          ...data.platform,
        });
      } catch (err) {
        if (active) {
          setError(true);
          setMessage(err.message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (token) {
      loadSettings();
    } else {
      setLoading(false);
      setError(true);
      setMessage("Please log in again to manage settings.");
    }

    return () => {
      active = false;
    };
  }, [apiRequest, token, user?.name, user?.email]);

  async function saveSettings(event, payload) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError(false);

    try {
      const data = await apiRequest("PATCH", payload);

      if (data.profile) {
        setDisplayName(data.profile.name || "");
        setEmail(data.profile.email || "");

        updateUser({
          name: data.profile.name,
          email: data.profile.email,
        });
      }

      if (data.notifications) {
        setNotifications({
          ...DEFAULT_NOTIFICATIONS,
          ...data.notifications,
        });
      }

      if (data.platform) {
        setPlatform({
          ...DEFAULT_PLATFORM,
          ...data.platform,
        });
      }

      setMessage(data.message || "Settings saved successfully.");
    } catch (err) {
      setError(true);
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: "profile", label: "Admin profile", icon: UserRound },
    { id: "security", label: "Security", icon: ShieldCheck },
    { id: "platform", label: "Platform", icon: SlidersHorizontal },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  if (loading) {
    return <div className="sa-panel sa-settings-panel">Loading settings...</div>;
  }

  return (
    <>
      {message && (
        <div
          className={`sa-alert ${error ? "sa-alert-error" : "sa-alert-success"}`}
          role="status"
        >
          {message}
        </div>
      )}

      <div className="sa-settings-grid">
        <nav className="sa-settings-tabs" aria-label="Settings sections">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "active" : ""}
              onClick={() => {
                setTab(id);
                setMessage("");
                setError(false);
              }}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <section className="sa-panel sa-settings-panel">
          {tab === "profile" && (
            <form
              onSubmit={(event) =>
                saveSettings(event, {
                  name: displayName,
                  email,
                })
              }
            >
              <h3>Administrator profile</h3>
              <p className="sa-form-intro">
                Update your administrator name and email address.
              </p>

              <div className="sa-form-field">
                <label htmlFor="admin-name">Display name</label>
                <input
                  id="admin-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="sa-form-field">
                <label htmlFor="admin-email">Email</label>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  maxLength={254}
                />
              </div>

              <button
                className="sa-button sa-button-primary"
                type="submit"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save preferences"}
              </button>
            </form>
          )}

          {tab === "security" && (
            <div>
              <h3>Security</h3>
              <p className="sa-form-intro">
                Your administrator routes require a valid login token and
                the Super Admin role.
              </p>
              <div className="sa-info-row">
                <ShieldCheck size={20} />
                <div>
                  <strong>Role-based access</strong>
                  <span>
                    Settings API requests are checked against your
                    authenticated account and role.
                  </span>
                </div>
              </div>
              <div className="sa-info-row">
                <ShieldCheck size={20} />
                <div>
                  <strong>Password changes</strong>
                  <span>
                    Use the existing password-change flow to update your
                    password.
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === "platform" && (
            <form
              onSubmit={(event) =>
                saveSettings(event, { platform })
              }
            >
              <h3>Platform preferences</h3>
              <p className="sa-form-intro">
                Save platform defaults for future use.
              </p>

              <div className="sa-form-field">
                <label htmlFor="default-plan">
                  Default subscription plan
                </label>
                <select
                  id="default-plan"
                  value={platform.defaultSubscriptionPlan}
                  onChange={(event) =>
                    setPlatform((current) => ({
                      ...current,
                      defaultSubscriptionPlan: event.target.value,
                    }))
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half-yearly">Half-yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <label className="sa-toggle-row">
                <span>Maintenance mode preference</span>
                <input
                  type="checkbox"
                  checked={platform.maintenanceMode}
                  onChange={(event) =>
                    setPlatform((current) => ({
                      ...current,
                      maintenanceMode: event.target.checked,
                    }))
                  }
                />
              </label>

              <p className="sa-form-intro">
                These preferences are stored in MongoDB. Maintenance mode
                does not disable public access to the platform yet.
              </p>

              <button
                className="sa-button sa-button-primary"
                type="submit"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save preferences"}
              </button>
            </form>
          )}

          {tab === "notifications" && (
            <form
              onSubmit={(event) =>
                saveSettings(event, { notifications })
              }
            >
              <h3>Notifications</h3>
              <p className="sa-form-intro">
                Save your notification preferences.
              </p>

              {[
                ["expiry", "Subscription expiry reminders"],
                ["newOwner", "New owner created"],
                ["platform", "Platform announcements"],
              ].map(([key, label]) => (
                <label className="sa-toggle-row" key={key}>
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={(event) =>
                      setNotifications((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                </label>
              ))}

              <button
                className="sa-button sa-button-primary"
                type="submit"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save preferences"}
              </button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
