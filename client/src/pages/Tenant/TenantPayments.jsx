import { useMemo, useState } from "react";
import {
    CheckCircle2,
    Clock3,
    CalendarDays,
    Check,
    Search,
    ChevronDown,
    Wallet,
    MoreHorizontal,
} from "lucide-react";
import "./TenantPayments.css";

const formatMoney = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(amount || 0));

const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};


const getPaymentDescription = (payment) => {
    const method = payment.paymentMethod || payment.method || "payment";

    switch (String(payment.status || "pending").toLowerCase()) {
        case "paid":
            return `Rent payment completed successfully via ${method}.`;

        case "pending":
            return `${method.charAt(0).toUpperCase() + method.slice(1)} payment pending confirmation.`;

        case "overdue":
            return "Rent payment is overdue.";

        case "failed":
            return "Payment failed.";

        case "refunded":
            return `Rent payment refunded via ${method}.`;

        default:
            return payment.description || payment.notes || "Rent payment";
    }
};


export default function TenantPayments({
    payments = [],
    tenant = {},
    loading = false,
}) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const paidPayments = useMemo(
        () =>
            payments.filter(
                (payment) =>
                    String(payment.status || "").toLowerCase() === "paid"
            ),
        [payments]
    );

    const pendingPayments = useMemo(
        () =>
            payments.filter((payment) =>
                ["pending", "overdue"].includes(
                    String(payment.status || "").toLowerCase()
                )
            ),
        [payments]
    );

    const totalPaid = paidPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
    );

    const pendingAmount = pendingPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
    );

    const monthlyRent = Number(
        tenant.monthlyRent || tenant.rent || 0
    );

    const nextDueDate = useMemo(() => {
        const day = Number(tenant.rentDueDay || 5);
        const now = new Date();

        let dueDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            Math.min(day, 28)
        );

        if (now > dueDate) {
            dueDate = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                Math.min(day, 28)
            );
        }

        return dueDate;
    }, [tenant.rentDueDay]);

    const filteredPayments = useMemo(() => {
        const query = search.trim().toLowerCase();

        return [...payments]
            .filter((payment) => {
                const status = String(payment.status || "").toLowerCase();

                const matchesStatus =
                    statusFilter === "all" || status === statusFilter;

                    const description = getPaymentDescription(payment);

                const matchesSearch = [
                    description,
                    payment.paymentMethod,
                    payment.method,
                    payment.status,
                    formatDate(payment.paidDate || payment.createdAt),
                    payment.amount,
                ]
                    .some((value) =>
                        String(value || "").toLowerCase().includes(query)
                    );

                return matchesStatus && matchesSearch;
            })
            .sort(
                (a, b) =>
                    new Date(b.paidDate || b.createdAt || 0) -
                    new Date(a.paidDate || a.createdAt || 0)
            );
    }, [payments, search, statusFilter]);

    const hasPending = pendingPayments.length > 0;

    return (
        <div className="tp-page">
            <main className="tp-content">
                <section className="tp-summary">
                    <article className="tp-summary-card">
                        <div className="tp-icon tp-icon-green">
                            <CheckCircle2 size={27} />
                        </div>
                        <div>
                            <strong>{formatMoney(totalPaid)}</strong>
                            <span>Total Paid</span>
                        </div>
                    </article>

                    <article className="tp-summary-card">
                        <div className="tp-icon tp-icon-orange">
                            <Clock3 size={27} />
                        </div>
                        <div>
                            <strong>{formatMoney(pendingAmount)}</strong>
                            <span>Pending Dues</span>
                        </div>
                    </article>

                    <article className="tp-summary-card">
                        <div className="tp-icon tp-icon-green">
                            <CalendarDays size={27} />
                        </div>
                        <div>
                            <strong>{formatMoney(monthlyRent)}</strong>
                            <span>Next Rent Due</span>
                            <small>{formatDate(nextDueDate)}</small>
                        </div>
                    </article>
                </section>

                <section
                    className={`tp-status-banner ${hasPending ? "tp-banner-pending" : ""
                        }`}
                >
                    <div className="tp-status-check">
                        {hasPending ? <Clock3 size={27} /> : <Check size={29} />}
                    </div>

                    <div className="tp-banner-copy">
                        <h3>
                            {hasPending
                                ? "You have pending payments"
                                : "You're all caught up!"}
                        </h3>
                        <p>
                            {hasPending
                                ? `${pendingPayments.length} payment${pendingPayments.length === 1 ? "" : "s"
                                } awaiting payment. Outstanding amount: ${formatMoney(
                                    pendingAmount
                                )}.`
                                : `No pending payments right now. Your next rent is due on ${formatDate(
                                    nextDueDate
                                )}.`}
                        </p>
                    </div>

                    <div className="tp-wallet-art">
                        <Wallet size={66} strokeWidth={1.35} />
                        <span className="tp-coin">₹</span>
                    </div>
                </section>

                <section className="tp-history">
                    <div className="tp-history-header">
                        <div>
                            <h3>Payment History</h3>
                            <p>Your recent transactions</p>
                        </div>

                        <div className="tp-controls">
                            <label className="tp-search">
                                <Search size={19} />
                                <input
                                    type="search"
                                    placeholder="Search payments..."
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </label>

                            <label className="tp-filter">
                                <select
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value)}
                                    aria-label="Filter payment status"
                                >
                                    <option value="all">All statuses</option>
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                    <option value="overdue">Overdue</option>
                                </select>
                                <ChevronDown size={17} />
                            </label>
                        </div>
                    </div>

                    {loading ? (
                        <div className="tp-empty">Loading payment history...</div>
                    ) : filteredPayments.length === 0 ? (
                        <div className="tp-empty">
                            <div className="tp-empty-icon">
                                <Wallet size={28} />
                            </div>
                            <h4>No payments found</h4>
                            <p>
                                {payments.length === 0
                                    ? "Your payment transactions will appear here."
                                    : "Try changing your search or status filter."}
                            </p>
                        </div>
                    ) : (
                        <div className="tp-table-wrap">
                            <table className="tp-table">
                                <thead>
                                    <tr>
                                        <th>DATE</th>
                                        <th>DESCRIPTION</th>
                                        <th>METHOD</th>
                                        <th>AMOUNT</th>
                                        <th>STATUS</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredPayments.map((payment, index) => {
                                        const status = String(
                                            payment.status || "pending"
                                        ).toLowerCase();

                                        const description = getPaymentDescription(payment);

                                        return (
                                            <tr key={payment._id || payment.id || index}>
                                                <td>
                                                    {formatDate(
                                                        payment.paidDate ||
                                                        payment.createdAt ||
                                                        payment.dueDate
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="tp-description">
                                                        {description}
                                                    </span>
                                                </td>
                                                <td>
                                                    {payment.paymentMethod ||
                                                        payment.method ||
                                                        "—"}
                                                </td>
                                                <td className="tp-amount">
                                                    {formatMoney(payment.amount)}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`tp-badge tp-badge-${status}`}
                                                    >
                                                        {status.charAt(0).toUpperCase() +
                                                            status.slice(1)}
                                                    </span>
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
