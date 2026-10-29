
import User from "../models/User.js";
import SubscriptionEmailLog from "../models/SubscriptionEmailLog.js";
import { sendSubscriptionExpiryReminder } from "./email.js";

const REMINDER_DAYS = [5, 3, 1];
const DAY_MS = 24 * 60 * 60 * 1000;
const INDIA_TIME_ZONE = "Asia/Kolkata";

function indiaDateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function calendarDaysUntil(expiryDate, today) {
  const expiryKey = indiaDateKey(expiryDate);
  const todayKey = indiaDateKey(today);

  const [ey, em, ed] = expiryKey.split("-").map(Number);
  const [ty, tm, td] = todayKey.split("-").map(Number);

  const expiryUtc = Date.UTC(ey, em - 1, ed);
  const todayUtc = Date.UTC(ty, tm - 1, td);

  return Math.round((expiryUtc - todayUtc) / DAY_MS);
}

async function checkSubscriptionReminders() {
  const now = new Date();

  const owners = await User.find({
    role: "owner",
    email: { $type: "string", $ne: "" },
    subscriptionEndDate: { $ne: null },
  }).select("_id name email subscriptionPlan subscriptionStartDate subscriptionEndDate");

  for (const owner of owners) {
    try {
      if (!owner.subscriptionEndDate) continue;

      const daysRemaining = calendarDaysUntil(
        owner.subscriptionEndDate,
        now
      );

      if (!REMINDER_DAYS.includes(daysRemaining)) continue;

      const emailType = `expiry-${daysRemaining}`;

      const alreadySent = await SubscriptionEmailLog.findOne({
        ownerId: owner._id,
        subscriptionEndDate: owner.subscriptionEndDate,
        emailType,
        status: "sent",
      });

      if (alreadySent) continue;

      await sendSubscriptionExpiryReminder(owner, daysRemaining);

      await SubscriptionEmailLog.updateOne(
        {
          ownerId: owner._id,
          subscriptionEndDate: owner.subscriptionEndDate,
          emailType,
        },
        {
          $set: {
            status: "sent",
            sentAt: new Date(),
            error: "",
          },
        },
        { upsert: true }
      );

      console.log(
        `Sent ${daysRemaining}-day subscription reminder to ${owner.email}`
      );
    } catch (error) {
      console.error(
        `Subscription reminder failed for owner ${owner._id}:`,
        error.message
      );

      try {
        await SubscriptionEmailLog.updateOne(
          {
            ownerId: owner._id,
            subscriptionEndDate: owner.subscriptionEndDate,
            emailType: `expiry-${calendarDaysUntil(
              owner.subscriptionEndDate,
              now
            )}`,
          },
          {
            $set: {
              status: "failed",
              error: String(error.message || error).slice(0, 1000),
              sentAt: new Date(),
            },
          },
          { upsert: true }
        );
      } catch (logError) {
        console.error("Failed to save reminder error:", logError.message);
      }
    }
  }
}

let started = false;

export function startSubscriptionReminderScheduler() {
  if (started) return;
  started = true;

  const runCheck = async () => {
    try {
      await checkSubscriptionReminders();
    } catch (error) {
      console.error("Subscription reminder scheduler error:", error);
    }
  };

  // Run at startup and repeat hourly.
  void runCheck();
  setInterval(() => void runCheck(), 60 * 60 * 1000);

  console.log("PGmate subscription reminder scheduler started.");
}
