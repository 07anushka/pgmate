
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import ownerIllustration from "../assets/owner-subscription-ended.png";
import tenantIllustration from "../assets/tenant-subscription-ended.png";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function SubscriptionGate({ children }) {
  const { user, token, logout } = useAuth();

  const [status, setStatus] = useState("checking");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function checkSubscription() {
      if (!token) {
        setStatus("unauthenticated");
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/auth/subscription-status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (cancelled) return;

        if (response.status === 401) {
          setStatus("unauthenticated");
          return;
        }

        if (!response.ok) {
          setStatus("error");
          return;
        }

        setStatus(
          data.subscriptionActive === false
            ? "expired"
            : "active"
        );
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    checkSubscription();

    return () => {
      cancelled = true;
    };
  }, [token, retry]);

  if (status === "checking") {
    return <div style={styles.center}>Checking subscription...</div>;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (status === "error") {
    return (
      <div style={styles.center}>
        <h2>Unable to verify subscription</h2>
        <p>Please check your connection and backend server.</p>
        <button onClick={() => setRetry((value) => value + 1)}>
          Try Again
        </button>
      </div>
    );
  }

  if (status === "expired") {
    const isOwner = user?.role === "owner";

    const illustration = isOwner
      ? ownerIllustration
      : tenantIllustration;

    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <img
            src={illustration}
            alt={
              isOwner
                ? "Owner subscription expired illustration"
                : "Tenant subscription ended illustration"
            }
            style={styles.illustration}
          />

          {isOwner && (
            <>
              <h1 style={styles.heading}>
                Subscription Expired
              </h1>

              <p style={styles.message}>
                Your PG subscription has expired. Reactivate your
                subscription to restore access to your dashboard and services.
              </p>

              <p style={styles.message}>
                Please contact the Super Admin to reactivate your subscription.
              </p>
            </>
          )}

          <button
            style={styles.primaryButton}
            onClick={() => window.location.reload()}
          >
            Check Again
          </button>

          <button
            style={styles.secondaryButton}
            onClick={logout}
          >
            Log Out
          </button>
        </section>
      </main>
    );
  }

  return children;
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    background: "#f4f6fb",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "580px",
    boxSizing: "border-box",
    padding: "28px 32px",
    textAlign: "center",
    background: "#fff",
    borderRadius: "18px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
  },
  illustration: {
    display: "block",
    width: "100%",
    maxWidth: "430px",
    maxHeight: "350px",
    objectFit: "contain",
    margin: "0 auto 12px",
  },
  heading: {
    margin: "8px 0",
    color: "#172b4d",
    fontSize: "30px",
  },
  message: {
    margin: "10px 0",
    color: "#263445",
    fontSize: "12px",
    lineHeight: 1.5,
  },
  primaryButton: {
    display: "block",
    width: "100%",
    padding: "13px",
    marginTop: "22px",
    border: "none",
    borderRadius: "9px",
    background: "#2563eb",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  secondaryButton: {
    display: "block",
    width: "100%",
    padding: "13px",
    marginTop: "10px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    background: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  center: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    fontFamily: "Arial, sans-serif",
  },
};
