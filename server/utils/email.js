
import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const {
    SMTP_HOST,
    SMTP_PORT = "587",
    SMTP_SECURE = "false",
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Email service is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS."
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  if (!from) {
    throw new Error("EMAIL_FROM or SMTP_USER must be configured.");
  }

  return getTransporter().sendMail({
    from: `"PGmate" <${from}>`,
    to,
    subject,
    text,
    html,
  });
}

function formatDate(date) {
  if (!date) return "Not available";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

const planLabels = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  "half-yearly": "Half-Yearly",
  yearly: "Yearly",
};

function subscriptionDetails(owner) {
  const name = escapeHtml(owner.name || "PGmate Owner");
  const plan =
    planLabels[owner.subscriptionPlan] ||
    owner.subscriptionPlan ||
    "Subscription";

  return {
    name,
    plan,
    startDate: formatDate(owner.subscriptionStartDate),
    endDate: formatDate(owner.subscriptionEndDate),
  };
}

// Existing password-reset functionality
export async function sendPasswordResetOtp(email, otp) {
  await sendEmail({
    to: email,
    subject: "Your PGmate password reset code",
    text: `Your PGmate password reset code is ${otp}. It expires in 60 seconds. If you did not request this, ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2>PGmate password reset</h2>
        <p>Use this code to reset your password:</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:bold">${escapeHtml(otp)}</p>
        <p>This code expires in <strong>60 seconds</strong>.</p>
        <p>If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}

// Send after an owner and subscription have been created successfully
export async function sendOwnerWelcomeEmail(owner) {
  if (!owner?.email) {
    throw new Error("Owner email is required for the welcome email.");
  }

  const details = subscriptionDetails(owner);

  await sendEmail({
    to: owner.email,
    subject: "Welcome to PGmate — Your subscription details",
    text: [
      `Dear ${owner.name || "Owner"},`,
      "",
      "Thank you for choosing PGmate for managing your PG business!",
      "",
      `Subscription plan: ${details.plan}`,
      `Start date: ${details.startDate}`,
      `Expiry date: ${details.endDate}`,
      "",
      "Please sign in using your registered email address and the password provided securely to you.",
      "Remember to renew your subscription before it expires to avoid interruption to subscription services.",
      "",
      "Thank you for being part of PGmate!",
      "Team PGmate",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#243047">
        <h1 style="color:#2365d1">Welcome to PGmate!</h1>
        <p>Dear ${details.name},</p>
        <p>Thank you for choosing PGmate to help manage your PG business. We're happy to have you with us!</p>
        <div style="background:#f4f7fb;border-radius:12px;padding:20px;margin:24px 0">
          <h3 style="margin-top:0">Your subscription details</h3>
          <p><strong>Plan:</strong> ${escapeHtml(details.plan)}</p>
          <p><strong>Start date:</strong> ${escapeHtml(details.startDate)}</p>
          <p><strong>Expiry date:</strong> ${escapeHtml(details.endDate)}</p>
        </div>
        <p>Sign in using your registered email address and the password provided securely to you.</p>
        <p>Please renew before the expiry date to avoid interruption to subscription services.</p>
        <p>Thank you for being part of PGmate!</p>
        <p><strong>Team PGmate</strong></p>
      </div>
    `,
  });
}

// Send the 5-day, 3-day or 1-day subscription reminder
export async function sendSubscriptionExpiryReminder(owner, daysRemaining) {
  if (!owner?.email) {
    throw new Error("Owner email is required for the expiry reminder.");
  }

  if (![5, 3, 1].includes(daysRemaining)) {
    throw new Error("Reminder must be for 5, 3 or 1 day before expiry.");
  }

  const details = subscriptionDetails(owner);
  const urgency =
    daysRemaining === 1
      ? "Your PGmate subscription expires tomorrow"
      : `Your PGmate subscription expires in ${daysRemaining} days`;

  const message =
    daysRemaining === 1
      ? "Your subscription is due to expire tomorrow. Renew now to help avoid interruption to your subscription services."
      : `Your subscription expires in ${daysRemaining} days. Please arrange renewal before the expiry date to avoid interruption to your subscription services.`;

  await sendEmail({
    to: owner.email,
    subject: `${urgency} — PGmate`,
    text: [
      `Dear ${owner.name || "Owner"},`,
      "",
      message,
      "",
      `Plan: ${details.plan}`,
      `Expiry date: ${details.endDate}`,
      "",
      "Thank you for choosing PGmate.",
      "Team PGmate",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#243047">
        <h1 style="color:#2365d1">Subscription expiry reminder</h1>
        <p>Dear ${details.name},</p>
        <p>${escapeHtml(message)}</p>
        <div style="background:#fff6e5;border-radius:12px;padding:20px;margin:24px 0">
          <p><strong>Plan:</strong> ${escapeHtml(details.plan)}</p>
          <p><strong>Expiry date:</strong> ${escapeHtml(details.endDate)}</p>
        </div>
        <p>Please contact your PGmate administrator to arrange renewal.</p>
        <p>Thank you for choosing PGmate!</p>
        <p><strong>Team PGmate</strong></p>
      </div>
    `,
  });
}



export async function sendTenantWelcomeEmail({ tenant, user, pg, room, bed }) {
  if (!user?.email) throw new Error("Tenant email is required.");

  const name = escapeHtml(user.name || "Tenant");
  const pgName = escapeHtml(pg?.name || "your PG");
  const roomNumber = escapeHtml(room?.roomNumber || "Not available");
  const bedNumber = escapeHtml(bed?.bedNumber || "Not available");
  const joiningDate = formatDate(tenant.joiningDate);
  const rent = Number(tenant.monthlyRent || 0).toLocaleString("en-IN");
  const dueDay = tenant.rentDueDay || 5;

  await sendEmail({
    to: user.email,
    subject: `Welcome to ${pg?.name || "your PG"} — PGmate`,
    text: [
      `Dear ${user.name || "Tenant"},`,
      "",
      `Thank you for choosing ${pg?.name || "our PG"}!`,
      "We are happy to welcome you.",
      "",
      `Room: ${roomNumber}`,
      `Bed: ${bedNumber}`,
      `Joining date: ${joiningDate}`,
      `Monthly rent: Rs. ${rent}`,
      `Rent due day: ${dueDay} of each month`,
      "",
      "Please contact your PG owner if you have questions.",
      "Thank you,",
      "Team PGmate",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#243047">
        <h1 style="color:#2365d1">Welcome to ${pgName}!</h1>
        <p>Dear ${name},</p>
        <p>Thank you for choosing our PG. We're happy to have you stay with us!</p>
        <div style="background:#f4f7fb;padding:20px;border-radius:12px">
          <h3>Your stay details</h3>
          <p><b>PG:</b> ${pgName}</p>
          <p><b>Room:</b> ${roomNumber}</p>
          <p><b>Bed:</b> ${bedNumber}</p>
          <p><b>Joining date:</b> ${escapeHtml(joiningDate)}</p>
          <p><b>Monthly rent:</b> ₹${escapeHtml(rent)}</p>
          <p><b>Rent due day:</b> ${dueDay} of each month</p>
        </div>
        <p>Please contact your PG owner if you need assistance.</p>
        <p>Thank you,<br><b>Team PGmate</b></p>
      </div>`,
  });
}

export async function sendTenantRentReminder({ user, pg, rentRecord }) {
  if (!user?.email) throw new Error("Tenant email is required.");

  const amount = Number(rentRecord.amount || 0).toLocaleString("en-IN");
  const dueDate = formatDate(rentRecord.dueDate);
  const period = `${rentRecord.month}/${rentRecord.year}`;

  await sendEmail({
    to: user.email,
    subject: `Rent reminder: payment due in 5 days — ${pg?.name || "PGmate"}`,
    text: [
      `Dear ${user.name || "Tenant"},`,
      "",
      "This is a friendly reminder that your rent is due in 5 days.",
      `PG: ${pg?.name || "Your PG"}`,
      `Rent period: ${period}`,
      `Amount due: Rs. ${amount}`,
      `Due date: ${dueDate}`,
      "",
      "Please arrange payment with your PG owner.",
      "If you have already paid, please contact your owner to update the record.",
      "Team PGmate",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#243047">
        <h2>Rent payment reminder</h2>
        <p>Dear ${escapeHtml(user.name || "Tenant")},</p>
        <p>Your rent is due in <b>5 days</b>. Please arrange payment with your PG owner.</p>
        <div style="background:#f4f7fb;padding:20px;border-radius:12px">
          <p><b>PG:</b> ${escapeHtml(pg?.name || "Your PG")}</p>
          <p><b>Rent period:</b> ${escapeHtml(period)}</p>
          <p><b>Amount due:</b> ₹${escapeHtml(amount)}</p>
          <p><b>Due date:</b> ${escapeHtml(dueDate)}</p>
        </div>
        <p>If you've already paid, contact your PG owner to ensure the payment is recorded.</p>
        <p>Team PGmate</p>
      </div>`,
  });
}

export async function sendTenantOverdueEmail({ user, pg, rentRecord }) {
  if (!user?.email) throw new Error("Tenant email is required.");

  const amount = Number(rentRecord.amount || 0).toLocaleString("en-IN");
  const dueDate = formatDate(rentRecord.dueDate);
  const period = `${rentRecord.month}/${rentRecord.year}`;

  await sendEmail({
    to: user.email,
    subject: `Rent payment overdue — ${pg?.name || "PGmate"}`,
    text: [
      `Dear ${user.name || "Tenant"},`,
      "",
      "Our records show that your rent payment is overdue.",
      `PG: ${pg?.name || "Your PG"}`,
      `Rent period: ${period}`,
      `Amount outstanding: Rs. ${amount}`,
      `Due date: ${dueDate}`,
      "",
      "Please contact your PG owner to arrange payment.",
      "If you have already paid, please ask your owner to update the payment record.",
      "Team PGmate",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#243047">
        <h2 style="color:#b42318">Rent payment overdue</h2>
        <p>Dear ${escapeHtml(user.name || "Tenant")},</p>
        <p>Our records show that your rent payment is overdue. Please contact your PG owner to arrange payment.</p>
        <div style="background:#fff1f0;padding:20px;border-radius:12px">
          <p><b>PG:</b> ${escapeHtml(pg?.name || "Your PG")}</p>
          <p><b>Rent period:</b> ${escapeHtml(period)}</p>
          <p><b>Amount outstanding:</b> ₹${escapeHtml(amount)}</p>
          <p><b>Due date:</b> ${escapeHtml(dueDate)}</p>
        </div>
        <p>If you've already paid, contact your owner to update the record.</p>
        <p>Team PGmate</p>
      </div>`,
  });
}

export async function sendTenantPaymentReceipt({ user, pg, payment, rentRecord }) {
  if (!user?.email) throw new Error("Tenant email is required.");

  const amount = Number(payment.amount || 0).toLocaleString("en-IN");
  const paymentDate = formatDate(payment.paymentDate);
  const method = payment.paymentMethod || "Not specified";
  const period = rentRecord
    ? `${rentRecord.month}/${rentRecord.year}`
    : "Rent payment";

  await sendEmail({
    to: user.email,
    subject: `Rent payment receipt — ${pg?.name || "PGmate"}`,
    text: [
      `Dear ${user.name || "Tenant"},`,
      "",
      "Thank you. Your rent payment has been recorded.",
      `PG: ${pg?.name || "Your PG"}`,
      `Rent period: ${period}`,
      `Amount received: Rs. ${amount}`,
      `Payment date: ${paymentDate}`,
      `Payment method: ${method}`,
      `Reference: ${payment._id}`,
      "",
      "Please keep this email for your records.",
      "Team PGmate",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#243047">
        <h2 style="color:#16794b">Payment received</h2>
        <p>Dear ${escapeHtml(user.name || "Tenant")},</p>
        <p>Thank you. Your rent payment has been recorded successfully.</p>
        <div style="background:#f0faf4;padding:20px;border-radius:12px">
          <p><b>PG:</b> ${escapeHtml(pg?.name || "Your PG")}</p>
          <p><b>Rent period:</b> ${escapeHtml(period)}</p>
          <p><b>Amount received:</b> ₹${escapeHtml(amount)}</p>
          <p><b>Payment date:</b> ${escapeHtml(paymentDate)}</p>
          <p><b>Payment method:</b> ${escapeHtml(method)}</p>
          <p><b>Reference:</b> ${escapeHtml(payment._id)}</p>
        </div>
        <p>Please keep this email for your records.</p>
        <p>Team PGmate</p>
      </div>`,
  });
}

export async function sendTenantVacatedEmail({ user, pg, tenant }) {
  if (!user?.email) throw new Error("Tenant email is required.");

  const balance = Number(tenant.outstandingBalance || 0).toLocaleString("en-IN");
  const vacatedDate = formatDate(tenant.vacatedAt);

  await sendEmail({
    to: user.email,
    subject: `Move-out confirmation — ${pg?.name || "PGmate"}`,
    text: [
      `Dear ${user.name || "Tenant"},`,
      "",
      "Your move-out has been recorded. Thank you for staying with us.",
      `PG: ${pg?.name || "Your PG"}`,
      `Vacating date: ${vacatedDate}`,
      `Outstanding rent balance: Rs. ${balance}`,
      "",
      balance === "0"
        ? "Our records currently show no outstanding rent balance."
        : "Please contact your PG owner to settle the outstanding balance.",
      "This email reflects the balance currently recorded in PGmate.",
      "Team PGmate",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#243047">
        <h2>Move-out confirmation</h2>
        <p>Dear ${escapeHtml(user.name || "Tenant")},</p>
        <p>Your move-out has been recorded. Thank you for staying with us.</p>
        <div style="background:#f4f7fb;padding:20px;border-radius:12px">
          <p><b>PG:</b> ${escapeHtml(pg?.name || "Your PG")}</p>
          <p><b>Vacating date:</b> ${escapeHtml(vacatedDate)}</p>
          <p><b>Outstanding rent balance:</b> ₹${escapeHtml(balance)}</p>
        </div>
        <p>${balance === "0"
          ? "Our records currently show no outstanding rent balance."
          : "Please contact your PG owner to settle the outstanding balance."}</p>
        <p>This email reflects the balance currently recorded in PGmate.</p>
        <p>Team PGmate</p>
      </div>`,
  });
}
