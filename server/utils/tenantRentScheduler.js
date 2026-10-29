
import Tenant from "../models/Tenant.js";
import User from "../models/User.js";
import PG from "../models/PG.js";
import RentRecord from "../models/RentRecord.js";
import TenantEmailLog from "../models/TenantEmailLog.js";

import {
  sendTenantRentReminder,
  sendTenantOverdueEmail,
} from "./email.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = "Asia/Kolkata";

function dateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function daysUntil(dueDate, now) {
  const [y1, m1, d1] = dateKey(dueDate).split("-").map(Number);
  const [y2, m2, d2] = dateKey(now).split("-").map(Number);

  return Math.round(
    (
      Date.UTC(y1, m1 - 1, d1) -
      Date.UTC(y2, m2 - 1, d2)
    ) / DAY_MS
  );
}

async function notifyOnce({ tenant, user, pg, record, type, send }) {
  if (!user?.email) return;

  const key = `${type}:${record._id}`;

  const alreadySent = await TenantEmailLog.findOne({
    notificationKey: key,
    status: "sent",
  });

  if (alreadySent) return;

  try {
    await send({ user, pg, rentRecord: record });

    await TenantEmailLog.updateOne(
      { notificationKey: key },
      {
        $set: {
          tenantId: tenant._id,
          notificationKey: key,
          emailType: type,
          status: "sent",
          recipient: user.email,
          sentAt: new Date(),
          error: "",
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error(`${type} email failed for ${user.email}:`, error);

    await TenantEmailLog.updateOne(
      { notificationKey: key },
      {
        $set: {
          tenantId: tenant._id,
          notificationKey: key,
          emailType: type,
          status: "failed",
          recipient: user.email,
          sentAt: new Date(),
          error: String(error.message || error).slice(0, 1000),
        },
      },
      { upsert: true }
    );
  }
}

async function checkTenantRent() {
  const now = new Date();

  const tenants = await Tenant.find({
    status: "active",
  });

  for (const tenant of tenants) {
    try {
      const user = await User.findById(tenant.userId)
        .select("name email");

      if (!user?.email) continue;

      const pg = await PG.findById(tenant.pgId).select("name");

      const records = await RentRecord.find({
        tenantId: tenant._id,
        status: { $in: ["pending", "overdue"] },
      });

      for (const record of records) {
        const due = new Date(record.dueDate);

        if (Number.isNaN(due.getTime())) continue;

        const remainingDays = daysUntil(due, now);

        // Five calendar days before rent is due.
        if (remainingDays === 5 && record.status === "pending") {
          await notifyOnce({
            tenant,
            user,
            pg,
            record,
            type: "rent-reminder",
            send: sendTenantRentReminder,
          });
        }

        // Mark past-due unpaid rent as overdue and notify once.
        if (now > due && record.status !== "paid") {
          if (record.status !== "overdue") {
            record.status = "overdue";
            await record.save();
          }

          await notifyOnce({
            tenant,
            user,
            pg,
            record,
            type: "rent-overdue",
            send: sendTenantOverdueEmail,
          });
        }
      }
    } catch (error) {
      console.error(
        `Rent notification check failed for tenant ${tenant._id}:`,
        error
      );
    }
  }
}

let started = false;
let running = false;

export function startTenantRentScheduler() {
  if (started) return;
  started = true;

  const run = async () => {
    if (running) return;

    running = true;

    try {
      await checkTenantRent();
    } catch (error) {
      console.error("Tenant rent scheduler error:", error);
    } finally {
      running = false;
    }
  };

  void run();
  setInterval(() => void run(), 60 * 60 * 1000);

  console.log("PGmate tenant rent email scheduler started.");
}
