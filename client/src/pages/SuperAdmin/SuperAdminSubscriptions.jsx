import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, RotateCcw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest, PLANS, formatDate, getStatus, statusLabel } from "./superAdminUtils";

export default function SuperAdminSubscriptions() {
  const { token } = useAuth();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!token) { setLoading(false); setError("Please log in again."); return; }
    setLoading(true); setError("");
    try { const data = await apiRequest("/owners", token); setOwners(Array.isArray(data.owners) ? data.owners : []); }
    catch (e) { setError(e.message || "Unable to load subscriptions."); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => owners.filter(o => {
    const matchesStatus = filter === "all" || getStatus(o) === filter;
    const matchesSearch = `${o.name || ""} ${o.mobile || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  }), [owners, filter, search]);

  const reactivate = async (owner) => {
    const answer = window.prompt(`Enter plan for ${owner.name}: monthly, quarterly, half-yearly, yearly`, owner.subscriptionPlan || "monthly");
    if (answer === null) return;
    const planName = answer.trim().toLowerCase();
    if (!PLANS.some(p => p.value === planName)) { setError("Invalid plan. Use monthly, quarterly, half-yearly or yearly."); return; }
    if (!window.confirm(`Reactivate ${owner.name} with the ${planName} plan?`)) return;
    setBusyId(owner._id); setError(""); setSuccess("");
    try { await apiRequest(`/owners/${owner._id}/reactivate`, token, { method: "PATCH", body: JSON.stringify({ planName }) }); setSuccess(`Subscription reactivated for ${owner.name}.`); await load(); }
    catch (e) { setError(e.message || "Unable to reactivate subscription."); }
    finally { setBusyId(""); }
  };

  return <>
    {error && <div className="sa-alert sa-alert-error" role="alert">{error}</div>}
    {success && <div className="sa-alert sa-alert-success" role="status">{success}</div>}
    <section className="sa-panel">
      <div className="sa-toolbar sa-subscription-toolbar">
        <label className="sa-search"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search owner name or mobile" /></label>
        <select className="sa-filter" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter by subscription status">
          <option value="all">All statuses</option><option value="active">Active</option><option value="expiring-soon">Expiring soon</option><option value="pending">Pending</option><option value="expired">Expired</option>
        </select>
      </div>
      {loading ? <div className="sa-empty">Loading subscriptions…</div> : filtered.length === 0 ? <div className="sa-empty">No subscriptions match your filters.</div> : <div className="owner-table-wrapper"><table className="owner-table subscription-owner-table"><thead><tr><th>Owner</th><th>Mobile</th><th>Plan</th><th>Start date</th><th>End date</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {filtered.map(owner => { const status = getStatus(owner); return <tr key={owner._id} className={status === "expired" ? "owner-row-expired" : ""}><td className="owner-name">{owner.name || "—"}</td><td>{owner.mobile || "—"}</td><td>{PLANS.find(p => p.value === owner.subscriptionPlan)?.label || owner.subscriptionPlan || "—"}</td><td>{formatDate(owner.subscriptionStartDate)}</td><td>{formatDate(owner.subscriptionEndDate)}</td><td><span className={`subscription-status status-${status}`}>{statusLabel(status)}</span></td><td>{status === "expired" ? <button className="reactivate-button" onClick={() => reactivate(owner)} disabled={busyId === owner._id}><RotateCcw size={14} />{busyId === owner._id ? "Activating…" : "Reactivate"}</button> : <span className="no-action-label">—</span>}</td></tr>; })}
      </tbody></table></div>}
    </section>
  </>;
}
