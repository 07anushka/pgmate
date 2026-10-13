
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import ownerRoutes from "./routes/ownerRoutes.js";
import pgRoutes from "./routes/pgRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import foodMenuRoutes from "./routes/foodMenuRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import tenantPortalRoutes from "./routes/tenantPortalRoutes.js";
import aadhaarVerificationRoutes from "./routes/aadhaarVerificationRoutes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

/* =========================================
   DATABASE
========================================= */

connectDB();

/* =========================================
   MIDDLEWARE
========================================= */

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

/* =========================================
   EXISTING ROUTES
========================================= */

app.use("/api/auth", authRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/pg", pgRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/food-menu", foodMenuRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/tenant-portal", tenantPortalRoutes);

/* =========================================
   AADHAAR VERIFICATION ROUTE
========================================= */

app.use(
  "/api/aadhaar-verification",
  aadhaarVerificationRoutes
);

/* =========================================
   TEST ROUTE
========================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "PGmate server is running",
  });
});

/* =========================================
   START SERVER
========================================= */

app.listen(PORT, () => {
  console.log(
    `PGmate server running on http://localhost:${PORT}`
  );
});
