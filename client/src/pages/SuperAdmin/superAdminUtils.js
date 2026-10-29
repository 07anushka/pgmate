export const API_URL = "http://localhost:5000/api";

export const PLANS = [
  { value: "monthly", label: "Monthly (1 month)", months: 1 },
  { value: "quarterly", label: "Quarterly (3 months)", months: 3 },
  { value: "half-yearly", label: "Half-yearly (6 months)", months: 6 },
  { value: "yearly", label: "Yearly (12 months)", months: 12 },
];

export const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

export const dateInputValue = (value) => {
  if (!value) return today();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return today();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

export const getStatus = (owner) => {
  if (owner.subscriptionStatus) return owner.subscriptionStatus;
  if (!owner.subscriptionStartDate || !owner.subscriptionEndDate) return "expired";
  const start = new Date(owner.subscriptionStartDate);
  const end = new Date(owner.subscriptionEndDate);
  const now = new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "expired";
  if (start > now) return "pending";
  if (end <= now) return "expired";
  return Math.ceil((end - now) / 86400000) <= 5 ? "expiring-soon" : "active";
};

export const statusLabel = (status) => ({
  active: "Active",
  "expiring-soon": "Expiring Soon",
  expired: "Expired",
  pending: "Pending",
})[status] || status;

export async function apiRequest(path, token, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

export function ownerListFrom(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.owners)) return data.owners;
  if (Array.isArray(data.data)) return data.data;
  return [];
}
