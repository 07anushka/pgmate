import { useCallback, useEffect, useState } from "react";
import { Users, ShieldCheck, Clock, AlertTriangle, RefreshCw, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiRequest, getStatus, formatDate } from "./superAdminUtils";

export default function SuperAdminDashboard() {
  const { token } = useAuth();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) { setLoading(false); setError("Please log in again."); return; }
    setLoading(true); setError("");
    try {
      const data = await apiRequest("/owners", token);
      const list = Array.isArray(data.owners) ? data.owners : [];
      setOwners(list);
    } catch (e) { setError(e.message || "Unable to load dashboard data."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const count = (status) => owners.filter((o) => getStatus(o) === status).length;
  const expiring = owners.filter((o) => getStatus(o) === "expiring-soon");

  const cards = [
    { label: "Total Owners", value: owners.length, icon: Users },
    { label: "Active Subscriptions", value: count("active"), icon: ShieldCheck },
    { label: "Expiring Within 5 Days", value: expiring.length, icon: Clock, warning: true },
    { label: "Expired Subscriptions", value: count("expired"), icon: AlertTriangle, danger: true },
  ];

  return (
    <>
      <div className="sa-page-heading">
        <button className="sa-button sa-button-secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </div>
      {error && <div className="sa-alert sa-alert-error" role="alert">{error}</div>}
      <div className="super-admin-stats">
        {cards.map(({ label, value, icon: Icon, warning, danger }) => (
          <article className="super-admin-stat-card" key={label}>
            <div className={`super-admin-stat-icon ${warning ? "warning-stat-icon" : ""} ${danger ? "expired-stat-icon" : ""}`}><Icon size={22} /></div>
            <div><h3>{loading ? "—" : value}</h3><p>{label}</p></div>
          </article>
        ))}
      </div>

      <section className="sa-panel">
        <div className="sa-panel-heading"><div><h2>Subscriptions expiring soon</h2><p>Owners whose subscription ends within five days.</p></div><Link className="sa-text-link" to="/super-admin/subscriptions">View subscriptions <ArrowRight size={15} /></Link></div>
        {loading ? <div className="sa-empty">Loading subscription data…</div> : expiring.length === 0 ? (
          <div className="sa-empty"><ShieldCheck size={25} /><p>No subscriptions are expiring within five days.</p></div>
        ) : (
          <div className="owner-table-wrapper"><table className="owner-table"><thead><tr><th>Owner</th><th>Mobile</th><th>Plan</th><th>End date</th><th>Status</th></tr></thead><tbody>
            {expiring.slice(0, 8).map((o) => <tr key={o._id}><td className="owner-name">{o.name}</td><td>{o.mobile || "—"}</td><td>{o.subscriptionPlan || "—"}</td><td>{formatDate(o.subscriptionEndDate)}</td><td><span className="subscription-status status-expiring-soon">Expiring Soon</span></td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </>
  );
}
